const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const envPath = path.join(serverDir, '.env');

const parseEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) return {};

    const env = {};
    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;
        env[line.slice(0, eqIndex).trim()] = line.slice(eqIndex + 1).trim();
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

    if (result.error) throw result.error;
    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }
};

const runNpm = (args) => {
    if (process.platform === 'win32') {
        const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
            cwd: rootDir,
            stdio: 'inherit',
            shell: false,
            env: process.env,
        });
        if (result.error) throw result.error;
        if (typeof result.status === 'number' && result.status !== 0) {
            process.exit(result.status);
        }
        return;
    }

    run('npm', args, rootDir);
};

const env = { ...parseEnvFile(envPath), ...process.env };
const databaseUrl = env.DATABASE_URL || '';

if (databaseUrl.startsWith('mysql://')) {
    console.log('MySQL database detected. Running MySQL-compatible seed scripts.');
    run('node', ['db/setup.js'], serverDir);
    run('node', ['scripts/seedLookups.js'], serverDir);
    process.exit(0);
}

console.error('Unsupported or missing DATABASE_URL in server/.env.');
process.exit(1);
