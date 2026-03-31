const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });





const resolveEmployee = async (req) => {
    if (req.user?.employee_uuid) {
        const emp = await pool.query('SELECT id, full_name FROM employees WHERE id = $1', [req.user.employee_uuid]);
        if (emp.rows[0]) return emp.rows[0];
    }

    if (req.user?.email) {
        const emp = await pool.query('SELECT id, full_name FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
        if (emp.rows[0]) return emp.rows[0];
    }

    const emp = await pool.query(
        `SELECT e.id, e.full_name
         FROM employees e
         JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id
         WHERE p.id = $1
         LIMIT 1`,
        [req.user.id]
    );

    return emp.rows[0] || null;
};

const submitExpenseClaim = async (req, res) => {
    const { category, amount, expense_date, description } = req.body;

    if (!category || !['Travel', 'Food', 'Equipment', 'Other'].includes(category)) {
        return res.status(400).json({ error: 'Valid category is required' });
    }

    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!expense_date) {
        return res.status(400).json({ error: 'Expense date is required' });
    }

    try {


        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const receiptUrl = req.file ? `/uploads/expenses/${req.file.filename}` : null;

        const result = await pool.query(
            `INSERT INTO expense_claims (
                employee_id, category, amount, expense_date, description, receipt_url, status
             ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
             RETURNING *`,
            [employee.id, category, Number(amount), expense_date, description || null, receiptUrl]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('submitExpenseClaim error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMyExpenseClaims = async (req, res) => {
    try {


        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const result = await pool.query(
            `SELECT ec.*, r.full_name AS reviewer_name
             FROM expense_claims ec
             LEFT JOIN employees r ON r.id = ec.reviewer_id
             WHERE ec.employee_id = $1
             ORDER BY ec.created_at DESC`,
            [employee.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getMyExpenseClaims error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getReviewableClaims = async (req, res) => {
    try {


        const viewer = await resolveEmployee(req);
        if (!viewer) return res.status(404).json({ error: 'Employee not found' });

        const status = req.query.status || 'Pending';
        const hasHrAccess = ['hr', 'admin'].includes(req.user.role);

        let result;
        if (hasHrAccess) {
            result = await pool.query(
                `SELECT ec.*, e.full_name AS employee_name, e.email AS employee_email,
                        r.full_name AS reviewer_name
                 FROM expense_claims ec
                 JOIN employees e ON e.id = ec.employee_id
                 LEFT JOIN employees r ON r.id = ec.reviewer_id
                 WHERE ec.status = $1
                 ORDER BY ec.created_at ASC`,
                [status]
            );
        } else {
            result = await pool.query(
                `SELECT ec.*, e.full_name AS employee_name, e.email AS employee_email,
                        r.full_name AS reviewer_name
                 FROM expense_claims ec
                 JOIN employees e ON e.id = ec.employee_id
                 LEFT JOIN employees r ON r.id = ec.reviewer_id
                 WHERE ec.status = $1
                   AND e.reporting_manager_id = $2
                 ORDER BY ec.created_at ASC`,
                [status, viewer.id]
            );
        }

        res.json(result.rows);
    } catch (err) {
        console.error('getReviewableClaims error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const reviewExpenseClaim = async (req, res) => {
    const { id } = req.params;
    const { status, reviewer_comment } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be Approved or Rejected' });
    }

    const client = await pool.connect();
    try {


        const reviewer = await resolveEmployee(req);
        if (!reviewer) return res.status(404).json({ error: 'Reviewer employee not found' });

        await client.query('BEGIN');

        const claimRes = await client.query(
            `SELECT ec.*, e.reporting_manager_id
             FROM expense_claims ec
             JOIN employees e ON e.id = ec.employee_id
             WHERE ec.id = $1
             FOR UPDATE`,
            [id]
        );

        if (claimRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Expense claim not found' });
        }

        const claim = claimRes.rows[0];
        if (claim.status !== 'Pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Only pending claims can be reviewed' });
        }

        const canReview = ['hr', 'admin'].includes(req.user.role) || claim.reporting_manager_id === reviewer.id;
        if (!canReview) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Forbidden: cannot review this claim' });
        }

        const updated = await client.query(
            `UPDATE expense_claims
             SET status = $1,
                 reviewer_id = $2,
                 reviewer_comment = $3,
                 reviewed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [status, reviewer.id, reviewer_comment || null, id]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('reviewExpenseClaim rollback error:', rollbackErr.message);
        }
        console.error('reviewExpenseClaim error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getMonthlyReimbursementSummary = async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'month and year are required' });
    }

    const monthMap = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
        jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
    };

    const monthNum = Number(month) || monthMap[String(month).trim().toLowerCase()];
    const yearNum = Number(year);

    if (!monthNum || monthNum < 1 || monthNum > 12 || !Number.isInteger(yearNum)) {
        return res.status(400).json({ error: 'Invalid month/year' });
    }

    try {


        const rows = await pool.query(
            `SELECT e.id AS employee_id,
                    e.full_name,
                    COALESCE(SUM(ec.amount), 0) AS approved_amount
             FROM expense_claims ec
             JOIN employees e ON e.id = ec.employee_id
             WHERE ec.status = 'Approved'
               AND EXTRACT(MONTH FROM ec.reviewed_at) = $1
               AND EXTRACT(YEAR FROM ec.reviewed_at) = $2
             GROUP BY e.id, e.full_name
             ORDER BY e.full_name ASC`,
            [monthNum, yearNum]
        );

        const totalApproved = rows.rows.reduce((sum, row) => sum + Number(row.approved_amount || 0), 0);

        res.json({
            month: monthNum,
            year: yearNum,
            total_approved_amount: Number(totalApproved.toFixed(2)),
            employees: rows.rows.map((row) => ({
                ...row,
                approved_amount: Number(Number(row.approved_amount || 0).toFixed(2)),
            })),
        });
    } catch (err) {
        console.error('getMonthlyReimbursementSummary error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    submitExpenseClaim,
    getMyExpenseClaims,
    getReviewableClaims,
    reviewExpenseClaim,
    getMonthlyReimbursementSummary,
};
