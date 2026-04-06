const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



const SECTION_CODES = ['80C', 'HRA', 'HOME_LOAN_INTEREST', 'STANDARD_DEDUCTION', 'OTHER'];

const toNumber = (value, defaultValue = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

const getFinancialYearWindow = (years = 6) => {
    const current = getCurrentFinancialYear();
    const currentStart = Number(current.split('-')[0]);
    const options = [];
    for (let i = 0; i < years; i += 1) {
        const start = currentStart - i;
        options.push(`${start}-${start + 1}`);
    }
    return options;
};

const normalizeFinancialYear = (value) => {
    if (!value) return getCurrentFinancialYear();
    const text = String(value).trim();
    const match = text.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
    if (!match) throw new Error('financial_year must be in YYYY-YYYY format');
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (end !== start + 1) throw new Error('financial_year must be in YYYY-YYYY format');

    const allowed = getFinancialYearWindow(6);
    const normalized = `${start}-${end}`;
    if (!allowed.includes(normalized)) {
        throw new Error('financial_year must be current year or one of last 5 years');
    }

    return normalized;
};

const getFinancialYearFromPayrollMonth = (monthRaw, yearRaw) => {
    const year = Number(yearRaw);
    if (!Number.isInteger(year)) throw new Error('Invalid payroll year');

    const normalized = String(monthRaw || '').trim().toLowerCase();
    const map = {
        january: 1,
        february: 2,
        march: 3,
        april: 4,
        may: 5,
        june: 6,
        july: 7,
        august: 8,
        september: 9,
        october: 10,
        november: 11,
        december: 12,
        jan: 1,
        feb: 2,
        mar: 3,
        apr: 4,
        jun: 6,
        jul: 7,
        aug: 8,
        sep: 9,
        sept: 9,
        oct: 10,
        nov: 11,
        dec: 12,
    };

    const monthNumber = Number(monthRaw);
    const month = Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12
        ? monthNumber
        : map[normalized];

    if (!month) throw new Error('Invalid payroll month');

    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};



const getActorEmployeeId = async (req, client = pool) => {
    if (req.user?.employee_uuid) return req.user.employee_uuid;

    if (req.user?.email) {
        const result = await client.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
        if (result.rows[0]) return result.rows[0].id;
    }

    return null;
};

const getOrCreateDeclaration = async (client, employeeId, financialYear) => {
    const existing = await client.query(
        `SELECT *
         FROM income_tax_declarations
         WHERE employee_id = $1 AND financial_year = $2
         ORDER BY version DESC, created_at DESC
         LIMIT 1`,
        [employeeId, financialYear]
    );

    if (existing.rows[0]) return existing.rows[0];

    const created = await client.query(
        `INSERT INTO income_tax_declarations (employee_id, financial_year, version, status, updated_at)
         VALUES ($1, $2, 1, 'draft', NOW())
         RETURNING *`,
        [employeeId, financialYear]
    );

    return created.rows[0];
};

const getDeclarationByIdForEmployee = async (client, employeeId, declarationId) => {
    const result = await client.query(
        `SELECT *
         FROM income_tax_declarations
         WHERE id = $1
           AND employee_id = $2
         LIMIT 1`,
        [declarationId, employeeId]
    );

    return result.rows[0] || null;
};

const createDeclarationVersion = async (client, employeeId, financialYear) => {
    const nextVersionRes = await client.query(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
         FROM income_tax_declarations
         WHERE employee_id = $1 AND financial_year = $2`,
        [employeeId, financialYear]
    );

    const nextVersion = Number(nextVersionRes.rows[0]?.next_version || 1);
    const created = await client.query(
        `INSERT INTO income_tax_declarations (employee_id, financial_year, version, status, updated_at)
         VALUES ($1, $2, $3, 'draft', NOW())
         RETURNING *`,
        [employeeId, financialYear, nextVersion]
    );

    return created.rows[0];
};

const getDeclarationWithItems = async (client, declarationId) => {
    const declarationRes = await client.query(
        `SELECT d.*, e.full_name AS employee_name, e.email AS employee_email, e.department AS employee_department
         FROM income_tax_declarations d
         JOIN employees e ON e.id = d.employee_id
         WHERE d.id = $1
         LIMIT 1`,
        [declarationId]
    );

    if (declarationRes.rows.length === 0) return null;

    const itemsRes = await client.query(
        `SELECT i.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', p.id,
                            'file_path', p.file_path,
                            'file_name', p.file_name,
                            'file_size', p.file_size,
                            'created_at', p.created_at
                        )
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'
                ) AS proofs
         FROM income_tax_declaration_items i
         LEFT JOIN income_tax_declaration_proofs p ON p.item_id = i.id
         WHERE i.declaration_id = $1
         GROUP BY i.id
         ORDER BY i.created_at ASC`,
        [declarationId]
    );

    return {
        ...declarationRes.rows[0],
        items: itemsRes.rows,
    };
};

const getMyDeclaration = async (req, res) => {
    const client = await pool.connect();

    try {


        const employeeId = await getActorEmployeeId(req, client);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const financialYear = normalizeFinancialYear(req.query.financial_year);
        const declarationId = req.query.declaration_id ? String(req.query.declaration_id) : null;

        let declaration;
        if (declarationId) {
            declaration = await getDeclarationByIdForEmployee(client, employeeId, declarationId);
            if (!declaration) return res.status(404).json({ error: 'Declaration not found' });
            if (declaration.financial_year !== financialYear) {
                return res.status(400).json({ error: 'Declaration does not belong to requested financial year' });
            }
        } else {
            declaration = await getOrCreateDeclaration(client, employeeId, financialYear);
        }

        const details = await getDeclarationWithItems(client, declaration.id);

        res.json(details);
    } catch (err) {
        console.error('getMyDeclaration error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getMyDeclarationsList = async (req, res) => {
    try {


        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const financialYear = normalizeFinancialYear(req.query.financial_year);

        const result = await pool.query(
            `SELECT d.id,
                    d.financial_year,
                    d.version,
                    d.status,
                    d.submitted_at,
                    d.reviewed_at,
                    d.updated_at,
                    COUNT(i.id)::int AS total_items
             FROM income_tax_declarations d
             LEFT JOIN income_tax_declaration_items i ON i.declaration_id = d.id
             WHERE d.employee_id = $1
               AND d.financial_year = $2
             GROUP BY d.id
             ORDER BY d.version DESC`,
            [employeeId, financialYear]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getMyDeclarationsList error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

const createMyDeclarationVersion = async (req, res) => {
    const client = await pool.connect();

    try {


        const employeeId = await getActorEmployeeId(req, client);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const financialYear = normalizeFinancialYear(req.body.financial_year || req.query.financial_year);

        await client.query('BEGIN');
        const declaration = await createDeclarationVersion(client, employeeId, financialYear);
        await client.query('COMMIT');

        const details = await getDeclarationWithItems(pool, declaration.id);
        res.status(201).json(details);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('createMyDeclarationVersion rollback error:', rollbackErr.message);
        }

        console.error('createMyDeclarationVersion error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const saveMyDeclaration = async (req, res) => {
    const client = await pool.connect();

    try {


        const employeeId = await getActorEmployeeId(req, client);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const financialYear = normalizeFinancialYear(req.body.financial_year || req.query.financial_year);
        const declarationId = req.body.declaration_id || req.query.declaration_id;
        const items = Array.isArray(req.body.items) ? req.body.items : [];

        await client.query('BEGIN');

        let declaration;
        if (declarationId) {
            declaration = await getDeclarationByIdForEmployee(client, employeeId, declarationId);
            if (!declaration) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Declaration not found' });
            }
            if (declaration.financial_year !== financialYear) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Declaration does not belong to requested financial year' });
            }
        } else {
            declaration = await getOrCreateDeclaration(client, employeeId, financialYear);
        }

        if (declaration.status === 'reviewed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Reviewed declaration cannot be edited' });
        }

        for (const item of items) {
            const sectionCode = String(item.section_code || '').trim();
            const itemLabel = String(item.item_label || '').trim();
            const declaredAmount = Math.max(0, toNumber(item.declared_amount));

            if (!SECTION_CODES.includes(sectionCode)) continue;
            if (!itemLabel) continue;

            if (item.id) {
                const updated = await client.query(
                    `UPDATE income_tax_declaration_items
                     SET section_code = $1,
                         item_label = $2,
                         declared_amount = $3,
                         approved_amount = NULL,
                         status = 'pending',
                         hr_comment = NULL,
                         updated_at = NOW()
                     WHERE id = $4
                       AND declaration_id = $5
                     RETURNING id`,
                    [sectionCode, itemLabel, declaredAmount, item.id, declaration.id]
                );

                if (updated.rows.length === 0) {
                    await client.query(
                        `INSERT INTO income_tax_declaration_items (
                            declaration_id, section_code, item_label, declared_amount, status, updated_at
                        ) VALUES ($1, $2, $3, $4, 'pending', NOW())`,
                        [declaration.id, sectionCode, itemLabel, declaredAmount]
                    );
                }
            } else {
                await client.query(
                    `INSERT INTO income_tax_declaration_items (
                        declaration_id, section_code, item_label, declared_amount, status, updated_at
                    ) VALUES ($1, $2, $3, $4, 'pending', NOW())`,
                    [declaration.id, sectionCode, itemLabel, declaredAmount]
                );
            }
        }

        await client.query(
            `UPDATE income_tax_declarations
             SET status = 'draft',
                 submitted_at = NULL,
                 reviewed_at = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [declaration.id]
        );

        await client.query('COMMIT');

        const details = await getDeclarationWithItems(pool, declaration.id);
        res.json(details);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('saveMyDeclaration rollback error:', rollbackErr.message);
        }

        console.error('saveMyDeclaration error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const submitMyDeclaration = async (req, res) => {
    const client = await pool.connect();

    try {


        const employeeId = await getActorEmployeeId(req, client);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const financialYear = normalizeFinancialYear(req.body.financial_year || req.query.financial_year);
        const declarationId = req.body.declaration_id || req.query.declaration_id;

        await client.query('BEGIN');

        let declaration;
        if (declarationId) {
            declaration = await getDeclarationByIdForEmployee(client, employeeId, declarationId);
            if (!declaration) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Declaration not found' });
            }
            if (declaration.financial_year !== financialYear) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Declaration does not belong to requested financial year' });
            }
        } else {
            declaration = await getOrCreateDeclaration(client, employeeId, financialYear);
        }

        const itemCountRes = await client.query(
            'SELECT COUNT(*)::int AS count FROM income_tax_declaration_items WHERE declaration_id = $1',
            [declaration.id]
        );

        if (Number(itemCountRes.rows[0]?.count || 0) === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Add at least one declaration item before submission' });
        }

        await client.query(
            `UPDATE income_tax_declarations
             SET status = 'submitted',
                 submitted_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [declaration.id]
        );

        await client.query('COMMIT');

        const details = await getDeclarationWithItems(pool, declaration.id);
        res.json(details);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('submitMyDeclaration rollback error:', rollbackErr.message);
        }

        console.error('submitMyDeclaration error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const uploadProof = async (req, res) => {
    const client = await pool.connect();

    try {


        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const employeeId = await getActorEmployeeId(req, client);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const itemRes = await client.query(
            `SELECT i.id
             FROM income_tax_declaration_items i
             JOIN income_tax_declarations d ON d.id = i.declaration_id
             WHERE i.id = $1
               AND d.employee_id = $2
             LIMIT 1`,
            [req.params.itemId, employeeId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).json({ error: 'Declaration item not found' });
        }

        const created = await client.query(
            `INSERT INTO income_tax_declaration_proofs (item_id, file_path, file_name, file_size, uploaded_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.params.itemId, `/uploads/tax-declarations/${req.file.filename}`, req.file.originalname, req.file.size, employeeId]
        );

        res.status(201).json(created.rows[0]);
    } catch (err) {
        console.error('uploadProof error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getDeclarationsForHR = async (req, res) => {
    try {

        const financialYear = normalizeFinancialYear(req.query.financial_year);
        const status = req.query.status;

        const params = [financialYear];
        let where = 'WHERE d.financial_year = $1';

        if (status && status !== 'All') {
            params.push(status);
            where += ` AND d.status = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT d.id,
                    d.employee_id,
                    d.financial_year,
                    d.version,
                    d.status,
                    d.submitted_at,
                    d.reviewed_at,
                    d.updated_at,
                    e.full_name,
                    e.department,
                    COUNT(i.id)::int AS total_items,
                    COALESCE(SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END), 0)::int AS approved_items,
                    COALESCE(SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected_items,
                    COALESCE(SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END), 0)::int AS pending_items
             FROM income_tax_declarations d
             JOIN employees e ON e.id = d.employee_id
             LEFT JOIN income_tax_declaration_items i ON i.declaration_id = d.id
             ${where}
             GROUP BY d.id, e.full_name, e.department
             ORDER BY d.updated_at DESC, d.version DESC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getDeclarationsForHR error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

const getDeclarationDetailsForHR = async (req, res) => {
    try {


        const details = await getDeclarationWithItems(pool, req.params.id);
        if (!details) return res.status(404).json({ error: 'Declaration not found' });

        res.json(details);
    } catch (err) {
        console.error('getDeclarationDetailsForHR error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const reviewDeclarationItem = async (req, res) => {
    const client = await pool.connect();

    try {


        const { status, comment, approved_amount } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'status must be approved or rejected' });
        }

        await client.query('BEGIN');

        const itemRes = await client.query(
            `SELECT i.*, d.id AS declaration_id
             FROM income_tax_declaration_items i
             JOIN income_tax_declarations d ON d.id = i.declaration_id
             WHERE i.id = $1
             LIMIT 1`,
            [req.params.itemId]
        );

        if (itemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Declaration item not found' });
        }

        const item = itemRes.rows[0];
        const approvedAmount = status === 'approved'
            ? Math.max(0, toNumber(approved_amount, item.declared_amount))
            : 0;

        await client.query(
            `UPDATE income_tax_declaration_items
             SET status = $1,
                 approved_amount = $2,
                 hr_comment = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [status, approvedAmount, comment || null, item.id]
        );

        const pendingRes = await client.query(
            `SELECT COUNT(*)::int AS pending_count
             FROM income_tax_declaration_items
             WHERE declaration_id = $1
               AND status = 'pending'`,
            [item.declaration_id]
        );

        const pendingCount = Number(pendingRes.rows[0]?.pending_count || 0);

        await client.query(
            `UPDATE income_tax_declarations
             SET status = $1,
                 reviewed_at = CASE WHEN $1 = 'reviewed' THEN NOW() ELSE reviewed_at END,
                 updated_at = NOW()
             WHERE id = $2`,
            [pendingCount === 0 ? 'reviewed' : 'submitted', item.declaration_id]
        );

        await client.query('COMMIT');

        const details = await getDeclarationWithItems(pool, item.declaration_id);
        res.json(details);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('reviewDeclarationItem rollback error:', rollbackErr.message);
        }

        console.error('reviewDeclarationItem error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getApprovedDeclarationAmount = async (employeeId, financialYear, client = pool) => {
    const result = await client.query(
        `SELECT COALESCE(SUM(COALESCE(i.approved_amount, 0)), 0) AS approved_total
         FROM income_tax_declarations d
         JOIN income_tax_declaration_items i ON i.declaration_id = d.id
         WHERE d.employee_id = $1
           AND d.financial_year = $2
           AND i.status = 'approved'`,
        [employeeId, financialYear]
    );

    return Math.max(0, toNumber(result.rows[0]?.approved_total));
};

const getForm16SummaryCore = async (employeeId, financialYear, client = pool) => {
    const fy = normalizeFinancialYear(financialYear);
    const [fyStartYear, fyEndYear] = fy.split('-').map(Number);

    const employeeRes = await client.query(
        `SELECT id, full_name, email, department, role, pan
         FROM employees
         WHERE id = $1
         LIMIT 1`,
        [employeeId]
    );

    if (employeeRes.rows.length === 0) {
        throw new Error('Employee not found');
    }

    const payrollIncomeRes = await client.query(
        `SELECT COALESCE(SUM(gross_salary), 0) AS total_income,
                COALESCE(SUM(tds), 0) AS total_tds
         FROM payroll
         WHERE employee_id = $1
           AND (
                (year = $2 AND LOWER(TRIM(month)) IN ('april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'))
                OR
                (year = $3 AND LOWER(TRIM(month)) IN ('january', 'february', 'march'))
           )`,
        [employeeId, fyStartYear, fyEndYear]
    );

    const deductionsRes = await client.query(
        `SELECT i.section_code,
                i.item_label,
                COALESCE(i.approved_amount, 0) AS approved_amount
         FROM income_tax_declarations d
         JOIN income_tax_declaration_items i ON i.declaration_id = d.id
         WHERE d.employee_id = $1
           AND d.financial_year = $2
           AND i.status = 'approved'
         ORDER BY i.section_code, i.item_label`,
        [employeeId, fy]
    );

    const totalDeductions = deductionsRes.rows.reduce((sum, row) => sum + toNumber(row.approved_amount), 0);
    const grossIncome = toNumber(payrollIncomeRes.rows[0]?.total_income);
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);
    const totalTdsDeducted = toNumber(payrollIncomeRes.rows[0]?.total_tds);

    return {
        financial_year: fy,
        employee: employeeRes.rows[0],
        gross_income: grossIncome,
        total_approved_deductions: totalDeductions,
        taxable_income: taxableIncome,
        total_tds_deducted: totalTdsDeducted,
        deductions: deductionsRes.rows,
    };
};

const getMyForm16Summary = async (req, res) => {
    try {
        const employeeId = await getActorEmployeeId(req);
        if (!employeeId) return res.status(404).json({ error: 'Employee not found' });

        const summary = await getForm16SummaryCore(employeeId, req.query.financial_year || getCurrentFinancialYear());
        res.json(summary);
    } catch (err) {
        console.error('getMyForm16Summary error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Employee not found') {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

const getForm16SummaryForHR = async (req, res) => {
    try {
        const summary = await getForm16SummaryCore(req.params.employeeId, req.query.financial_year || getCurrentFinancialYear());
        res.json(summary);
    } catch (err) {
        console.error('getForm16SummaryForHR error:', err.message);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Employee not found') {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {

    getFinancialYearFromPayrollMonth,
    getApprovedDeclarationAmount,
    getMyDeclaration,
    getMyDeclarationsList,
    createMyDeclarationVersion,
    saveMyDeclaration,
    submitMyDeclaration,
    uploadProof,
    getDeclarationsForHR,
    getDeclarationDetailsForHR,
    reviewDeclarationItem,
    getMyForm16Summary,
    getForm16SummaryForHR,
};
