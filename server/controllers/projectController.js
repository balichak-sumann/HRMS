const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const getIstTodayYmd = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
};

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
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Project name is required' });
    }
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

// ─── Update a project (HR/Admin) ─────────────────────────────────
const updateProject = async (req, res) => {
    const { name, client, deadline, status } = req.body;
    try {
        const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        const updates = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { updates.push(`name = $${idx}`); values.push(name); idx++; }
        if (client !== undefined) { updates.push(`client = $${idx}`); values.push(client); idx++; }
        if (deadline !== undefined) { updates.push(`deadline = $${idx}`); values.push(deadline || null); idx++; }
        if (status !== undefined) { updates.push(`status = $${idx}`); values.push(status); idx++; }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

        values.push(req.params.id);
        const result = await pool.query(
            `UPDATE projects SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Delete a project (HR/Admin) ─────────────────────────────────
const deleteProject = async (req, res) => {
    try {
        const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        // Delete related data first
        await pool.query('DELETE FROM project_members WHERE project_id = $1', [req.params.id]);
        await pool.query('DELETE FROM daily_report_tasks WHERE project_id = $1', [req.params.id]);
        await pool.query('DELETE FROM daily_reports WHERE project_id = $1', [req.params.id]);
        await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);

        res.json({ message: 'Project deleted successfully' });
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

// ─── Create a single task (immediately visible to team) ──────────
const createReportTask = async (req, res) => {
    const { title } = req.body;
    if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Task title is required' });
    }

    try {
        const projectCheck = await pool.query('SELECT id, status FROM projects WHERE id = $1', [req.params.id]);
        if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        const pStatus = String(projectCheck.rows[0].status || '').toLowerCase();
        if (['completed', 'closed', 'cancelled'].includes(pStatus)) {
            return res.status(400).json({ error: `Cannot add tasks to a ${pStatus} project` });
        }

        const employeeId = req.user.employee_uuid || req.user.id;
        const today = getIstTodayYmd();

        const result = await pool.query(
            "INSERT INTO daily_report_tasks (project_id, employee_id, date, title) VALUES ($1, $2, $3, $4) RETURNING *",
            [req.params.id, employeeId, today, String(title).trim()]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update a task (time_spent, status, or title) ────────────────
const updateReportTask = async (req, res) => {
    const { taskId } = req.params;
    const { title, time_spent, status } = req.body;

    try {
        const employeeId = req.user.employee_uuid || req.user.id;
        const today = getIstTodayYmd();

        // Verify ownership and same day
        const existing = await pool.query(
            'SELECT * FROM daily_report_tasks WHERE id = $1',
            [taskId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

        const task = existing.rows[0];
        const rawDate = task.date;
        let taskDate;
        if (rawDate instanceof Date) {
            taskDate = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`;
        } else {
            taskDate = String(rawDate || '').slice(0, 10);
        }

        // Only the owner can edit, and only on the same day (unless HR/admin)
        const isOwner = String(task.employee_id) === String(employeeId);
        const isHrAdmin = ['hr', 'admin'].includes(req.user.role);

        if (!isOwner && !isHrAdmin) {
            return res.status(403).json({ error: 'You can only edit your own tasks' });
        }
        if (!isHrAdmin && taskDate !== today) {
            return res.status(400).json({ error: 'Cannot edit tasks from previous days' });
        }

        const updates = [];
        const values = [];
        let idx = 1;

        if (title !== undefined) { updates.push(`title = $${idx}`); values.push(String(title).trim()); idx++; }
        if (time_spent !== undefined) { updates.push(`time_spent = $${idx}`); values.push(Number(time_spent) || null); idx++; }
        if (status !== undefined) {
            const valid = ['Finished', 'In Progress', 'Partially Finished'];
            if (!valid.includes(status)) return res.status(400).json({ error: `Status must be: ${valid.join(', ')}` });
            updates.push(`status = $${idx}`); values.push(status); idx++;
        }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

        values.push(taskId);
        const result = await pool.query(
            `UPDATE daily_report_tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Delete a task (same day only) ───────────────────────────────
const deleteReportTask = async (req, res) => {
    const { taskId } = req.params;
    try {
        const employeeId = req.user.employee_uuid || req.user.id;
        const today = getIstTodayYmd();

        const existing = await pool.query('SELECT * FROM daily_report_tasks WHERE id = $1', [taskId]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

        const task = existing.rows[0];
        const rawDate = task.date;
        let taskDate;
        if (rawDate instanceof Date) {
            taskDate = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`;
        } else {
            taskDate = String(rawDate || '').slice(0, 10);
        }
        const isOwner = String(task.employee_id) === String(employeeId);
        const isHrAdmin = ['hr', 'admin'].includes(req.user.role);

        if (!isOwner && !isHrAdmin) return res.status(403).json({ error: 'Access denied' });
        if (!isHrAdmin && taskDate !== today) return res.status(400).json({ error: 'Cannot delete tasks from previous days' });

        await pool.query('DELETE FROM daily_report_tasks WHERE id = $1', [taskId]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get tasks for a project (team view) ─────────────────────────
const getReportTasks = async (req, res) => {
    try {
        const { date } = req.query;
        const role = req.user.role;
        const isHrAdmin = ['hr', 'admin'].includes(role);

        let query = `
            SELECT t.*, COALESCE(e.full_name, 'Unknown') as full_name
            FROM daily_report_tasks t
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE t.project_id = $1
        `;
        const params = [req.params.id];

        if (!isHrAdmin) {
            const targetDate = date || getIstTodayYmd();
            params.push(targetDate);
            query += ` AND t.date = $${params.length}`;
        } else if (date) {
            params.push(date);
            query += ` AND t.date = $${params.length}`;
        }

        query += ' ORDER BY t.date DESC, t.created_at ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get reports for a project (team view — today only for employees, all for HR/admin) ──
const getProjectReports = async (req, res) => {
    try {
        const { date } = req.query;
        const role = req.user.role;
        const isHrOrAdmin = ['hr', 'admin'].includes(role);

        let query = `
            SELECT r.*, 
                   COALESCE(e.full_name, 'Unknown Employee') as full_name 
            FROM daily_reports r
            LEFT JOIN employees e ON r.employee_id = e.id
            WHERE r.project_id = $1
        `;
        const params = [req.params.id];

        if (!isHrOrAdmin) {
            // Employees can only see today's reports
            const today = date || getIstTodayYmd();
            params.push(today);
            query += ` AND r.date = $${params.length}`;
        } else if (date) {
            params.push(date);
            query += ` AND r.date = $${params.length}`;
        }

        query += ' ORDER BY r.date DESC, r.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
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

// ─── Add Project Member ──────────────────────────────────────────
const addProjectMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id, role } = req.body;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        await pool.query(
            `INSERT INTO project_members (project_id, employee_id, role)
             VALUES ($1, $2, $3)`,
            [id, employee_id, role || 'member']
        );

        res.json({ message: 'Member added successfully' });
    } catch (err) {
        if (err?.code === '23505') {
            return res.status(400).json({ error: 'Member already exists in this project' });
        }
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Remove Project Member ───────────────────────────────────────
const removeProjectMember = async (req, res) => {
    try {
        const { id, employeeId } = req.params;

        await pool.query(
            'DELETE FROM project_members WHERE project_id = $1 AND employee_id = $2',
            [id, employeeId]
        );

        res.json({ message: 'Member removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    closeProject,
    reopenProject,
    getProjectById,
    createTask,
    createReport: createReportTask,
    getProjectReports,
    getMyReports,
    addProjectMember,
    removeProjectMember,
    createReportTask,
    updateReportTask,
    deleteReportTask,
    getReportTasks
};
