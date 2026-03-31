// Script to list all tables in the 'website' database using pg
const { Client } = require('pg');

const connectionString = 'postgres://postgres:root@localhost:5432/website';

async function listTables() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`);
  console.log('Tables in database:', res.rows.map(r => r.table_name));
  await client.end();
}

listTables().catch(err => { console.error('Error:', err); process.exit(1); });
