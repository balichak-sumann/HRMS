// migrate.cjs: cross-platform migration runner using .env
const { spawnSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from root or server
const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed || process.env;
const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;


if (!dbUrl) {
  console.error('DATABASE_URL not set in .env or environment.');
  process.exit(1);
}

// Explicitly set the env var for child process
process.env.DATABASE_URL = dbUrl;

const pgMigratePath = path.resolve(__dirname, 'node_modules', '.bin',
  process.platform === 'win32' ? 'node-pg-migrate.cmd' : 'node-pg-migrate');
const args = [
  'up',
  '-d', dbUrl,
  '-m', 'server/migrations',
  '-t', 'sql',
];

const result = spawnSync(pgMigratePath, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
