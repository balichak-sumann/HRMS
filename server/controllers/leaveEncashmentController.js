const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



const LEAVE_TYPE_TO_COLUMNS = {
    Casual: { total: 'casual_total', used: 'casual_used', encashed: 'casual_encashed' },
    Sick: { total: 'sick_total', used: 'sick_used', encashed: 'sick_encashed' },
    Earned: { total: 'earned_total', used: 'earned_used', encashed: 'earned_encashed' },
    'Comp-Off': { total: 'comp_off_total', used: 'comp_off_used', encashed: 'comp_off_encashed' },
};

const round2 = (value) => Number((Math.round((Number(value) || 0) * 100) / 100).toFixed(2));



const getActorEmployeeId = async (req) => {
    if (req.user?.employee_uuid) return req.user.employee_uuid;

    if (req.user?.email) {
        const result = await pool.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
        if (result.rows[0]) return result.rows[0].id;
    }

    return null;
};

const ensureLeaveBalanceRow = async (client, employeeId, year) => {
    await client.query(
        `INSERT INTO leave_balances (employee_id, year)
         SELECT $1, $2
         WHERE NOT EXISTS (
            SELECT 1 FROM leave_balances WHERE employee_id = $1 AND year = $2
         )`,
        [employeeId, year]
    );
};

const getPolicyInternal = async (client) => {
    const result = await client.query(
        `SELECT id, encashable_leave_types, max_days_per_year, payout_formula, updated_at
         FROM leave_encashment_policy
         ORDER BY updated_at DESC
         LIMIT 1`
    );

    return result.rows[0] || null;
};

const getAvailableDaysForType = async (client, employeeId, year, leaveType) => {
    const cols = LEAVE_TYPE_TO_COLUMNS[leaveType];
    if (!cols) return 0;

    const result = await client.query(
        `SELECT ${cols.total} AS total_days,
                ${cols.used} AS used_days,
                ${cols.encashed} AS encashed_days
         FROM leave_balances
         WHERE employee_id = $1 AND year = $2
         LIMIT 1`,
        [employeeId, year]
    );

    if (result.rows.length === 0) return 0;

    const row = result.rows[0];
    const total = Number(row.total_days || 0);
    const used = Number(row.used_days || 0);
    const encashed = Number(row.encashed_days || 0);
    return Math.max(0, total - used - encashed);
};

const getApprovedDaysForYear = async (client, employeeId, year) => {
    const result = await client.query(
        `SELECT COALESCE(SUM(days_requested), 0) AS approved_days
         FROM leave_encashment_requests
         WHERE employee_id = $1
           AND request_year = $2
           AND status = 'Approved'`,
        [employeeId, year]
    );

    return Number(result.rows[0]?.approved_days || 0);
};

const calculateEncashmentAmount = async (client, employeeId, days, formula) => {
    const employeeRes = await client.query('SELECT salary FROM employees WHERE id = $1 LIMIT 1', [employeeId]);
    if (employeeRes.rows.length === 0) {
        throw new Error('Employee not found');
    }

    const annualSalaryInput = Number(employeeRes.rows[0].salary);
    if (!Number.isFinite(annualSalaryInput) || annualSalaryInput <= 0) {
        throw new Error('Employee annual salary is not configured');
    }

    if (formula !== 'BASIC_PER_DAY') {
        throw new Error('Unsupported payout formula');
    }

    const perDayBasic = round2(annualSalaryInput / 365);
    return round2(perDayBasic * Number(days));
};

