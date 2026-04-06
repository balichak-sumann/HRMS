const crypto = require('crypto');
const mysql = require('mysql2/promise');

const noOp = () => {};

const types = {
    setTypeParser: noOp,
};

const normalizeConfig = (config = {}) => {
    const uri = config.connectionString || process.env.DATABASE_URL;

    if (!uri) {
        throw new Error('DATABASE_URL is not set.');
    }

    return {
        uri,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: false,
        decimalNumbers: true,
    };
};

const normalizeQueryInput = (sqlOrConfig, values) => {
    if (typeof sqlOrConfig === 'string') {
        return {
            text: sqlOrConfig,
            values: Array.isArray(values) ? values : [],
        };
    }

    if (sqlOrConfig && typeof sqlOrConfig === 'object' && typeof sqlOrConfig.text === 'string') {
        return {
            text: sqlOrConfig.text,
            values: Array.isArray(sqlOrConfig.values) ? sqlOrConfig.values : [],
        };
    }

    throw new Error('Unsupported query input. Expected SQL string or { text, values }.');
};

const rewriteCasts = (sql) => sql.replace(/::[a-zA-Z_][a-zA-Z0-9_\[\]]*/g, '');

const rewriteDateFormatting = (sql) => sql
    .replace(/TO_CHAR\(([^,]+),\s*'Mon DD'\)/gi, 'DATE_FORMAT($1, \'%b %d\')')
    .replace(/TO_CHAR\(([^,]+),\s*'YYYY-MM-DD'\)/gi, 'DATE_FORMAT($1, \'%Y-%m-%d\')');

const rewriteAgeExpressions = (sql) => sql.replace(
    /EXTRACT\(YEAR FROM AGE\(CURRENT_DATE,\s*([^)]+)\)\)/gi,
    'TIMESTAMPDIFF(YEAR, $1, CURDATE())'
);

const rewriteExtract = (sql) => {
    // Handle EXTRACT(EPOCH FROM (date1 - date2)) pattern for time differences
    let result = sql.replace(
        /EXTRACT\(EPOCH\s+FROM\s+\(([^-]+)\s*-\s*([^)]+)\)\)/gi,
        '(UNIX_TIMESTAMP($1) - UNIX_TIMESTAMP($2))'
    );
    // Then handle other EXTRACT(EPOCH ...) patterns
    result = result.replace(/EXTRACT\(EPOCH\s+FROM\s+([^)]+)\)/gi, 'UNIX_TIMESTAMP($1)');
    result = result.replace(/EXTRACT\(MONTH FROM ([^)]+)\)/gi, 'MONTH($1)');
    result = result.replace(/EXTRACT\(DAY FROM ([^)]+)\)/gi, 'DAY($1)');
    result = result.replace(/EXTRACT\(YEAR FROM ([^)]+)\)/gi, 'YEAR($1)');
    return result;
};

const rewriteIntervals = (sql) => sql
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'([0-9]+)\s+days'/gi, 'DATE_SUB(NOW(), INTERVAL $1 DAY)')
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'([0-9]+)\s+hours?'/gi, 'DATE_SUB(NOW(), INTERVAL $1 HOUR)')
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s*'([0-9]+)\s+days?'/gi, 'DATE_ADD(NOW(), INTERVAL $1 DAY)')
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s*'([0-9]+)\s+hours?'/gi, 'DATE_ADD(NOW(), INTERVAL $1 HOUR)')
    .replace(/CURRENT_DATE\s*\+\s*INTERVAL\s*'([0-9]+)\s+month'/gi, 'DATE_ADD(CURRENT_DATE, INTERVAL $1 MONTH)')
    .replace(/NOW\(\)\s*\+\s*\(\s*\$([0-9]+)\s*\|\|\s*' minutes'\s*\)\s*interval/gi, 'DATE_ADD(NOW(), INTERVAL $$$1 MINUTE)');

const rewriteCaseInsensitiveLike = (sql) => sql.replace(/\bILIKE\b/gi, 'LIKE');

const rewriteBooleanLiterals = (sql) => sql
    .replace(/\bTRUE\b/g, 'TRUE')
    .replace(/\bFALSE\b/g, 'FALSE');

