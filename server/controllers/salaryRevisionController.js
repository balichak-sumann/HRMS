const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



const toNumber = (value, defaultValue = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const round2 = (value) => Number((Math.round((Number(value) || 0) * 100) / 100).toFixed(2));

const fallbackStructureFromAnnualSalary = (annualSalaryRaw) => {
    const annualSalaryInput = Number(annualSalaryRaw);
    if (!Number.isFinite(annualSalaryInput) || annualSalaryInput <= 0) {
        return null;
    }

    const gross = round2(annualSalaryInput / 12);
    const basic = gross;
    const hra = 0;
    const allowances = 0;

    return {
        basic_salary: round2(basic),
        hra: round2(hra),
        allowances: round2(allowances),
        monthly_gross: round2(gross),
        total_ctc: round2(annualSalaryInput),
    };
};



const getActorEmployeeId = async (req, client = pool) => {
    if (req.user?.employee_uuid) return req.user.employee_uuid;

    if (req.user?.email) {
        const result = await client.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
        if (result.rows[0]) return result.rows[0].id;
    }

    return null;
};

const getLatestApprovedRevisionForDate = async (employeeId, onOrBeforeDate, client = pool) => {

    const result = await client.query(
        `SELECT *
         FROM salary_revisions
         WHERE employee_id = $1
           AND status = 'approved'
           AND effective_date <= $2::date
         ORDER BY effective_date DESC, approved_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [employeeId, onOrBeforeDate]
    );

    return result.rows[0] || null;
};

const getCurrentSalaryStructure = async (employeeId, client = pool) => {

    const employeeRes = await client.query(
        `SELECT id, full_name, salary, salary_revision_history_enabled
         FROM employees
         WHERE id = $1
         LIMIT 1`,
        [employeeId]
    );

    if (employeeRes.rows.length === 0) return null;

    const employee = employeeRes.rows[0];
    const today = new Date().toISOString().slice(0, 10);
    const latestRevision = await getLatestApprovedRevisionForDate(employeeId, today, client);

    if (latestRevision) {
        return {
            employee_id: employee.id,
            employee_name: employee.full_name,
            source: 'approved_revision',
            effective_date: latestRevision.effective_date,
            basic_salary: round2(latestRevision.proposed_basic_salary),
            hra: round2(latestRevision.proposed_hra),
            allowances: round2(latestRevision.proposed_allowances),
            monthly_gross: round2(
                toNumber(latestRevision.proposed_basic_salary)
                + toNumber(latestRevision.proposed_hra)
                + toNumber(latestRevision.proposed_allowances)
            ),
            total_ctc: round2(latestRevision.proposed_total_ctc),
            history_enabled: !!employee.salary_revision_history_enabled,
        };
    }

    const fallback = fallbackStructureFromAnnualSalary(employee.salary);
    if (!fallback) {
        return {
            employee_id: employee.id,
            employee_name: employee.full_name,
            source: 'employee_salary_missing',
            effective_date: null,
            basic_salary: 0,
            hra: 0,
            allowances: 0,
            monthly_gross: 0,
            total_ctc: 0,
            history_enabled: !!employee.salary_revision_history_enabled,
        };
    }

    return {
        employee_id: employee.id,
        employee_name: employee.full_name,
        source: 'employee_salary_fallback',
        effective_date: null,
        ...fallback,
        history_enabled: !!employee.salary_revision_history_enabled,
    };
};

const getRevisionHistory = async (employeeId, client = pool) => {

    const history = await client.query(
        `SELECT sr.*,
                initiator.full_name AS initiated_by_name,
                approver.full_name AS approved_by_name
         FROM salary_revisions sr
         LEFT JOIN employees initiator ON initiator.id = sr.initiated_by
         LEFT JOIN employees approver ON approver.id = sr.approved_by
         WHERE sr.employee_id = $1
         ORDER BY sr.created_at DESC`,
        [employeeId]
    );

    return history.rows;
};

const initiateRevision = async (req, res) => {
    const {
        employee_id,
        effective_date,
        basic_salary,
        hra,
        allowances,
        total_ctc,
    } = req.body;

    const client = await pool.connect();

    try {


        if (!employee_id || !effective_date) {
            return res.status(400).json({ error: 'employee_id and effective_date are required' });
        }

        const basic = Math.max(0, toNumber(basic_salary));
        const hraAmount = Math.max(0, toNumber(hra));
        const allowanceAmount = Math.max(0, toNumber(allowances));
        const ctc = Math.max(0, toNumber(total_ctc));

        const employeeRes = await client.query('SELECT id FROM employees WHERE id = $1 LIMIT 1', [employee_id]);
        if (employeeRes.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const actorId = await getActorEmployeeId(req, client);
        if (!actorId) return res.status(404).json({ error: 'Initiator employee not found' });

        const created = await client.query(
            `INSERT INTO salary_revisions (
                employee_id,
                effective_date,
                proposed_basic_salary,
                proposed_hra,
                proposed_allowances,
                proposed_total_ctc,
                status,
                initiated_by,
                initiated_at,
                updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
             RETURNING *`,
            [employee_id, effective_date, basic, hraAmount, allowanceAmount, ctc, actorId]
        );

        res.status(201).json(created.rows[0]);
    } catch (err) {
        console.error('initiateRevision error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const decideRevision = async (req, res) => {
    const { id } = req.params;
    const { decision, comment } = req.body;
    const client = await pool.connect();

    try {


        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ error: 'decision must be approved or rejected' });
        }

        const actorId = await getActorEmployeeId(req, client);
        if (!actorId) return res.status(404).json({ error: 'Approver employee not found' });

        await client.query('BEGIN');

        const revisionRes = await client.query(
            `SELECT *
             FROM salary_revisions
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (revisionRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Revision request not found' });
        }

        const revision = revisionRes.rows[0];

        if (revision.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Only pending revisions can be approved or rejected' });
        }

        if (revision.initiated_by && revision.initiated_by === actorId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Initiator cannot approve or reject own revision' });
        }

        const updated = await client.query(
            `UPDATE salary_revisions
             SET status = $1,
                 approved_by = $2,
                 approver_comment = $3,
                 approved_at = NOW(),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [decision, actorId, comment || null, id]
        );

        if (decision === 'approved') {
            await client.query(
                `UPDATE employees
                 SET salary = $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [toNumber(revision.proposed_total_ctc), revision.employee_id]
            );
        }

        await client.query('COMMIT');

        res.json(updated.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('decideRevision rollback error:', rollbackErr.message);
        }

        console.error('decideRevision error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getEmployeeRevisionHistoryForHR = async (req, res) => {
    try {


        const employeeId = req.params.employeeId;
        const employeeRes = await pool.query(
            'SELECT id, full_name, salary_revision_history_enabled FROM employees WHERE id = $1 LIMIT 1',
            [employeeId]
        );

        if (employeeRes.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const [current, history] = await Promise.all([
            getCurrentSalaryStructure(employeeId),
            getRevisionHistory(employeeId),
        ]);

        res.json({
            employee_id: employeeId,
            employee_name: employeeRes.rows[0].full_name,
            history_enabled: !!employeeRes.rows[0].salary_revision_history_enabled,
            current_structure: current,
            revisions: history,
        });
    } catch (err) {
        console.error('getEmployeeRevisionHistoryForHR error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const setHistoryVisibility = async (req, res) => {
    try {


        const employeeId = req.params.employeeId;
        const enabled = !!req.body.enabled;

        const updated = await pool.query(
            `UPDATE employees
             SET salary_revision_history_enabled = $1,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING id, full_name, salary_revision_history_enabled`,
            [enabled, employeeId]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(updated.rows[0]);
    } catch (err) {
        console.error('setHistoryVisibility error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const listPendingApprovals = async (req, res) => {
    try {


        const actorId = await getActorEmployeeId(req);

        const result = await pool.query(
            `SELECT sr.*,
                    e.full_name AS employee_name,
                    initiator.full_name AS initiated_by_name
             FROM salary_revisions sr
             JOIN employees e ON e.id = sr.employee_id
             LEFT JOIN employees initiator ON initiator.id = sr.initiated_by
             WHERE sr.status = 'pending'
               AND ($1::uuid IS NULL OR sr.initiated_by IS DISTINCT FROM $1::uuid)
             ORDER BY sr.created_at DESC`,
            [actorId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('listPendingApprovals error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMyCurrentSalaryStructure = async (req, res) => {
    try {


        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const current = await getCurrentSalaryStructure(employeeId);
        res.json(current);
    } catch (err) {
        console.error('getMyCurrentSalaryStructure error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMySalaryRevisionHistory = async (req, res) => {
    try {


        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const employeeRes = await pool.query(
            'SELECT salary_revision_history_enabled FROM employees WHERE id = $1 LIMIT 1',
            [employeeId]
        );

        const historyEnabled = !!employeeRes.rows[0]?.salary_revision_history_enabled;
        if (!historyEnabled) {
            return res.status(403).json({ error: 'Salary revision history is not enabled by HR' });
        }

        const history = await getRevisionHistory(employeeId);
        res.json(history);
    } catch (err) {
        console.error('getMySalaryRevisionHistory error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {

    getLatestApprovedRevisionForDate,
    getCurrentSalaryStructure,
    initiateRevision,
    decideRevision,
    getEmployeeRevisionHistoryForHR,
    setHistoryVisibility,
    listPendingApprovals,
    getMyCurrentSalaryStructure,
    getMySalaryRevisionHistory,
};
