const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let departmentColumnsEnsured = false;

const ensureDepartmentColumns = async () => {
    if (departmentColumnsEnsured) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS departments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id) ON DELETE SET NULL;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID;

        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints
                WHERE constraint_name = 'employees_department_id_fkey'
                  AND table_name = 'employees'
            ) THEN
                ALTER TABLE employees
                ADD CONSTRAINT employees_department_id_fkey
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
            END IF;
        END $$;

        UPDATE employees
        SET manager_id = reporting_manager_id
        WHERE manager_id IS NULL
          AND reporting_manager_id IS NOT NULL;

        UPDATE employees
        SET reporting_manager_id = manager_id
        WHERE reporting_manager_id IS NULL
          AND manager_id IS NOT NULL;
    `);
    departmentColumnsEnsured = true;
};

const getDepartments = async (req, res) => {
    try {
        await ensureDepartmentColumns();
        const result = await pool.query(
            `SELECT d.id,
                    d.name,
                    d.description,
                    d.created_at,
                    d.updated_at,
                    COUNT(e.id)::int AS employee_count
             FROM departments d
             LEFT JOIN employees e ON e.department_id = d.id
             GROUP BY d.id
             ORDER BY d.name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getDepartments error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const createDepartment = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Department name is required' });
    }

    try {
        await ensureDepartmentColumns();
        const result = await pool.query(
            `INSERT INTO departments (name, description)
             VALUES ($1, $2)
             RETURNING *`,
            [String(name).trim(), description || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Department name already exists' });
        }
        console.error('createDepartment error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Department name is required' });
    }

    try {
        await ensureDepartmentColumns();
        const existing = await pool.query('SELECT id, name FROM departments WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const result = await pool.query(
            `UPDATE departments
             SET name = $1, description = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [String(name).trim(), description || null, id]
        );

        const previousName = existing.rows[0].name;
        const nextName = result.rows[0].name;
        if (previousName !== nextName) {
            await pool.query(
                `UPDATE employees
                 SET department = $1, updated_at = NOW()
                 WHERE department_id = $2`,
                [nextName, id]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Department name already exists' });
        }
        console.error('updateDepartment error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteDepartment = async (req, res) => {
    const { id } = req.params;

    try {
        await ensureDepartmentColumns();

        const usage = await pool.query(
            'SELECT COUNT(*)::int AS count FROM employees WHERE department_id = $1',
            [id]
        );

        if ((usage.rows[0]?.count || 0) > 0) {
            return res.status(400).json({ error: 'Cannot delete department with assigned employees' });
        }

        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('deleteDepartment error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getOrgChart = async (req, res) => {
    const { department_id } = req.query;

    try {
        await ensureDepartmentColumns();

        const departmentsRes = await pool.query(
            `SELECT id, name, description
             FROM departments
             ORDER BY name ASC`
        );

        const params = [];
        let whereSql = '';
        if (department_id) {
            params.push(department_id);
            whereSql = 'WHERE e.department_id = $1';
        }

        const employeesRes = await pool.query(
            `SELECT e.id,
                    e.full_name,
                    e.email,
                    e.phone,
                    e.designation,
                    e.role,
                    e.status,
                    e.avatar_url,
                    e.joining_date,
                    e.department_id,
                    COALESCE(d.name, e.department, 'Unassigned') AS department_name,
                    COALESCE(e.manager_id, e.reporting_manager_id) AS manager_id,
                    m.full_name AS manager_name
             FROM employees e
             LEFT JOIN departments d ON d.id = e.department_id
             LEFT JOIN employees m ON m.id = COALESCE(e.manager_id, e.reporting_manager_id)
             ${whereSql}
             ORDER BY e.full_name ASC`,
            params
        );

        res.json({
            departments: departmentsRes.rows,
            employees: employeesRes.rows
        });
    } catch (err) {
        console.error('getOrgChart error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateEmployeeOrgInfo = async (req, res) => {
    const { id } = req.params;
    const { department_id, manager_id } = req.body;

    if (manager_id && manager_id === id) {
        return res.status(400).json({ error: 'Employee cannot report to self' });
    }

    const client = await pool.connect();
    try {
        await ensureDepartmentColumns();
        await client.query('BEGIN');

        let departmentName = 'Unassigned';
        let departmentIdToSet = null;

        if (department_id) {
            const dep = await client.query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
            if (dep.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Department not found' });
            }
            departmentIdToSet = dep.rows[0].id;
            departmentName = dep.rows[0].name;
        }

        if (manager_id) {
            const managerCheck = await client.query('SELECT id FROM employees WHERE id = $1', [manager_id]);
            if (managerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Manager not found' });
            }
        }

        const updated = await client.query(
            `UPDATE employees
             SET department_id = $1,
                 department = $2,
                 manager_id = $3,
                 reporting_manager_id = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [departmentIdToSet, departmentName, manager_id || null, id]
        );

        if (updated.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('updateEmployeeOrgInfo error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getOrgChart,
    updateEmployeeOrgInfo
};
