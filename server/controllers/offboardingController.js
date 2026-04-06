const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



const STANDARD_CHECKLIST = [
    { task_code: 'asset_return', task_title: 'Asset Return', assigned_role: 'IT', sort_order: 1 },
    { task_code: 'it_access_revocation', task_title: 'IT Access Revocation', assigned_role: 'IT', sort_order: 2 },
    { task_code: 'payroll_settlement', task_title: 'Payroll Settlement', assigned_role: 'Finance', sort_order: 3 },
    { task_code: 'exit_interview_completion', task_title: 'Exit Interview Completion', assigned_role: 'HR', sort_order: 4 },
    { task_code: 'final_clearance', task_title: 'Final Clearance', assigned_role: 'HR', sort_order: 5 }
];

const normalizeRoleBucket = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return null;
    if (text.includes('it') || text.includes('information technology')) return 'IT';
    if (text.includes('finance') || text.includes('accounts')) return 'Finance';
    if (text.includes('hr') || text.includes('human resource')) return 'HR';
    return null;
};



const getActorEmployee = async (client, req) => {
    if (req.user?.employee_uuid) {
        const actor = await client.query(
            `SELECT id, full_name, email, department, role
             FROM employees
             WHERE id = $1
             LIMIT 1`,
            [req.user.employee_uuid]
        );
        if (actor.rows[0]) return actor.rows[0];
    }

    if (req.user?.email) {
        const actor = await client.query(
            `SELECT id, full_name, email, department, role
             FROM employees
             WHERE email = $1
             LIMIT 1`,
            [req.user.email]
        );
        if (actor.rows[0]) return actor.rows[0];
    }

    return null;
};

const getProgress = async (client, caseId) => {
    const result = await client.query(
        `SELECT COUNT(*)::int AS total_items,
                COALESCE(SUM(CASE WHEN is_cleared THEN 1 ELSE 0 END), 0)::int AS cleared_items
         FROM offboarding_checklist_items
         WHERE case_id = $1`,
        [caseId]
    );

    const totalItems = Number(result.rows[0]?.total_items || 0);
    const clearedItems = Number(result.rows[0]?.cleared_items || 0);
    const progressPercentage = totalItems === 0 ? 0 : Math.round((clearedItems * 100) / totalItems);

    return { total_items: totalItems, cleared_items: clearedItems, progress_percentage: progressPercentage };
};

const getChecklist = async (client, caseId) => {
    const result = await client.query(
        `SELECT i.*,
                assignee.full_name AS assigned_to_name,
                clearer.full_name AS cleared_by_name
         FROM offboarding_checklist_items i
         LEFT JOIN employees assignee ON assignee.id = i.assigned_to
         LEFT JOIN employees clearer ON clearer.id = i.cleared_by
         WHERE i.case_id = $1
         ORDER BY i.sort_order ASC, i.created_at ASC`,
        [caseId]
    );

    return result.rows;
};

const getCaseByIdInternal = async (client, caseId) => {
    const caseRes = await client.query(
        `SELECT oc.*,
                e.full_name AS employee_name,
                e.email AS employee_email,
                e.department AS employee_department,
                e.role AS employee_role,
                e.status AS employee_status,
                starter.full_name AS started_by_name,
                finalizer.full_name AS finalized_by_name,
                interview.id AS interview_id,
                interview.reason_for_leaving,
                interview.experience_rating,
                interview.feedback,
                interview.submitted_at AS interview_submitted_at
         FROM offboarding_cases oc
         JOIN employees e ON e.id = oc.employee_id
         LEFT JOIN employees starter ON starter.id = oc.started_by
         LEFT JOIN employees finalizer ON finalizer.id = oc.finalized_by
         LEFT JOIN offboarding_exit_interviews interview ON interview.case_id = oc.id
         WHERE oc.id = $1
         LIMIT 1`,
        [caseId]
    );

    if (caseRes.rows.length === 0) return null;

    const checklist = await getChecklist(client, caseId);
    const progress = await getProgress(client, caseId);

    return {
        ...caseRes.rows[0],
        ...progress,
        interview_submitted: !!caseRes.rows[0].interview_id,
        checklist
    };
};

