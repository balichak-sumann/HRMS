const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const envPath = path.join(serverDir, '.env');

const parseEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) return {};

    const text = fs.readFileSync(filePath, 'utf8');
    const env = {};

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();
        env[key] = value;
    }

    return env;
};

const run = (command, args, cwd) => {
    const result = spawnSync(command, args, {
        cwd,
        stdio: 'inherit',
        shell: false,
        env: process.env,
    });

    if (result.error) {
        throw result.error;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }
};

const env = { ...parseEnvFile(envPath), ...process.env };
const databaseUrl = env.DATABASE_URL || '';

if (databaseUrl.startsWith('mysql://')) {
    console.log('MySQL database detected. Applying MySQL schema...');
    console.log('Applying MySQL schema to the configured database...');
    run('node', ['scripts/apply-mysql-schema.js'], serverDir);
    console.log('');
    console.log('MySQL terminal migration completed.');
    console.log('Backend query conversion is still required before every route works cleanly on MySQL.');
    process.exit(0);
}

console.error('Unsupported or missing DATABASE_URL in server/.env.');
console.error('Use a mysql://... connection string.');
process.exit(1);
