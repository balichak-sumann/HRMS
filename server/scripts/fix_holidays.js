const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixHolidays() {
    console.log('━━━ Manually Populating National Holidays ━━━');
    const years = [2026, 2027];
    
    for (const year of years) {
        console.log(`Processing ${year}...`);
        const staticHolidays = [
            { name: "New Year's Day", date: `${year}-01-01` },
            { name: "Republic Day", date: `${year}-01-26` },
            { name: "Independence Day", date: `${year}-08-15` },
            { name: "Gandhi Jayanti", date: `${year}-10-02` },
            { name: "Christmas Day", date: `${year}-12-25` }
        ];

        for (const h of staticHolidays) {
            await pool.query(
                'INSERT INTO holidays (name, date, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [h.name, h.date, 'National']
            );
            console.log(`  [+] ${h.name} (${h.date})`);
        }
    }
    console.log('✅ Done.');
}

fixHolidays().catch(console.error).finally(() => pool.end());
