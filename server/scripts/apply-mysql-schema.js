const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const schemaPath = path.resolve(__dirname, '../mysql/hostinger_import.sql');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.startsWith('mysql://')) {
    console.error('DATABASE_URL must be a mysql:// connection string.');
    process.exit(1);
}

const splitSqlStatements = (sql) => {
    const statements = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;

    for (let i = 0; i < sql.length; i += 1) {
        const ch = sql[i];
        const prev = sql[i - 1];

        if (ch === "'" && !inDouble && !inBacktick && prev !== '\\') {
            inSingle = !inSingle;
        } else if (ch === '"' && !inSingle && !inBacktick && prev !== '\\') {
            inDouble = !inDouble;
        } else if (ch === '`' && !inSingle && !inDouble) {
            inBacktick = !inBacktick;
        }

        if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
            const trimmed = current.trim();
            if (trimmed) statements.push(trimmed);
            current = '';
            continue;
        }

        current += ch;
    }

    const trailing = current.trim();
    if (trailing) statements.push(trailing);
    return statements;
};

const shouldIgnoreError = (err) => {
    const ignorableCodes = new Set([
        'ER_TABLE_EXISTS_ERROR',
        'ER_DUP_KEYNAME',
        'ER_DUP_FIELDNAME',
        'ER_CANT_CREATE_TABLE',
        'ER_DUP_ENTRY',
        'ER_FK_DUP_NAME',
    ]);

    if (ignorableCodes.has(err.code)) return true;

    const message = String(err.message || '').toLowerCase();
    return (
        message.includes('already exists') ||
        message.includes('duplicate key name') ||
        message.includes('duplicate foreign key constraint name')
    );
};

const ensureCoreMySqlTables = async (connection) => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS system_lookups (
            id CHAR(36) NOT NULL DEFAULT (UUID()),
            category VARCHAR(191) NOT NULL,
            value VARCHAR(191) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY idx_system_lookups_unique (category, value),
            KEY idx_system_lookups_category (category, is_active)
        )
    `);
};

const main = async () => {
    if (!fs.existsSync(schemaPath)) {
        console.error(`Schema file not found: ${schemaPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8')
        .replace(/^\s*--.*$/gm, '')
        .trim();

    const statements = splitSqlStatements(sql);
    const connection = await mysql.createConnection(databaseUrl);

    let applied = 0;
    let skipped = 0;

    try {
        for (const statement of statements) {
            const normalized = statement.trim();
            if (!normalized) continue;

            try {
                await connection.query(normalized);
                applied += 1;
            } catch (err) {
                if (shouldIgnoreError(err)) {
                    skipped += 1;
                    continue;
                }

                console.error('Failed statement:');
                console.error(normalized);
                throw err;
            }
        }

        await ensureCoreMySqlTables(connection);
    } finally {
        await connection.end();
    }

    console.log(`MySQL schema apply complete. applied=${applied} skipped=${skipped}`);
};

main().catch((err) => {
    console.error('MySQL schema apply failed:', err.message);
    process.exit(1);
});
