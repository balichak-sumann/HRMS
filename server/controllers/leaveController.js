const { Pool } = require('../db');
const { sendLeaveStatusEmail } = require('../services/emailService');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Get leaves ──────────────────────────────────────────────────
const getLeaves = async (req, res) => {
    try {
        let query = 'SELECT l.*, e.full_name, e.department, e.avatar_url FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE 1=1';
        let params = [];
        let pIndex = 1;

        if (!['hr', 'admin'].includes(req.user.role)) {
            const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            if (emp.rows.length > 0) {
                query += ` AND l.employee_id = $${pIndex++}`;
                params.push(emp.rows[0].id);
            } else {
                return res.json([]);
            }
        } else {
            const { status, department } = req.query;
            if (status && status !== 'All' && status !== 'All Status' && status !== 'All Requests') {
                query += ` AND l.status = $${pIndex++}`;
                params.push(status);
            }
            if (department && department !== 'All' && department !== 'All Departments') {
                query += ` AND e.department = $${pIndex++}`;
                params.push(department);
            }
        }

        query += ' ORDER BY l.created_at DESC';
        const leaves = await pool.query(query, params);
        res.json(leaves.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create leave request ────────────────────────────────────────
const ALLOWED_LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Comp Off', 'Maternity', 'Paternity', 'Bereavement', 'Unpaid'];

const LEAVE_TYPE_TO_BALANCE_FIELD = {
    'Casual': { total: 'casual_total', used: 'casual_used' },
    'Sick': { total: 'sick_total', used: 'sick_used' },
    'Earned': { total: 'earned_total', used: 'earned_used' },
    'Comp Off': { total: 'comp_off_total', used: 'comp_off_used' },
};

const createLeave = async (req, res) => {
    const { leave_type, start_date, end_date, reason } = req.body;
    const attachment_url = req.file ? `/uploads/leaves/${req.file.filename}` : req.body.attachment_url;

    // --- Input Validation ---
    if (!leave_type || !ALLOWED_LEAVE_TYPES.includes(leave_type)) {
        return res.status(400).json({ error: `Invalid leave type. Allowed: ${ALLOWED_LEAVE_TYPES.join(', ')}` });
    }

    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
        return res.status(400).json({ error: 'start_date is required and must be in YYYY-MM-DD format' });
    }

    if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return res.status(400).json({ error: 'end_date is required and must be in YYYY-MM-DD format' });
    }

    const startDateObj = new Date(start_date + 'T00:00:00Z');
    const endDateObj = new Date(end_date + 'T00:00:00Z');

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid date values provided' });
    }

    if (endDateObj < startDateObj) {
        return res.status(400).json({ error: 'end_date cannot be before start_date' });
    }

    // Prevent applying leave for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDateObj < today) {
        return res.status(400).json({ error: 'Cannot apply leave for past dates' });
    }

    // Calculate days from dates (ignore user-supplied days to prevent manipulation)
    const calculatedDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    if (calculatedDays <= 0 || calculatedDays > 365) {
        return res.status(400).json({ error: 'Leave duration must be between 1 and 365 days' });
    }

    if (!reason || String(reason).trim().length === 0) {
        return res.status(400).json({ error: 'Reason is required' });
    }

    try {
        let { employee_id } = req.body;
        if (!employee_id) {
            const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            if (emp.rows.length === 0) return res.status(404).json({ error: 'Employee profile not found' });
            employee_id = emp.rows[0].id;
        }

        // --- Leave Balance Check ---
        const balanceFields = LEAVE_TYPE_TO_BALANCE_FIELD[leave_type];
        if (balanceFields) {
            const currentYear = startDateObj.getUTCFullYear();
            const balanceRes = await pool.query(
                'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
                [employee_id, currentYear]
            );

            if (balanceRes.rows.length > 0) {
                const balance = balanceRes.rows[0];
                const total = Number(balance[balanceFields.total]) || 0;
                const used = Number(balance[balanceFields.used]) || 0;
                const available = total - used;

                if (calculatedDays > available) {
                    return res.status(400).json({
                        error: `Insufficient ${leave_type} leave balance. Available: ${available} day(s), Requested: ${calculatedDays} day(s)`
                    });
                }
            }
        }

        // --- Check for overlapping leave requests ---
        const overlapRes = await pool.query(
            `SELECT id FROM leaves 
             WHERE employee_id = $1 
             AND status IN ('Pending', 'Approved')
             AND ((start_date <= $3::date AND end_date >= $2::date))`,
            [employee_id, start_date, end_date]
        );

        if (overlapRes.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a leave request overlapping with these dates' });
        }

        const newLeave = await pool.query(
            'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, days, reason, attachment_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [employee_id, leave_type, start_date, end_date, calculatedDays, reason.trim(), attachment_url]
        );
        res.json(newLeave.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update leave status (HR) ────────────────────────────────────
const ALLOWED_LEAVE_STATUSES = ['Approved', 'Rejected', 'Cancelled'];

const updateLeaveStatus = async (req, res) => {
    const { status, remarks } = req.body;

    // --- Validate status ---
    if (!status || !ALLOWED_LEAVE_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_LEAVE_STATUSES.join(', ')}` });
    }

    // --- Validate leave ID format ---
    const leaveId = req.params.id;
    if (!leaveId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leaveId)) {
        return res.status(400).json({ error: 'Invalid leave request ID' });
    }

    try {
        // Fetch current leave status first
        const leaveRes = await pool.query('SELECT status, reviewed_at FROM leaves WHERE id = $1', [leaveId]);
        if (leaveRes.rows.length === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        const currentStatus = leaveRes.rows[0].status;
        if (currentStatus === status) {
            // Already set, do not update or send email again
            return res.status(200).json({
                ...leaveRes.rows[0],
                duplicate: true,
                message: 'Leave status already set.'
            });
        }

        // Prevent modifying already-processed leaves (except cancellation of approved)
        if (currentStatus !== 'Pending' && !(currentStatus === 'Approved' && status === 'Cancelled')) {
            return res.status(400).json({ error: `Cannot change status from '${currentStatus}' to '${status}'` });
        }

        const reviewer = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
        const reviewerUUID = reviewer.rows[0]?.id || null;

        const result = await pool.query(
            'UPDATE leaves SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
            [status, reviewerUUID, leaveId]
        );

        const updatedLeave = result.rows[0];

        // Send email notification (non-blocking)
        try {
            const empData = await pool.query(`
                SELECT e.full_name, e.email, l.leave_type, l.start_date, l.end_date
                FROM leaves l JOIN employees e ON l.employee_id = e.id
                WHERE l.id = $1
            `, [leaveId]);

            if (empData.rows.length > 0) {
                const emp = empData.rows[0];
                await sendLeaveStatusEmail({
                    to: emp.email,
                    name: emp.full_name,
                    status,
                    leaveType: emp.leave_type,
                    fromDate: emp.start_date,
                    toDate: emp.end_date,
                    remarks: remarks || ''
                });
            }
        } catch (emailErr) {
            console.warn('[Email] Leave notification failed (non-critical):', emailErr.message);
        }

        // Return reviewed_at as ISO string for consistent frontend display
        res.json({
            ...updatedLeave,
            reviewed_at: updatedLeave.reviewed_at ? new Date(updatedLeave.reviewed_at).toISOString() : null
        });
    } catch (err) {
        console.error('[Leaves PATCH] Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getLeaves,
    createLeave,
    updateLeaveStatus
};
