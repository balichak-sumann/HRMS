const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── GET all projects (HR) or assigned projects (Employee) ────────
const getProjects = async (req, res) => {
    try {
        let query;
        let params = [];

        if (['hr', 'admin'].includes(req.user.role)) {
            query = `
                SELECT p.* 
                FROM projects p
                ORDER BY p.deadline ASC
            `;
        } else {
            query = `
                SELECT p.* 
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                WHERE pm.employee_id = $1
                ORDER BY p.deadline ASC
            `;
            // Use the employee table UUID to match project_members
            params = [req.user.employee_uuid || req.user.employee_id];
        }

        const result = await pool.query(query, params);
        
        // Fetch team members for each project
        const projects = await Promise.all(
            result.rows.map(async (project) => {
                const membersRes = await pool.query(
                    `SELECT e.full_name FROM project_members pm 
                     JOIN employees e ON pm.employee_id = e.id 
                     WHERE pm.project_id = $1`,
                    [project.id]
                );
                return {
                    ...project,
                    team_names: membersRes.rows.map(m => m.full_name)
                };
            })
        );
        
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create a new project (HR Only) ──────────────────────────────
const createProject = async (req, res) => {
    const { name, client, deadline, team } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO projects (name, client, deadline) VALUES ($1, $2, $3) RETURNING *",
            [name, client, deadline]
        );
        const project = result.rows[0];

        // Add team members
        if (team && team.length > 0) {
            for (const emp_id of team) {
                await pool.query(
                    "INSERT INTO project_members (project_id, employee_id) VALUES ($1, $2)",
                    [project.id, emp_id]
                );
            }
        }

        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Close a project (HR/Admin) ─────────────────────────────────
const closeProject = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE projects
             SET status = 'Completed'
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Reopen a project (HR/Admin) ────────────────────────────────
const reopenProject = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE projects
             SET status = 'Active'
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get project details with tasks and team ─────────────────────
const getProjectById = async (req, res) => {
    try {
        const project = await pool.query("SELECT * FROM projects WHERE id = $1", [req.params.id]);
        if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        const members = await pool.query(`
            SELECT e.id, e.full_name, e.department, pm.role 
            FROM project_members pm
            JOIN employees e ON pm.employee_id = e.id
            WHERE pm.project_id = $1
        `, [req.params.id]);

        const tasks = await pool.query("SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC", [req.params.id]);

        res.json({
            ...project.rows[0],
            members: members.rows,
            tasks: tasks.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create a task for a project ─────────────────────────────────
const createTask = async (req, res) => {
    const { title, assignee_id, status } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO tasks (project_id, title, assignee_id, status) VALUES ($1, $2, $3, $4) RETURNING *",
            [req.params.id, title, assignee_id, status || 'todo']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Submit daily report (Employee) ──────────────────────────────
const createReport = async (req, res) => {
    const { work_done, hours, blockers } = req.body;
    try {
        const projectRes = await pool.query(
            `SELECT id, name, status
             FROM projects
             WHERE id = $1
             LIMIT 1`,
            [req.params.id]
        );

        if (projectRes.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const projectStatus = String(projectRes.rows[0].status || '').trim().toLowerCase();
        if (projectStatus && projectStatus !== 'active') {
            return res.status(400).json({ error: 'Project is closed. Daily reports are disabled for closed projects.' });
        }

        const result = await pool.query(
            "INSERT INTO daily_reports (project_id, employee_id, work_done, hours, blockers) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [req.params.id, req.user.employee_uuid || req.user.id, work_done, hours, blockers]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get reports for a project ───────────────────────────────────
const getProjectReports = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   COALESCE(
                       e.full_name, 
                       (SELECT e2.full_name FROM employees e2 JOIN profiles p ON e2.email = p.email WHERE p.id = r.employee_id LIMIT 1),
                       'Unknown Employee'
                   ) as full_name 
            FROM daily_reports r
            LEFT JOIN employees e ON r.employee_id = e.id
            WHERE r.project_id = $1
            ORDER BY r.created_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Add employee to project ──────────────────────────────────
const addProjectMember = async (req, res) => {
    const { employee_id } = req.body;

    if (!employee_id) {
        return res.status(400).json({ error: 'employee_id is required' });
    }

    try {
        const projectRes = await pool.query(
            `SELECT id FROM projects WHERE id = $1 LIMIT 1`,
            [req.params.id]
        );
        if (projectRes.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const employeeRes = await pool.query(
            `SELECT id, full_name, department FROM employees WHERE id = $1 LIMIT 1`,
            [employee_id]
        );
        if (employeeRes.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const existing = await pool.query(
            `SELECT project_id, employee_id FROM project_members WHERE project_id = $1 AND employee_id = $2 LIMIT 1`,
            [req.params.id, employee_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Employee is already a project member' });
        }

        await pool.query(
            `INSERT INTO project_members (project_id, employee_id) VALUES ($1, $2)`,
            [req.params.id, employee_id]
        );

        res.json({ success: true, full_name: employeeRes.rows[0].full_name });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Remove employee from project ──────────────────────────────
const removeProjectMember = async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM project_members WHERE project_id = $1 AND employee_id = $2 RETURNING project_id, employee_id`,
            [req.params.id, req.params.employeeId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project member not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get user's own report history ───────────────────────────────
const getMyReports = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, p.name as project_name
            FROM daily_reports r
            JOIN projects p ON r.project_id = p.id
            WHERE r.employee_id = $1
            ORDER BY r.created_at DESC
        `, [req.user.employee_uuid || req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getProjects,
    createProject,
    closeProject,
    reopenProject,
    getProjectById,
    createTask,
    addProjectMember,
    removeProjectMember,
    createReport,
    getProjectReports,
    getMyReports
};
