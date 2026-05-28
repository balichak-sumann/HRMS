require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('./index');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CSV_PATH = path.join(__dirname, 'employee_details.csv');

const toNull = (value) => {
    if (value == null) return null;
    const v = String(value).trim();
    if (!v) return null;
    const lower = v.toLowerCase();
    if (lower === 'null' || lower === 'na' || lower === 'n/a' || lower === '-') return null;
    return v;
};

const parseDate = (value) => {
    const v = toNull(value);
    if (!v) return null;

    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    // dd-mm-yyyy or dd/mm/yyyy
    const m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
    }

    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }

    return null;
};

const parseNumber = (value) => {
    const v = toNull(value);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const splitCsvLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === ',' && !inQuotes) {
            out.push(cur);
            cur = '';
            continue;
        }

        cur += ch;
    }

    out.push(cur);
    return out;
};

const parseCsv = (text) => {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = splitCsvLine(lines[0]).map((h) => h.trim());
    return lines.slice(1).map((line) => {
        const cells = splitCsvLine(line);
        const row = {};
        headers.forEach((h, i) => {
            row[h] = cells[i] ?? '';
        });
        return row;
    });
};

const getAny = (row, keys) => {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            return row[key];
        }
    }
    return null;
};

const mapRow = (row) => {
    const employeeId = toNull(getAny(row, ['EmployeeID', 'Employee Id', 'Employee Code']));
    const firstName = toNull(getAny(row, ['FirstName', 'First Name']));
    const lastName = toNull(getAny(row, ['LastName', 'Last Name']));
    const fullName = toNull([firstName, lastName].filter(Boolean).join(' '));

    return {
        employee_id: employeeId,
        full_name: fullName,
        email: toNull(getAny(row, ['WorkEmail', 'Work Email', 'OfficialEmail', 'Official Email'])),
        personal_email: toNull(getAny(row, ['PersonalEmail', 'Personal Email'])),
        phone: toNull(getAny(row, ['Contact', 'Phone', 'Phone Number'])),
        emergency_contact: toNull(getAny(row, ['EmergencyContact', 'Emergency Contact'])),
        address: toNull(getAny(row, ['Address'])),
        joining_date: parseDate(getAny(row, ['JoiningDate', 'Joining Date'])),
        technology: toNull(getAny(row, ['Technology', 'Tech Stack'])),
        experience_years: parseNumber(getAny(row, ['ExperienceYears', 'Experience Years'])),
        aadhaar_card: toNull(getAny(row, ['Adhar Card', 'Aadhar Card', 'Aadhaar Card'])),
        pan: toNull(getAny(row, ['Pan Card', 'PAN', 'Pan']))
    };
};

const seed = async () => {
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`CSV not found: ${CSV_PATH}`);
        process.exit(1);
    }

    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseCsv(csvText);
    if (!rows.length) {
        console.error('No rows found in employee_details.csv');
        process.exit(1);
    }

    const client = await pool.connect();
    let upserted = 0;
    let skipped = 0;

    try {
        await client.query('BEGIN');

        for (const raw of rows) {
            const r = mapRow(raw);

            if (!r.employee_id && !r.email) {
                skipped += 1;
                continue;
            }

            const existing = await client.query(
                `SELECT id
                 FROM employees
                 WHERE ($1::text IS NOT NULL AND employee_id = $1)
                    OR ($2::text IS NOT NULL AND lower(email) = lower($2))
                 LIMIT 1`,
                [r.employee_id, r.email]
            );

            if (existing.rows.length > 0) {
                await client.query(
                    `UPDATE employees
                     SET full_name = COALESCE($1, full_name),
                         email = COALESCE($2, email),
                         employee_id = COALESCE($3, employee_id),
                         personal_email = $4,
                         phone = $5,
                         emergency_contact = $6,
                         address = $7,
                         joining_date = $8,
                         technology = $9,
                         experience_years = $10,
                         aadhaar_card = $11,
                         pan = $12,
                         updated_at = NOW()
                     WHERE id = $13`,
                    [
                        r.full_name,
                        r.email,
                        r.employee_id,
                        r.personal_email,
                        r.phone,
                        r.emergency_contact,
                        r.address,
                        r.joining_date,
                        r.technology,
                        r.experience_years,
                        r.aadhaar_card,
                        r.pan,
                        existing.rows[0].id
                    ]
                );
            } else {
                if (!r.email) {
                    skipped += 1;
                    continue;
                }

                await client.query(
                    `INSERT INTO employees (
                        full_name, email, role, department, status,
                        employee_id, personal_email, phone, emergency_contact,
                        address, joining_date, technology, experience_years,
                        aadhaar_card, pan
                    ) VALUES (
                        $1, $2, NULL, NULL, 'Active',
                        $3, $4, $5, $6,
                        $7, $8, $9, $10,
                        $11, $12
                    )`,
                    [
                        r.full_name || 'Unknown',
                        r.email,
                        r.employee_id,
                        r.personal_email,
                        r.phone,
                        r.emergency_contact,
                        r.address,
                        r.joining_date,
                        r.technology,
                        r.experience_years,
                        r.aadhaar_card,
                        r.pan
                    ]
                );
            }

            upserted += 1;
        }

        await client.query('COMMIT');
        console.log(`Seed complete. Upserted: ${upserted}, Skipped: ${skipped}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

seed();