const startOffboarding = async (req, res) => {
    const { employee_id, last_working_date, reason, reason_details } = req.body;
    const allowedReasons = ['resignation', 'termination', 'contract_end'];

    if (!employee_id || !last_working_date || !reason) {
        return res.status(400).json({ error: 'employee_id, last_working_date, and reason are required' });
    }

    if (!allowedReasons.includes(reason)) {
        return res.status(400).json({ error: 'reason must be resignation, termination, or contract_end' });
    }

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const employeeRes = await client.query(
            `SELECT id, full_name, email, status
             FROM employees
             WHERE id = $1
             LIMIT 1`,
            [employee_id]
        );

        if (employeeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const activeCaseRes = await client.query(
            `SELECT id FROM offboarding_cases
             WHERE employee_id = $1 AND status = 'in_progress'
             LIMIT 1`,
            [employee_id]
        );

        if (activeCaseRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Employee already has an in-progress offboarding case' });
        }

        const actor = await getActorEmployee(client, req);

        const created = await client.query(
            `INSERT INTO offboarding_cases (
                employee_id,
                last_working_date,
                reason,
                reason_details,
                status,
                started_by,
                updated_at
            ) VALUES ($1, $2, $3, $4, 'in_progress', $5, NOW())
            RETURNING *`,
            [employee_id, last_working_date, reason, reason_details || null, actor?.id || null]
        );

        const caseId = created.rows[0].id;

        for (const item of STANDARD_CHECKLIST) {
            await client.query(
                `INSERT INTO offboarding_checklist_items (
                    case_id,
                    task_code,
                    task_title,
                    assigned_role,
                    sort_order,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [caseId, item.task_code, item.task_title, item.assigned_role, item.sort_order]
            );
        }

        const assetTableCheck = await client.query(
            `SELECT to_regclass('public.assets') AS assets_table,
                    to_regclass('public.asset_assignments') AS assignments_table`
        );

        if (assetTableCheck.rows[0]?.assets_table && assetTableCheck.rows[0]?.assignments_table) {
            const activeAssetsRes = await client.query(
                `SELECT aa.id AS assignment_id,
                        aa.assigned_date,
                        a.name,
                        a.asset_type,
                        a.serial_number
                 FROM asset_assignments aa
                 JOIN assets a ON a.id = aa.asset_id
                 WHERE aa.employee_id = $1
                   AND aa.return_date IS NULL
                 ORDER BY aa.assigned_date ASC, aa.created_at ASC`,
                [employee_id]
            );

            let sortOrder = STANDARD_CHECKLIST.length + 1;
            for (const asset of activeAssetsRes.rows) {
                await client.query(
                    `INSERT INTO offboarding_checklist_items (
                        case_id,
                        task_code,
                        task_title,
                        assigned_role,
                        notes,
                        sort_order,
                        updated_at
                    ) VALUES ($1, $2, $3, 'IT', $4, $5, NOW())`,
                    [
                        caseId,
                        `asset_return_assignment_${asset.assignment_id}`,
                        `Return ${asset.asset_type}: ${asset.name} (${asset.serial_number})`,
                        `Pending return. Assigned on ${asset.assigned_date ? new Date(asset.assigned_date).toISOString().slice(0, 10) : 'N/A'}`,
                        sortOrder
                    ]
                );
                sortOrder += 1;
            }
        }

        await client.query('COMMIT');

        const withDetails = await getCaseByIdInternal(pool, caseId);
        return res.json(withDetails);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('startOffboarding rollback error:', rollbackErr.message);
        }
        console.error('startOffboarding error:', err.message);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getCasesForHR = async (req, res) => {
    try {


        const status = req.query.status;
        const params = [];
        let statusWhere = '';

        if (status && status !== 'All') {
            params.push(status);
            statusWhere = `WHERE oc.status = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT oc.*,
                    e.full_name AS employee_name,
                    e.department AS employee_department,
                    e.role AS employee_role,
                    e.status AS employee_status,
                    COALESCE(SUM(CASE WHEN i.is_cleared THEN 1 ELSE 0 END), 0)::int AS cleared_items,
                    COUNT(i.id)::int AS total_items,
                    CASE WHEN COUNT(i.id) = 0 THEN 0
                         ELSE ROUND((SUM(CASE WHEN i.is_cleared THEN 1 ELSE 0 END)::numeric * 100) / COUNT(i.id), 0)
                    END::int AS progress_percentage,
                    EXISTS(SELECT 1 FROM offboarding_exit_interviews oi WHERE oi.case_id = oc.id) AS interview_submitted
             FROM offboarding_cases oc
             JOIN employees e ON e.id = oc.employee_id
             LEFT JOIN offboarding_checklist_items i ON i.case_id = oc.id
             ${statusWhere}
             GROUP BY oc.id, e.full_name, e.department, e.role, e.status
             ORDER BY oc.created_at DESC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getCasesForHR error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getCaseDetailsForHR = async (req, res) => {
    try {


        const details = await getCaseByIdInternal(pool, req.params.id);
        if (!details) return res.status(404).json({ error: 'Offboarding case not found' });

        res.json(details);
    } catch (err) {
        console.error('getCaseDetailsForHR error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateChecklistAssignment = async (req, res) => {
    const { caseId, itemId } = req.params;
    const { assigned_role, assigned_to } = req.body;

    if (!['IT', 'Finance', 'HR'].includes(assigned_role)) {
        return res.status(400).json({ error: 'assigned_role must be IT, Finance, or HR' });
    }

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const taskRes = await client.query(
            `SELECT id
             FROM offboarding_checklist_items
             WHERE id = $1 AND case_id = $2
             LIMIT 1`,
            [itemId, caseId]
        );

        if (taskRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        let assignedToEmployeeId = assigned_to || null;
        if (assignedToEmployeeId) {
            const employeeRes = await client.query('SELECT id FROM employees WHERE id = $1 LIMIT 1', [assignedToEmployeeId]);
            if (employeeRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Assigned employee not found' });
            }
        }

        const updated = await client.query(
            `UPDATE offboarding_checklist_items
             SET assigned_role = $1,
                 assigned_to = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [assigned_role, assignedToEmployeeId, itemId]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('updateChecklistAssignment rollback error:', rollbackErr.message);
        }
        console.error('updateChecklistAssignment error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const canActorClearItem = async (client, req, item) => {
    if (['hr', 'admin'].includes(req.user?.role)) return true;

    const actor = await getActorEmployee(client, req);
    if (!actor) return false;

    if (item.assigned_to && actor.id === item.assigned_to) return true;

    const actorBuckets = [
        normalizeRoleBucket(actor.department),
        normalizeRoleBucket(actor.role)
    ].filter(Boolean);

    return actorBuckets.includes(item.assigned_role);
};

const markChecklistItem = async (req, res) => {
    const { itemId } = req.params;
    const is_cleared = req.body.is_cleared !== false;
    const notes = req.body.notes;

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const currentRes = await client.query(
            `SELECT i.*, c.status AS case_status
             FROM offboarding_checklist_items i
             JOIN offboarding_cases c ON c.id = i.case_id
             WHERE i.id = $1
             LIMIT 1`,
            [itemId]
        );

        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        const current = currentRes.rows[0];
        if (current.case_status === 'completed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Checklist cannot be updated after case completion' });
        }

        const authorized = await canActorClearItem(client, req, current);
        if (!authorized) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not authorized to clear this checklist item' });
        }

        const actor = await getActorEmployee(client, req);

        const updated = await client.query(
            `UPDATE offboarding_checklist_items
             SET is_cleared = $1,
                 cleared_by = CASE WHEN $1 THEN $2::uuid ELSE NULL END,
                 cleared_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
                 notes = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [is_cleared, actor?.id || null, notes || null, itemId]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('markChecklistItem rollback error:', rollbackErr.message);
        }
        console.error('markChecklistItem error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getMyCase = async (req, res) => {
    const client = await pool.connect();

    try {


        const actor = await getActorEmployee(client, req);
        if (!actor) return res.status(404).json({ error: 'Employee not found' });

        const caseRes = await client.query(
            `SELECT id
             FROM offboarding_cases
             WHERE employee_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [actor.id]
        );

        const details = caseRes.rows.length > 0
            ? await getCaseByIdInternal(client, caseRes.rows[0].id)
            : null;

        const actorBuckets = [
            normalizeRoleBucket(actor.department),
            normalizeRoleBucket(actor.role)
        ].filter(Boolean);

        const assignmentParams = [actor.id];
        let roleClause = '';
        if (actorBuckets.length > 0) {
            assignmentParams.push(actorBuckets);
            roleClause = 'OR i.assigned_role = ANY($2)';
        }

        const assignments = await client.query(
            `SELECT i.*,
                    c.employee_id,
                    e.full_name AS offboarding_employee_name
             FROM offboarding_checklist_items i
             JOIN offboarding_cases c ON c.id = i.case_id
             JOIN employees e ON e.id = c.employee_id
             WHERE c.status = 'in_progress'
               AND (i.assigned_to = $1 ${roleClause})
             ORDER BY c.created_at DESC, i.sort_order ASC`,
            assignmentParams
        );

                return res.json({
                        case: details,
                        checklist: details?.checklist || [],
                        assignments: assignments.rows
                });
    } catch (err) {
        console.error('getMyCase error:', err.message);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const submitExitInterview = async (req, res) => {
    const { reason_for_leaving, experience_rating, feedback } = req.body;

    if (!reason_for_leaving || !experience_rating) {
        return res.status(400).json({ error: 'reason_for_leaving and experience_rating are required' });
    }

    const rating = Number(experience_rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'experience_rating must be an integer between 1 and 5' });
    }

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const actor = await getActorEmployee(client, req);
        if (!actor) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const offboardingCase = await client.query(
            `SELECT id, status
             FROM offboarding_cases
             WHERE employee_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [actor.id]
        );

        if (offboardingCase.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'No offboarding case found for employee' });
        }

        if (offboardingCase.rows[0].status === 'completed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Exit interview cannot be updated after offboarding completion' });
        }

        const caseId = offboardingCase.rows[0].id;

        const upsert = await client.query(
            `INSERT INTO offboarding_exit_interviews (
                case_id,
                employee_id,
                reason_for_leaving,
                experience_rating,
                feedback,
                submitted_at,
                updated_at
             ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT (case_id)
             DO UPDATE SET
                reason_for_leaving = EXCLUDED.reason_for_leaving,
                experience_rating = EXCLUDED.experience_rating,
                feedback = EXCLUDED.feedback,
                updated_at = NOW()
             RETURNING *`,
            [caseId, actor.id, reason_for_leaving, rating, feedback || null]
        );

        await client.query(
            `UPDATE offboarding_checklist_items
             SET is_cleared = TRUE,
                 cleared_by = $1,
                 cleared_at = NOW(),
                 updated_at = NOW()
             WHERE case_id = $2
               AND task_code = 'exit_interview_completion'`,
            [actor.id, caseId]
        );

        await client.query('COMMIT');
        return res.json(upsert.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('submitExitInterview rollback error:', rollbackErr.message);
        }
        console.error('submitExitInterview error:', err.message);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const finalizeOffboarding = async (req, res) => {
    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const actor = await getActorEmployee(client, req);

        const caseRes = await client.query(
            `SELECT oc.*, e.email
             FROM offboarding_cases oc
             JOIN employees e ON e.id = oc.employee_id
             WHERE oc.id = $1
             FOR UPDATE`,
            [req.params.id]
        );

        if (caseRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Offboarding case not found' });
        }

        const caseRow = caseRes.rows[0];
        if (caseRow.status === 'completed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Offboarding case is already completed' });
        }

        const progress = await getProgress(client, caseRow.id);
        if (progress.total_items === 0 || progress.cleared_items < progress.total_items) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'All checklist items must be cleared before finalizing' });
        }

        const interviewRes = await client.query(
            `SELECT id
             FROM offboarding_exit_interviews
             WHERE case_id = $1
             LIMIT 1`,
            [caseRow.id]
        );

        if (interviewRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Exit interview is pending' });
        }

        await client.query(
            `UPDATE employees
             SET status = 'Inactive',
                 updated_at = NOW()
             WHERE id = $1`,
            [caseRow.employee_id]
        );

        await client.query(
            `UPDATE profiles
             SET status = 'inactive',
                 updated_at = NOW()
             WHERE employee_id = $1 OR email = $2`,
            [caseRow.employee_id, caseRow.email]
        );

        await client.query(
            `UPDATE offboarding_cases
             SET status = 'completed',
                 finalized_by = $1,
                 finalized_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [actor?.id || null, caseRow.id]
        );

        await client.query('COMMIT');

        const withDetails = await getCaseByIdInternal(pool, caseRow.id);
        return res.json(withDetails);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('finalizeOffboarding rollback error:', rollbackErr.message);
        }
        console.error('finalizeOffboarding error:', err.message);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

module.exports = {
    startOffboarding,
    getCasesForHR,
    getCaseDetailsForHR,
    updateChecklistAssignment,
    markChecklistItem,
    getMyCase,
    submitExitInterview,
    finalizeOffboarding
};
