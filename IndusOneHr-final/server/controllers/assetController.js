const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



const ASSET_TYPES = ['Laptop', 'Phone', 'Monitor', 'Access Card', 'Other'];
const ASSET_STATUSES = ['available', 'assigned', 'damaged', 'retired'];



const getActorEmployeeId = async (req) => {
    if (req.user?.employee_uuid) return req.user.employee_uuid;

    if (req.user?.email) {
        const result = await pool.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
        if (result.rows[0]) return result.rows[0].id;
    }

    return null;
};

const createAsset = async (req, res) => {
    const { name, type, serial_number, purchase_date, value, status = 'available' } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Asset name is required' });
    }

    if (!ASSET_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid asset type' });
    }

    if (!serial_number || !String(serial_number).trim()) {
        return res.status(400).json({ error: 'Serial number is required' });
    }

    if (!ASSET_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid asset status' });
    }

    try {

        const actorId = await getActorEmployeeId(req);

        const result = await pool.query(
            `INSERT INTO assets (
                name, asset_type, serial_number, purchase_date, asset_value, status, created_by, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING *`,
            [
                String(name).trim(),
                type,
                String(serial_number).trim(),
                purchase_date || null,
                value ? Number(value) : null,
                status,
                actorId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Serial number already exists' });
        }
        console.error('createAsset error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const listAssets = async (req, res) => {
    const { type, status } = req.query;

    try {


        const params = [];
        const conditions = [];

        if (type) {
            params.push(type);
            conditions.push(`a.asset_type = $${params.length}`);
        }

        if (status) {
            params.push(status);
            conditions.push(`a.status = $${params.length}`);
        }

        const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT a.*,
                    aa.id AS active_assignment_id,
                    aa.employee_id AS assigned_employee_id,
                    aa.assigned_date,
                    e.full_name AS assigned_employee_name,
                    e.email AS assigned_employee_email,
                    e.department AS assigned_employee_department
             FROM assets a
             LEFT JOIN asset_assignments aa
               ON aa.asset_id = a.id
              AND aa.return_date IS NULL
             LEFT JOIN employees e ON e.id = aa.employee_id
             ${whereSql}
             ORDER BY a.created_at DESC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('listAssets error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const assignAsset = async (req, res) => {
    const { id } = req.params;
    const { employee_id, assignment_date } = req.body;
    const client = await pool.connect();

    try {


        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        const assignedDate = assignment_date || new Date().toISOString().slice(0, 10);
        const actorId = await getActorEmployeeId(req);

        await client.query('BEGIN');

        const assetRes = await client.query(
            `SELECT id, status
             FROM assets
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (assetRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (assetRes.rows[0].status === 'retired') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Retired asset cannot be assigned' });
        }

        const employeeRes = await client.query(
            'SELECT id FROM employees WHERE id = $1 LIMIT 1',
            [employee_id]
        );

        if (employeeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const activeAssignment = await client.query(
            'SELECT id FROM asset_assignments WHERE asset_id = $1 AND return_date IS NULL LIMIT 1',
            [id]
        );

        if (activeAssignment.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Asset is already assigned' });
        }

        const assignmentRes = await client.query(
            `INSERT INTO asset_assignments (
                asset_id, employee_id, assigned_date, assigned_by, updated_at
             ) VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [id, employee_id, assignedDate, actorId]
        );

        await client.query(
            `UPDATE assets
             SET status = 'assigned', updated_at = NOW()
             WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');
        res.json(assignmentRes.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('assignAsset rollback error:', rollbackErr.message);
        }
        console.error('assignAsset error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const returnAsset = async (req, res) => {
    const { id } = req.params;
    const { return_date, condition_notes, return_status } = req.body;
    const client = await pool.connect();

    try {


        const nextStatus = return_status || 'available';
        if (!['available', 'damaged', 'retired'].includes(nextStatus)) {
            return res.status(400).json({ error: 'return_status must be available, damaged, or retired' });
        }

        const returnDate = return_date || new Date().toISOString().slice(0, 10);
        const actorId = await getActorEmployeeId(req);

        await client.query('BEGIN');

        const assignmentRes = await client.query(
            `SELECT aa.id, aa.employee_id
             FROM asset_assignments aa
             WHERE aa.asset_id = $1
               AND aa.return_date IS NULL
             LIMIT 1
             FOR UPDATE`,
            [id]
        );

        if (assignmentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Asset is not currently assigned' });
        }

        const activeAssignmentId = assignmentRes.rows[0].id;
        const assignedEmployeeId = assignmentRes.rows[0].employee_id;

        const updatedAssignment = await client.query(
            `UPDATE asset_assignments
             SET return_date = $1,
                 condition_notes = $2,
                 returned_by = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [returnDate, condition_notes || null, actorId, activeAssignmentId]
        );

        await client.query(
            `UPDATE assets
             SET status = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [nextStatus, id]
        );

        await client.query(
            `UPDATE offboarding_checklist_items i
             SET is_cleared = TRUE,
                 cleared_by = $1,
                 cleared_at = NOW(),
                 notes = COALESCE(i.notes, '') || CASE WHEN COALESCE(i.notes, '') = '' THEN '' ELSE E'\n' END || $2,
                 updated_at = NOW()
             FROM offboarding_cases c
             WHERE i.case_id = c.id
               AND c.employee_id = $3
               AND c.status = 'in_progress'
               AND i.task_code = $4`,
            [
                actorId,
                `Asset returned on ${returnDate}${condition_notes ? ` (${condition_notes})` : ''}`,
                assignedEmployeeId,
                `asset_return_assignment_${activeAssignmentId}`
            ]
        );

        await client.query('COMMIT');
        res.json(updatedAssignment.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('returnAsset rollback error:', rollbackErr.message);
        }
        console.error('returnAsset error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getMyAssets = async (req, res) => {
    try {

        const employeeId = await getActorEmployeeId(req);

        if (!employeeId) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const result = await pool.query(
            `SELECT a.*,
                    aa.id AS assignment_id,
                    aa.assigned_date,
                    aa.condition_notes
             FROM asset_assignments aa
             JOIN assets a ON a.id = aa.asset_id
             WHERE aa.employee_id = $1
               AND aa.return_date IS NULL
             ORDER BY aa.assigned_date DESC, aa.created_at DESC`,
            [employeeId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getMyAssets error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createAsset,
    listAssets,
    assignAsset,
    returnAsset,
    getMyAssets,
};
