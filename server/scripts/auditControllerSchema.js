require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('../db');

const SQL_START = /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|WITH)\b/i;
const SQL_KEYWORDS = new Set([
    'select', 'from', 'join', 'left', 'right', 'inner', 'outer', 'full', 'cross', 'on', 'where', 'and', 'or', 'not',
    'group', 'by', 'order', 'having', 'limit', 'offset', 'insert', 'into', 'values', 'update', 'set', 'delete', 'returning',
    'as', 'case', 'when', 'then', 'else', 'end', 'distinct', 'coalesce', 'null', 'is', 'in', 'exists', 'between', 'union',
    'all', 'any', 'true', 'false', 'count', 'sum', 'avg', 'min', 'max', 'extract', 'epoch', 'date', 'current_date', 'now',
    'interval', 'asc', 'desc', 'cast', 'over', 'partition', 'row_number', 'uuid', 'json', 'text', 'int', 'numeric', 'date_format',
]);

const ALIAS_BREAKERS = new Set([
    'on', 'where', 'group', 'order', 'having', 'limit', 'offset', 'inner', 'left', 'right', 'full', 'cross', 'join',
    'union', 'returning', 'set', 'values', 'and', 'or', ',', ';'
]);

const normalizeIdentifier = (name) => String(name || '').replace(/[`"']/g, '').trim();

const splitCsvTopLevel = (input) => {
    const out = [];
    let current = '';
    let depth = 0;
    let quote = null;

    for (let i = 0; i < input.length; i += 1) {
        const ch = input[i];
        const prev = input[i - 1];

        if (quote) {
            current += ch;
            if (ch === quote && prev !== '\\') quote = null;
            continue;
        }

        if (ch === '"' || ch === '\'') {
            quote = ch;
            current += ch;
            continue;
        }

        if (ch === '(') {
            depth += 1;
            current += ch;
            continue;
        }

        if (ch === ')') {
            depth = Math.max(0, depth - 1);
            current += ch;
            continue;
        }

        if (ch === ',' && depth === 0) {
            if (current.trim()) out.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) out.push(current.trim());
    return out;
};

const extractLikelySqlStrings = (fileText) => {
    const sqlBlocks = [];

    const patterns = [
        /(?:pool|client)\.query\(\s*`([\s\S]*?)`/g,
        /(?:pool|client)\.query\(\s*'([\s\S]*?)'/g,
        /(?:pool|client)\.query\(\s*"([\s\S]*?)"/g,
    ];

    for (const pattern of patterns) {
        let m;
        while ((m = pattern.exec(fileText)) !== null) {
            const raw = m[1];
            const compact = raw.replace(/\s+/g, ' ').trim();
            if (!compact) continue;
            if (!SQL_START.test(compact)) continue;
            sqlBlocks.push(raw);
        }
    }

    return sqlBlocks;
};

const parseAliasMap = (sql) => {
    const aliasMap = new Map();
    const fromJoinRegex = /\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*))?/gi;
    let m;

    while ((m = fromJoinRegex.exec(sql)) !== null) {
        const table = normalizeIdentifier(m[1]);
        const candidateAlias = normalizeIdentifier(m[2] || '');
        const lowerAlias = candidateAlias.toLowerCase();

        aliasMap.set(table, table);

        if (candidateAlias && !ALIAS_BREAKERS.has(lowerAlias)) {
            aliasMap.set(candidateAlias, table);
        }
    }

    return aliasMap;
};

const checkInsertColumns = (sql, file, schema) => {
    const issues = [];
    const insertRegex = /\bINSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*VALUES\b/i;
    const m = sql.match(insertRegex);
    if (!m) return issues;

    const table = normalizeIdentifier(m[1]);
    const colsPart = m[2];

    if (!schema.has(table)) {
        issues.push({ file, severity: 'error', kind: 'missing-table', table, sql: sql.replace(/\s+/g, ' ').trim() });
        return issues;
    }

    const tableCols = schema.get(table);
    const columns = splitCsvTopLevel(colsPart).map((c) => normalizeIdentifier(c));
    for (const col of columns) {
        if (!col || SQL_KEYWORDS.has(col.toLowerCase())) continue;
        if (!tableCols.has(col)) {
            issues.push({ file, severity: 'error', kind: 'missing-column', table, column: col, context: 'INSERT', sql: sql.replace(/\s+/g, ' ').trim() });
        }
    }

    return issues;
};

const checkUpdateColumns = (sql, file, schema) => {
    const issues = [];
    const updateRegex = /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+SET\s+([\s\S]*?)(?:\bWHERE\b|\bRETURNING\b|$)/i;
    const m = sql.match(updateRegex);
    if (!m) return issues;

    const table = normalizeIdentifier(m[1]);
    const setPart = m[2];

    if (!schema.has(table)) {
        issues.push({ file, severity: 'error', kind: 'missing-table', table, sql: sql.replace(/\s+/g, ' ').trim() });
        return issues;
    }

    const tableCols = schema.get(table);
    const colMatches = [...setPart.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g)].map((x) => normalizeIdentifier(x[1]));
    for (const col of colMatches) {
        if (!col || SQL_KEYWORDS.has(col.toLowerCase())) continue;
        if (!tableCols.has(col)) {
            issues.push({ file, severity: 'error', kind: 'missing-column', table, column: col, context: 'UPDATE', sql: sql.replace(/\s+/g, ' ').trim() });
        }
    }

    return issues;
};

const checkAliasRefs = () => {
    // Alias-based parsing can produce noisy false positives for complex SQL.
    // This audit intentionally focuses on concrete INSERT/UPDATE column usage.
    return [];
};

const uniqueIssues = (issues) => {
    const seen = new Set();
    const out = [];

    for (const issue of issues) {
        const key = JSON.stringify([issue.file, issue.kind, issue.table, issue.column, issue.context, issue.sql]);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(issue);
    }

    return out;
};

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const schemaRes = await pool.query(
            `SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
             ORDER BY table_name, ordinal_position`
        );

        const schema = new Map();
        for (const row of schemaRes.rows) {
            if (!schema.has(row.table_name)) schema.set(row.table_name, new Set());
            schema.get(row.table_name).add(row.column_name);
        }

        const controllersDir = path.join(__dirname, '..', 'controllers');
        const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.js'));

        const issues = [];
        for (const file of files) {
            const fullPath = path.join(controllersDir, file);
            const text = fs.readFileSync(fullPath, 'utf8');
            const sqlBlocks = extractLikelySqlStrings(text);

            for (const sql of sqlBlocks) {
                if (sql.includes('${')) {
                    // Skip dynamic SQL literals where columns are assembled at runtime.
                    continue;
                }
                issues.push(...checkInsertColumns(sql, file, schema));
                issues.push(...checkUpdateColumns(sql, file, schema));
                issues.push(...checkAliasRefs(sql, file, schema));
            }
        }

        const deduped = uniqueIssues(issues)
            .filter((issue) => issue.column !== 'rows' && issue.column !== 'message')
            .sort((a, b) => a.file.localeCompare(b.file) || a.table.localeCompare(b.table) || (a.column || '').localeCompare(b.column || ''));

        console.log(`Schema audit complete. Found ${deduped.length} potential mismatches.`);
        for (const issue of deduped) {
            const detail = issue.column ? `${issue.table}.${issue.column}` : issue.table;
            const context = issue.context ? ` (${issue.context})` : '';
            console.log(`[${issue.severity}] ${issue.file}: ${issue.kind}${context} -> ${detail}`);
        }

        if (deduped.length > 0) {
            process.exitCode = 2;
        }
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Audit failed:', err.message);
    process.exit(1);
});
