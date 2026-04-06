const { Pool } = require('../db');
const fetch = require('node-fetch');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Get holidays (with auto-fetch from API) ────────────────────
const getHolidays = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        const checkResult = await pool.query(
            'SELECT DISTINCT EXTRACT(YEAR FROM date) as year FROM holidays WHERE EXTRACT(YEAR FROM date) IN ($1, $2)',
            [currentYear, nextYear]
        );

        const existingYears = checkResult.rows.map(r => parseInt(r.year));

        for (const year of [currentYear, nextYear]) {
            if (!existingYears.includes(year)) {
                console.log(`Attempting to fetch holidays for ${year} from API...`);
                let fetchedFromApi = false;
                try {
                    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
                    if (response.status === 200) {
                        const data = await response.json();
                        for (const h of data) {
                            await pool.query(
                                'INSERT INTO holidays (name, date, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                                [h.localName, h.date, 'National']
                            );
                        }
                        fetchedFromApi = true;
                    }
                } catch (apiErr) {
                    console.error(`Failed to fetch holidays for ${year}:`, apiErr);
                }

                // Fallback for India if API fails or returns no data
                if (!fetchedFromApi) {
                    console.log(`Using static fallback for India holidays in ${year}`);
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
                    }
                }
            }
        }

        const holidays = await pool.query('SELECT * FROM holidays ORDER BY date ASC');
        res.json(holidays.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create holiday ──────────────────────────────────────────────
const createHoliday = async (req, res) => {
    const { name, date, type, label } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO holidays (name, date, type, label) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, date, type || 'Custom', label]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getHolidays, createHoliday };
