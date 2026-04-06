const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const resolveEmployee = async (req) => {
    if (req.user?.employee_uuid) {
        const emp = await pool.query('SELECT id, full_name FROM employees WHERE id = $1', [req.user.employee_uuid]);
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

const isManagerOf = async (managerId, employeeId) => {
    const result = await pool.query(
        'SELECT 1 FROM employees WHERE id = $1 AND reporting_manager_id = $2 LIMIT 1',
        [employeeId, managerId]
    );
    return result.rows.length > 0;
};

const hasDirectReports = async (managerId) => {
    const result = await pool.query(
        'SELECT COUNT(*)::int AS count FROM employees WHERE reporting_manager_id = $1',
        [managerId]
    );
    return (result.rows[0]?.count || 0) > 0;
};

// HR: create appraisal cycle
const createCycle = async (req, res) => {
    const { name, start_date, end_date, status = 'draft' } = req.body;

    if (!name || !start_date || !end_date) {
        return res.status(400).json({ error: 'name, start_date and end_date are required' });
    }

    try {
        const creator = await resolveEmployee(req);
        const result = await pool.query(
            `INSERT INTO appraisal_cycles (name, start_date, end_date, status, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, start_date, end_date, status, creator?.id || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('createCycle error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const addParticipant = async (req, res) => {
    const { id: cycle_id } = req.params;
    const { employee_id } = req.body;

    if (!employee_id) {
        return res.status(400).json({ error: 'employee_id is required' });
    }

    try {
        await pool.query(
            `INSERT INTO appraisal_participants (cycle_id, employee_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [cycle_id, employee_id]
        );
        res.json({ message: 'Employee added to cycle successfully' });
    } catch (err) {
        console.error('addParticipant error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateCycleStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = await pool.query(
            'UPDATE appraisal_cycles SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cycle not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateCycleStatus error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// HR gets all, others get active + participated cycles
const getCycles = async (req, res) => {
    try {
        if (['hr', 'admin', 'Super Admin'].includes(req.user.role)) {
            const result = await pool.query('SELECT * FROM appraisal_cycles ORDER BY start_date DESC');
            return res.json(result.rows);
        }

        const employee = await resolveEmployee(req);
        if (!employee) return res.json([]);

        const result = await pool.query(
            `SELECT DISTINCT c.*
             FROM appraisal_cycles c
             LEFT JOIN appraisal_participants ap ON ap.cycle_id = c.id
             WHERE c.status = 'active'
                OR ap.employee_id = $1
             ORDER BY c.start_date DESC`,
            [employee.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getCycles error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const createGoal = async (req, res) => {
    const { cycle_id, title, description, target } = req.body;

    if (!cycle_id || !title || !target) {
        return res.status(400).json({ error: 'cycle_id, title and target are required' });
    }

    try {
        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const cycle = await pool.query('SELECT id, status FROM appraisal_cycles WHERE id = $1', [cycle_id]);
        if (cycle.rows.length === 0) return res.status(404).json({ error: 'Cycle not found' });
        if (cycle.rows[0].status !== 'active') {
            return res.status(400).json({ error: 'Goals can only be created in active cycles' });
        }

        const result = await pool.query(
            `INSERT INTO goals (cycle_id, employee_id, title, description, target, progress)
             VALUES ($1, $2, $3, $4, $5, 0)
             RETURNING *`,
            [cycle_id, employee.id, title, description || null, target]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('createGoal error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateGoalProgress = async (req, res) => {
    const { id } = req.params;
    const { progress } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'progress must be a number between 0 and 100' });
    }

    try {
        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const result = await pool.query(
            `UPDATE goals
             SET progress = $1, updated_at = NOW()
             WHERE id = $2 AND employee_id = $3
             RETURNING *`,
            [progress, id, employee.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateGoalProgress error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getGoals = async (req, res) => {
    const { cycle_id, employee_id } = req.query;

    try {
        const me = await resolveEmployee(req);
        if (!me) return res.status(404).json({ error: 'Employee not found' });

        let targetEmployeeId = me.id;

        if (employee_id) {
            if (['hr', 'admin', 'Super Admin'].includes(req.user.role) || await isManagerOf(me.id, employee_id)) {
                targetEmployeeId = employee_id;
            } else {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        const where = ['g.employee_id = $1'];
        const params = [targetEmployeeId];

        if (cycle_id) {
            params.push(cycle_id);
            where.push(`g.cycle_id = $${params.length}`);
        }

        const result = await pool.query(
            `SELECT g.*, c.name AS cycle_name, c.status AS cycle_status
             FROM goals g
             JOIN appraisal_cycles c ON c.id = g.cycle_id
             WHERE ${where.join(' AND ')}
             ORDER BY g.created_at DESC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getGoals error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const submitSelfAppraisal = async (req, res) => {
    const { cycle_id, overall_comment, items = [] } = req.body;

    if (!cycle_id || !Array.isArray(items)) {
        return res.status(400).json({ error: 'cycle_id and items array are required' });
    }

    if (items.length === 0 && (!overall_comment || !overall_comment.trim())) {
        return res.status(400).json({ error: 'Either goal ratings or an overall comment is required' });
    }

    const client = await pool.connect();
    try {
        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        await client.query('BEGIN');

        const upsert = await client.query(
            `INSERT INTO self_appraisals (cycle_id, employee_id, overall_comment, submitted_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (cycle_id, employee_id)
             DO UPDATE SET overall_comment = EXCLUDED.overall_comment, submitted_at = NOW()
             RETURNING *`,
            [cycle_id, employee.id, overall_comment || null]
        );

        const selfId = upsert.rows[0].id;

        await client.query('DELETE FROM self_appraisal_items WHERE self_appraisal_id = $1', [selfId]);

        for (const item of items) {
            if (!item.goal_id || typeof item.rating !== 'number') continue;
            await client.query(
                `INSERT INTO self_appraisal_items (self_appraisal_id, goal_id, rating, comment)
                 VALUES ($1, $2, $3, $4)`,
                [selfId, item.goal_id, item.rating, item.comment || null]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Self appraisal submitted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('submitSelfAppraisal error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const submitManagerAppraisal = async (req, res) => {
    const { cycle_id, employee_id, feedback, items = [] } = req.body;

    if (!cycle_id || !employee_id || !Array.isArray(items)) {
        return res.status(400).json({ error: 'cycle_id, employee_id and items array are required' });
    }

    if (items.length === 0 && (!feedback || !feedback.trim())) {
        return res.status(400).json({ error: 'Either goal ratings or manager feedback is required' });
    }

    const client = await pool.connect();
    try {
        const manager = await resolveEmployee(req);
        if (!manager) return res.status(404).json({ error: 'Manager not found' });

        const allowed = ['hr', 'admin', 'Super Admin'].includes(req.user.role) ? true : await isManagerOf(manager.id, employee_id);
        if (!allowed) return res.status(403).json({ error: 'Forbidden: Not your direct report' });

        await client.query('BEGIN');

        const upsert = await client.query(
            `INSERT INTO manager_appraisals (cycle_id, employee_id, manager_id, feedback, submitted_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (cycle_id, employee_id, manager_id)
             DO UPDATE SET feedback = EXCLUDED.feedback, submitted_at = NOW()
             RETURNING *`,
            [cycle_id, employee_id, manager.id, feedback || null]
        );

        const managerId = upsert.rows[0].id;
        await client.query('DELETE FROM manager_appraisal_items WHERE manager_appraisal_id = $1', [managerId]);

        for (const item of items) {
            if (!item.goal_id || typeof item.rating !== 'number') continue;
            await client.query(
                `INSERT INTO manager_appraisal_items (manager_appraisal_id, goal_id, rating, comment)
                 VALUES ($1, $2, $3, $4)`,
                [managerId, item.goal_id, item.rating, item.comment || null]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Manager appraisal submitted successfully' });
    } catch (err) {
        console.error('submitManagerAppraisal error:', err.message, err.stack);
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to submit appraisal: ' + err.message });
    } finally {
        client.release();
    }
};

const respondToAppraisal = async (req, res) => {
    const { appraisal_id, comment } = req.body;

    if (!appraisal_id || !comment) {
        return res.status(400).json({ error: 'appraisal_id and comment are required' });
    }

    try {
        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const result = await pool.query(
            `UPDATE manager_appraisals 
             SET employee_comment = $1, employee_comment_at = NOW()
             WHERE id = $2 AND employee_id = $3
             RETURNING *`,
            [comment, appraisal_id, employee.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appraisal not found or not authorized' });
        }

        res.json({ message: 'Response submitted successfully', appraisal: result.rows[0] });
    } catch (err) {
        console.error('respondToAppraisal error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const submitPeerFeedback = async (req, res) => {
    const { cycle_id, employee_id, rating, comment, is_anonymous = false } = req.body;

    if (!cycle_id || !employee_id || typeof rating !== 'number') {
        return res.status(400).json({ error: 'cycle_id, employee_id and rating are required' });
    }

    try {
        const reviewer = await resolveEmployee(req);
        if (!reviewer) return res.status(404).json({ error: 'Reviewer not found' });
        if (reviewer.id === employee_id) {
            return res.status(400).json({ error: 'Self peer-feedback is not allowed' });
        }

        const result = await pool.query(
            `INSERT INTO peer_feedback (cycle_id, employee_id, reviewer_id, rating, comment, is_anonymous)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (cycle_id, employee_id, reviewer_id)
             DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, is_anonymous = EXCLUDED.is_anonymous, created_at = NOW()
             RETURNING *`,
            [cycle_id, employee_id, reviewer.id, rating, comment || null, is_anonymous]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('submitPeerFeedback error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getPeerFeedback = async (req, res) => {
    const { cycle_id, employee_id } = req.query;

    if (!cycle_id || !employee_id) {
        return res.status(400).json({ error: 'cycle_id and employee_id are required' });
    }

    try {
        const me = await resolveEmployee(req);
        if (!me) return res.status(404).json({ error: 'Employee not found' });

        const allowed = ['hr', 'admin', 'Super Admin'].includes(req.user.role) || me.id === employee_id || await isManagerOf(me.id, employee_id);
        if (!allowed) return res.status(403).json({ error: 'Forbidden' });

        const result = await pool.query(
            `SELECT pf.id, pf.rating, pf.comment, pf.is_anonymous, pf.created_at,
                    CASE WHEN pf.is_anonymous = TRUE AND $3 NOT IN ('hr', 'admin') THEN 'Anonymous'
                         ELSE e.full_name END AS reviewer_name
             FROM peer_feedback pf
             JOIN employees e ON e.id = pf.reviewer_id
             WHERE pf.cycle_id = $1 AND pf.employee_id = $2
             ORDER BY pf.created_at DESC`,
            [cycle_id, employee_id, req.user.role]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getPeerFeedback error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getHRDashboard = async (req, res) => {
    try {
        const cycles = await pool.query('SELECT * FROM appraisal_cycles ORDER BY start_date DESC');
        
        const allEmployees = await pool.query(
            `SELECT id, full_name, email, department_id, role, status
             FROM employees 
             ORDER BY full_name`
        );



        const rows = await pool.query(
            `WITH goal_stats AS (
                SELECT cycle_id, employee_id, COUNT(*)::int AS goals_count
                FROM goals
                GROUP BY cycle_id, employee_id
            ),
            self_stats AS (
                SELECT sa.cycle_id, sa.employee_id, sa.id AS sa_id,
                       ROUND(AVG(sai.rating)::numeric, 2) AS self_avg
                FROM self_appraisals sa
                LEFT JOIN self_appraisal_items sai ON sai.self_appraisal_id = sa.id
                GROUP BY sa.cycle_id, sa.employee_id, sa.id
            ),
            manager_stats AS (
                SELECT ma.cycle_id, ma.employee_id, ma.id AS ma_id,
                       ROUND(AVG(mai.rating)::numeric, 2) AS manager_avg
                FROM manager_appraisals ma
                LEFT JOIN manager_appraisal_items mai ON mai.manager_appraisal_id = ma.id
                GROUP BY ma.cycle_id, ma.employee_id, ma.id
            )
            SELECT ap.cycle_id,
                    e.id AS employee_id,
                    e.full_name,
                    COALESCE(gs.goals_count, 0) AS goals_count,
                    CASE WHEN ss.sa_id IS NULL THEN FALSE ELSE TRUE END AS self_submitted,
                    CASE WHEN ms.ma_id IS NULL THEN FALSE ELSE TRUE END AS manager_submitted,
                    ss.self_avg,
                    ms.manager_avg
             FROM appraisal_participants ap
             JOIN employees e ON e.id = ap.employee_id
             LEFT JOIN goal_stats gs ON gs.cycle_id = ap.cycle_id AND gs.employee_id = e.id
             LEFT JOIN self_stats ss ON ss.cycle_id = ap.cycle_id AND ss.employee_id = e.id
             LEFT JOIN manager_stats ms ON ms.cycle_id = ap.cycle_id AND ms.employee_id = e.id
             ORDER BY e.full_name ASC`
        );

        const byCycle = cycles.rows.map((cycle) => {
            const employees = rows.rows
                .filter((r) => r.cycle_id === cycle.id)
                .map((r) => {
                    const values = [r.self_avg, r.manager_avg].filter((v) => v !== null);
                    const avg_score = values.length ? Number((values.reduce((a, b) => a + Number(b), 0) / values.length).toFixed(2)) : null;
                    return {
                        employee_id: r.employee_id,
                        full_name: r.full_name,
                        goals_count: r.goals_count,
                        self_submitted: r.self_submitted,
                        manager_submitted: r.manager_submitted,
                        self_avg: r.self_avg,
                        manager_avg: r.manager_avg,
                        avg_score
                    };
                });

            return {
                ...cycle,
                employee_count: employees.length,
                employees
            };
        });


        res.json({
            dashboard: byCycle,
            all_employees: allEmployees.rows
        });
    } catch (err) {
        console.error('getHRDashboard error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMyOverview = async (req, res) => {
    try {
        const me = await resolveEmployee(req);
        if (!me) return res.status(404).json({ error: 'Employee not found' });

        const cycleRes = await pool.query(
            `SELECT c.* FROM appraisal_cycles c
             JOIN appraisal_participants ap ON ap.cycle_id = c.id
             WHERE ap.employee_id = $1 AND c.status = 'active'
             ORDER BY c.start_date DESC
             LIMIT 1`,
            [me.id]
        );

        if (cycleRes.rows.length === 0) {
            return res.json({ current_cycle: null, goals: [], self_appraisal: null, manager_appraisal: null, peer_feedback: [], is_manager: false, team: [] });
        }

        const cycle = cycleRes.rows[0];

        const goals = await pool.query(
            'SELECT * FROM goals WHERE cycle_id = $1 AND employee_id = $2 ORDER BY created_at DESC',
            [cycle.id, me.id]
        );

        // Fetch self appraisal main record
        const selfAppraisalRes = await pool.query(
            `SELECT * FROM self_appraisals
             WHERE cycle_id = $1 AND employee_id = $2
             LIMIT 1`,
            [cycle.id, me.id]
        );
        
        let selfAppraisal = null;
        if (selfAppraisalRes.rows.length > 0) {
            const sa = selfAppraisalRes.rows[0];
            const selfItems = await pool.query(
                `SELECT goal_id, rating, comment FROM self_appraisal_items
                 WHERE self_appraisal_id = $1
                 ORDER BY created_at DESC`,
                [sa.id]
            );
            selfAppraisal = {
                ...sa,
                items: selfItems.rows.map(item => ({
                    goal_id: item.goal_id,
                    rating: item.rating,
                    comment: item.comment
                }))
            };
        }

        // Fetch manager appraisal main record
        const managerAppraisalRes = await pool.query(
            `SELECT ma.*, m.full_name AS manager_name
             FROM manager_appraisals ma
             LEFT JOIN employees m ON m.id = ma.manager_id
             WHERE ma.cycle_id = $1 AND ma.employee_id = $2
             ORDER BY ma.submitted_at DESC
             LIMIT 1`,
            [cycle.id, me.id]
        );
        
        let managerAppraisal = null;
        if (managerAppraisalRes.rows.length > 0) {
            const ma = managerAppraisalRes.rows[0];
            const managerItems = await pool.query(
                `SELECT goal_id, rating, comment FROM manager_appraisal_items
                 WHERE manager_appraisal_id = $1
                 ORDER BY created_at DESC`,
                [ma.id]
            );
            managerAppraisal = {
                ...ma,
                items: managerItems.rows.map(item => ({
                    goal_id: item.goal_id,
                    rating: item.rating,
                    comment: item.comment
                }))
            };
        }

        const isManager = await hasDirectReports(me.id);
        let team = [];
        let teamGoals = {};
        if (isManager) {
            const teamRes = await pool.query(
                `SELECT e.id, e.full_name,
                        CASE WHEN sa.id IS NULL THEN FALSE ELSE TRUE END AS self_submitted,
                        CASE WHEN ma.id IS NULL THEN FALSE ELSE TRUE END AS manager_submitted,
                        ROUND(AVG(sai.rating)::numeric, 2) AS self_avg,
                        ROUND(AVG(mai.rating)::numeric, 2) AS manager_avg
                 FROM employees e
                 LEFT JOIN self_appraisals sa ON sa.employee_id = e.id AND sa.cycle_id = $1
                 LEFT JOIN self_appraisal_items sai ON sai.self_appraisal_id = sa.id
                 LEFT JOIN manager_appraisals ma ON ma.employee_id = e.id AND ma.cycle_id = $1 AND ma.manager_id = $2
                 LEFT JOIN manager_appraisal_items mai ON mai.manager_appraisal_id = ma.id
                 WHERE e.reporting_manager_id = $2
                 GROUP BY e.id, e.full_name, sa.id, ma.id
                 ORDER BY e.full_name`,
                [cycle.id, me.id]
            );
            team = teamRes.rows;

            if (team.length > 0) {
                const goalRes = await pool.query(
                    `SELECT id, employee_id, title, description, target, progress
                     FROM goals
                     WHERE cycle_id = $1 AND employee_id = ANY($2::uuid[])
                     ORDER BY created_at DESC`,
                    [cycle.id, team.map((t) => t.id)]
                );

                teamGoals = goalRes.rows.reduce((acc, row) => {
                    if (!acc[row.employee_id]) acc[row.employee_id] = [];
                    acc[row.employee_id].push(row);
                    return acc;
                }, {});
            }
        }

                res.json({
            current_cycle: cycle,
            goals: goals.rows,
            self_appraisal: selfAppraisal || null,
            manager_appraisal: managerAppraisal || null,
            is_manager: isManager,
            team,
            team_goals: teamGoals
        });
    } catch (err) {
        console.error('getMyOverview error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createCycle,
    updateCycleStatus,
    getCycles,
    createGoal,
    updateGoalProgress,
    getGoals,
    submitSelfAppraisal,
    submitManagerAppraisal,
    submitPeerFeedback,
    getPeerFeedback,
    respondToAppraisal,
    addParticipant,
    getHRDashboard,
    getMyOverview
};