const rewriteArrayAny = (sql) => sql
    .replace(/=\s*ANY\(\s*(\$\d+)\s*\)/gi, 'IN ($1)')
    .replace(/IN\s*\(\s*ANY\(\s*(\$\d+)\s*\)\s*\)/gi, 'IN ($1)');

const rewriteConflict = (sql) => {
    if (!/\bON\s+CONFLICT\b/i.test(sql)) return sql;

    if (/\bON\s+CONFLICT(?:\s*\([^)]+\))?\s+DO\s+NOTHING\b/i.test(sql)) {
        return sql
            .replace(/^(\s*)INSERT\b/i, '$1INSERT IGNORE')
            .replace(/\s+ON\s+CONFLICT(?:\s*\([^)]+\))?\s+DO\s+NOTHING\s*;?\s*$/i, '');
    }

    return sql
        .replace(/\bON\s+CONFLICT\s*\([^)]+\)\s+DO\s+UPDATE\s+SET\b/gi, 'ON DUPLICATE KEY UPDATE')
        .replace(/\bEXCLUDED\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g, 'VALUES($1)');
};

const rewriteSelectHelpers = (sql) => sql
    .replace(/COUNT\(\*\)\s+FROM/g, 'COUNT(*) AS count FROM')
    .replace(/COUNT\(\*\)\s+as\s+count/gi, 'COUNT(*) AS count');

const rewritePgSpecificSyntax = (sql) => {
    let next = sql;
    next = rewriteCasts(next);
    next = rewriteDateFormatting(next);
    next = rewriteAgeExpressions(next);
    next = rewriteExtract(next);
    next = rewriteIntervals(next);
    next = rewriteCaseInsensitiveLike(next);
    next = rewriteArrayAny(next);
    next = rewriteConflict(next);
    next = rewriteSelectHelpers(next);
    next = rewriteBooleanLiterals(next);
    return next;
};

const compileParameterizedSql = (sql, values = []) => {
    const compiledValues = [];
    const compiledSql = sql.replace(/\$(\d+)/g, (_, rawIndex) => {
        const value = values[Number(rawIndex) - 1];

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return 'NULL';
            }

            compiledValues.push(...value);
            return value.map(() => '?').join(', ');
        }

        compiledValues.push(value);
        return '?';
    });

    return { sql: compiledSql, values: compiledValues };
};

const parseInsertReturning = (sql) => {
    const match = sql.match(
        /^\s*INSERT\s+(?:IGNORE\s+)?INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([\s\S]+)\)\s*RETURNING\s+([\s\S]+?)\s*;?\s*$/i
    );
    if (!match) return null;

    return {
        table: match[1],
        columns: match[2].split(',').map((part) => part.trim()),
        valuesSql: match[3].trim(),
        returning: match[4].trim(),
    };
};

const parseUpdateReturning = (sql) => {
    const match = sql.match(
        /^\s*UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+?)\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i
    );
    if (!match) return null;

    return {
        table: match[1],
        setClause: match[2].trim(),
        whereClause: match[3].trim(),
        returning: match[4].trim(),
    };
};

const parseDeleteReturning = (sql) => {
    const match = sql.match(
        /^\s*DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+WHERE\s+([\s\S]+?)\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i
    );
    if (!match) return null;

    return {
        table: match[1],
        whereClause: match[2].trim(),
        returning: match[3].trim(),
    };
};

const normalizeReturningColumns = (returning) => {
    if (returning.trim() === '*') return '*';
    return returning
        .split(',')
        .map((part) => part.trim())
        .join(', ');
};

const buildResult = (rowsOrPacket) => ({
    rows: Array.isArray(rowsOrPacket) ? rowsOrPacket : [],
    rowCount: Array.isArray(rowsOrPacket) ? rowsOrPacket.length : rowsOrPacket?.affectedRows || 0,
});

const runBasicQuery = async (executor, sql, values) => {
    const [rows] = await executor.query(sql, values);
    return buildResult(rows);
};

