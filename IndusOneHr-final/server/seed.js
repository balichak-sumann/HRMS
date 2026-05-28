require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Pool } = require('./db');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedProfiles() {
  const users = [
    {
      email: process.env.SEED_SUPERADMIN_EMAIL,
      password: process.env.SEED_SUPERADMIN_PASSWORD,
      role: 'admin',
    },
    {
      email: process.env.SEED_HR_EMAIL,
      password: process.env.SEED_HR_PASSWORD,
      role: 'hr',
    },
    {
      email: process.env.SEED_EMPLOYEE_EMAIL,
      password: process.env.SEED_EMPLOYEE_PASSWORD,
      role: 'employee',
    },
  ];

  for (const user of users) {
    if (!user.email || !user.password) {
      console.log(`Skipping user with missing email or password:`, user);
      continue;
    }
    const hash = await bcrypt.hash(user.password, 10);
    try {
      await pool.query(
        `INSERT INTO profiles (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
        [user.email, hash, user.role]
      );
      console.log(`Seeded: ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`Error seeding ${user.email}:`, err.message);
    }
  }
  await pool.end();
  console.log('Seeding complete.');
}

seedProfiles();