const getPolicy = async (req, res) => {
    try {
        const policy = await getPolicyInternal(pool);
        if (!policy) {
            return res.json({ unconfigured: true });
        }
        res.json(policy);
    } catch (err) {
        console.error('getPolicy error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const updatePolicy = async (req, res) => {
    const { encashable_leave_types, max_days_per_year, payout_formula } = req.body;

    try {

        if (!Array.isArray(encashable_leave_types) || encashable_leave_types.length === 0) {
            return res.status(400).json({ error: 'encashable_leave_types must be a non-empty array' });
        }

        const uniqueTypes = [...new Set(encashable_leave_types.map((t) => String(t).trim()))];
        const invalid = uniqueTypes.filter((t) => !LEAVE_TYPE_TO_COLUMNS[t]);
        if (invalid.length > 0) {
            return res.status(400).json({ error: `Invalid leave types: ${invalid.join(', ')}` });
        }

        const maxDays = Number(max_days_per_year);
        if (!Number.isInteger(maxDays) || maxDays <= 0) {
            return res.status(400).json({ error: 'max_days_per_year must be a positive integer' });
        }
        if (maxDays > 100) {
            return res.status(400).json({ error: 'max_days_per_year cannot exceed 100 days' });
        }

        const formula = payout_formula;
        if (formula !== 'BASIC_PER_DAY') {
            return res.status(400).json({ error: 'Only BASIC_PER_DAY formula is supported' });
        }

        const actorId = await getActorEmployeeId(req);

        const existing = await pool.query(
            `SELECT id FROM leave_encashment_policy ORDER BY updated_at DESC LIMIT 1`
        );

        if (!existing.rows[0]) {
            const inserted = await pool.query(
                `INSERT INTO leave_encashment_policy (
                    encashable_leave_types,
                    max_days_per_year,
                    payout_formula,
                    updated_by
                 ) VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [uniqueTypes, maxDays, formula, actorId]
            );
            return res.json(inserted.rows[0]);
        }

        const result = await pool.query(
            `UPDATE leave_encashment_policy
             SET encashable_leave_types = $1,
                 max_days_per_year = $2,
                 payout_formula = $3,
                 updated_by = $4,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [uniqueTypes, maxDays, formula, actorId, existing.rows[0].id]
        );

        return res.json(result.rows[0]);
    } catch (err) {
        console.error('updatePolicy error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMyEncashmentSummary = async (req, res) => {
    const client = await pool.connect();

    try {

        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const year = new Date().getFullYear();
        await ensureLeaveBalanceRow(client, employeeId, year);

        const policy = await getPolicyInternal(client);
        const approvedDays = await getApprovedDaysForYear(client, employeeId, year);

        const balances = [];
        if (policy) {
            for (const leaveType of policy.encashable_leave_types || []) {
                const available = await getAvailableDaysForType(client, employeeId, year, leaveType);
                balances.push({ leave_type: leaveType, encashable_days: available });
            }
        }

        res.json({
            year,
            policy: policy || null,
            approved_days_this_year: approvedDays,
            remaining_days_this_year: policy ? Math.max(0, Number(policy.max_days_per_year || 0) - approvedDays) : 0,
            balances,
        });
    } catch (err) {
        console.error('getMyEncashmentSummary error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const createEncashmentRequest = async (req, res) => {
    const { leave_type, days_requested } = req.body;
    const client = await pool.connect();

    try {

        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const days = Number(days_requested);
        if (!Number.isInteger(days) || days <= 0) {
            return res.status(400).json({ error: 'days_requested must be a positive integer' });
        }
        if (days > 100) {
            return res.status(400).json({ error: 'days_requested cannot exceed 100 days' });
        }

        const year = new Date().getFullYear();

        await client.query('BEGIN');
        await ensureLeaveBalanceRow(client, employeeId, year);

        const policy = await getPolicyInternal(client);
        if (!(policy.encashable_leave_types || []).includes(leave_type)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `${leave_type} is not encashable as per policy` });
        }

        const approvedDays = await getApprovedDaysForYear(client, employeeId, year);
        if (approvedDays + days > Number(policy.max_days_per_year || 0)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Request exceeds annual encashment limit' });
        }

        const available = await getAvailableDaysForType(client, employeeId, year, leave_type);
        if (days > available) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Only ${available} ${leave_type} days are encashable` });
        }

        const amount = await calculateEncashmentAmount(client, employeeId, days, policy.payout_formula);

        const created = await client.query(
            `INSERT INTO leave_encashment_requests (
                employee_id, leave_type, days_requested, encashment_amount, request_year, status, updated_at
             ) VALUES ($1, $2, $3, $4, $5, 'Pending', NOW())
             RETURNING *`,
            [employeeId, leave_type, days, amount, year]
        );

        await client.query('COMMIT');
        res.json(created.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('createEncashmentRequest rollback error:', rollbackErr.message);
        }
        console.error('createEncashmentRequest error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getMyEncashmentRequests = async (req, res) => {
    try {

        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const result = await pool.query(
            `SELECT ler.*, reviewer.full_name AS reviewer_name
             FROM leave_encashment_requests ler
             LEFT JOIN employees reviewer ON reviewer.id = ler.reviewer_id
             WHERE ler.employee_id = $1
             ORDER BY ler.created_at DESC`,
            [employeeId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getMyEncashmentRequests error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getEncashmentRequestsForHR = async (req, res) => {
    try {

        const status = req.query.status;
        const params = [];
        let where = '';
        if (status && status !== 'All') {
            params.push(status);
            where = `WHERE ler.status = $1`;
        }

        const result = await pool.query(
            `SELECT ler.*, e.full_name, e.department, reviewer.full_name AS reviewer_name
             FROM leave_encashment_requests ler
             JOIN employees e ON e.id = ler.employee_id
             LEFT JOIN employees reviewer ON reviewer.id = ler.reviewer_id
             ${where}
             ORDER BY ler.created_at DESC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getEncashmentRequestsForHR error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const reviewEncashmentRequest = async (req, res) => {
    const { id } = req.params;
    const { status, reviewer_comment } = req.body;
    const client = await pool.connect();

    try {

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be Approved or Rejected' });
        }

        const reviewerId = await getActorEmployeeId(req);

        await client.query('BEGIN');

        const reqRes = await client.query(
            `SELECT *
             FROM leave_encashment_requests
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (reqRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Request not found' });
        }

        const current = reqRes.rows[0];
        if (current.status !== 'Pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Only pending requests can be reviewed' });
        }

        if (status === 'Approved') {
            await ensureLeaveBalanceRow(client, current.employee_id, current.request_year);
            const policy = await getPolicyInternal(client);

            const approvedDays = await getApprovedDaysForYear(client, current.employee_id, current.request_year);
            if (approvedDays + Number(current.days_requested) > Number(policy.max_days_per_year || 0)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Approval exceeds annual encashment limit' });
            }

            const available = await getAvailableDaysForType(client, current.employee_id, current.request_year, current.leave_type);
            if (Number(current.days_requested) > available) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient encashable leave balance' });
            }

            const cols = LEAVE_TYPE_TO_COLUMNS[current.leave_type];
            await client.query(
                `UPDATE leave_balances
                 SET ${cols.encashed} = COALESCE(${cols.encashed}, 0) + $1
                 WHERE employee_id = $2 AND year = $3`,
                [current.days_requested, current.employee_id, current.request_year]
            );
        }

        const updated = await client.query(
            `UPDATE leave_encashment_requests
             SET status = $1,
                 reviewer_id = $2,
                 reviewer_comment = $3,
                 reviewed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [status, reviewerId, reviewer_comment || null, id]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('reviewEncashmentRequest rollback error:', rollbackErr.message);
        }
        console.error('reviewEncashmentRequest error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

module.exports = {
    getPolicy,
    updatePolicy,
    getMyEncashmentSummary,
    createEncashmentRequest,
    getMyEncashmentRequests,
    getEncashmentRequestsForHR,
    reviewEncashmentRequest,
};