const runInsertReturning = async (executor, parsed, originalValues) => {
    const generatedId = parsed.columns.some((column) => column.replace(/[`"]/g, '').trim().toLowerCase() === 'id')
        ? null
        : crypto.randomUUID();

    const baseSql = generatedId
        ? `INSERT INTO ${parsed.table} (id, ${parsed.columns.join(', ')}) VALUES ($${originalValues.length + 1}, ${parsed.valuesSql})`
        : `INSERT INTO ${parsed.table} (${parsed.columns.join(', ')}) VALUES (${parsed.valuesSql})`;

    const insertedValues = generatedId ? [...originalValues, generatedId] : [...originalValues];
    const rewrittenInsert = compileParameterizedSql(rewritePgSpecificSyntax(baseSql), insertedValues);
    await executor.query(rewrittenInsert.sql, rewrittenInsert.values);

    const idValue = generatedId || originalValues[parsed.columns.findIndex((column) => column.replace(/[`"]/g, '').trim().toLowerCase() === 'id')];
    const returningCols = normalizeReturningColumns(parsed.returning);
    const selectSql = `SELECT ${returningCols} FROM ${parsed.table} WHERE id = ?`;
    const [rows] = await executor.query(selectSql, [idValue]);
    return buildResult(rows);
};

const runUpdateReturning = async (executor, parsed, originalValues) => {
    const updateSql = `UPDATE ${parsed.table} SET ${parsed.setClause} WHERE ${parsed.whereClause}`;
    const rewrittenUpdate = compileParameterizedSql(rewritePgSpecificSyntax(updateSql), originalValues);
    await executor.query(rewrittenUpdate.sql, rewrittenUpdate.values);

    const selectSql = `SELECT ${normalizeReturningColumns(parsed.returning)} FROM ${parsed.table} WHERE ${parsed.whereClause}`;
    const rewrittenSelect = compileParameterizedSql(rewritePgSpecificSyntax(selectSql), originalValues);
    const [rows] = await executor.query(rewrittenSelect.sql, rewrittenSelect.values);
    return buildResult(rows);
};

const runDeleteReturning = async (executor, parsed, originalValues) => {
    const selectSql = `SELECT ${normalizeReturningColumns(parsed.returning)} FROM ${parsed.table} WHERE ${parsed.whereClause}`;
    const rewrittenSelect = compileParameterizedSql(rewritePgSpecificSyntax(selectSql), originalValues);
    const [rows] = await executor.query(rewrittenSelect.sql, rewrittenSelect.values);

    const deleteSql = `DELETE FROM ${parsed.table} WHERE ${parsed.whereClause}`;
    const rewrittenDelete = compileParameterizedSql(rewritePgSpecificSyntax(deleteSql), originalValues);
    await executor.query(rewrittenDelete.sql, rewrittenDelete.values);

    return buildResult(rows);
};

const executeCompatQuery = async (executor, sqlOrConfig, values) => {
    const { text, values: queryValues } = normalizeQueryInput(sqlOrConfig, values);
    const trimmed = text.trim();

    if (/^\s*WITH\s+/i.test(trimmed)) {
        throw new Error('WITH queries still need manual MySQL conversion.');
    }

    const insertReturning = parseInsertReturning(trimmed);
    if (insertReturning) {
        return runInsertReturning(executor, insertReturning, queryValues);
    }

    const updateReturning = parseUpdateReturning(trimmed);
    if (updateReturning) {
        return runUpdateReturning(executor, updateReturning, queryValues);
    }

    const deleteReturning = parseDeleteReturning(trimmed);
    if (deleteReturning) {
        return runDeleteReturning(executor, deleteReturning, queryValues);
    }

    if (/to_regclass\s*\(/i.test(trimmed)) {
        throw new Error('to_regclass() still needs manual MySQL conversion.');
    }

    const rewritten = compileParameterizedSql(rewritePgSpecificSyntax(trimmed), queryValues);
    return runBasicQuery(executor, rewritten.sql, rewritten.values);
};

class CompatClient {
    constructor(connection) {
        this.connection = connection;
    }

    async query(sql, values = []) {
        return executeCompatQuery(this.connection, sql, values);
    }

    release() {
        this.connection.release();
    }
}

class Pool {
    constructor(config = {}) {
        this.pool = mysql.createPool(normalizeConfig(config));
    }

    async query(sql, values = []) {
        return executeCompatQuery(this.pool, sql, values);
    }

    async connect() {
        const connection = await this.pool.getConnection();
        return new CompatClient(connection);
    }

    async end() {
        await this.pool.end();
    }
}

module.exports = {
    Pool,
    types,
};
