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
const createLeave = async (req, res) => {
    const { leave_type, start_date, end_date, days, reason } = req.body;
    const attachment_url = req.file ? `/uploads/leaves/${req.file.filename}` : req.body.attachment_url;

    try {
        let { employee_id } = req.body;
        if (!employee_id) {
            const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            if (emp.rows.length === 0) return res.status(404).json({ error: 'Employee profile not found' });
            employee_id = emp.rows[0].id;
        }

        const newLeave = await pool.query(
            'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, days, reason, attachment_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [employee_id, leave_type, start_date, end_date, days, reason, attachment_url]
        );
        res.json(newLeave.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update leave status (HR) ────────────────────────────────────
const updateLeaveStatus = async (req, res) => {
    const { status, remarks } = req.body;
    console.log('[Leaves PATCH] User:', req.user.email, '| Leave ID:', req.params.id, '| Status:', status);
    try {
        // Fetch current leave status first
        const leaveRes = await pool.query('SELECT status, reviewed_at FROM leaves WHERE id = $1', [req.params.id]);
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

        const reviewer = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
        const reviewerUUID = reviewer.rows[0]?.id || null;
        console.log('[Leaves PATCH] Reviewer UUID:', reviewerUUID);

        const result = await pool.query(
            'UPDATE leaves SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
            [status, reviewerUUID, req.params.id]
        );

        const updatedLeave = result.rows[0];
        console.log('[Leaves PATCH] Leave updated successfully:', updatedLeave.id);

        // Send email notification (non-blocking)
        try {
            const empData = await pool.query(`
                SELECT e.full_name, e.email, l.leave_type, l.start_date, l.end_date
                FROM leaves l JOIN employees e ON l.employee_id = e.id
                WHERE l.id = $1
            `, [req.params.id]);

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
        console.error('[Leaves PATCH] FULL ERROR:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

module.exports = {
    getLeaves,
    createLeave,
    updateLeaveStatus
};
