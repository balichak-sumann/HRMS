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

const env = { ...parseEnvFile(envPath), ...process.env };
const npmArgs = ['run', '--prefix', 'server', 'start'];

const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm ${npmArgs.join(' ')}`], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: false,
        env: process.env,
    })
    : spawnSync('npm', npmArgs, {
        cwd: rootDir,
        stdio: 'inherit',
        shell: false,
        env: process.env,
    });

if (result.error) throw result.error;
process.exit(result.status || 0);
