const cron = require('node-cron');
const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const ORG_NAME = process.env.ORG_NAME || 'the organization';

const toOrdinal = (n) => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return `${n}st`;
    if (j === 2 && k !== 12) return `${n}nd`;
    if (j === 3 && k !== 13) return `${n}rd`;
    return `${n}th`;
};

const celebrationMeta = {
    birthday: {
        title: (fullName) => `Happy Birthday ${fullName}!`,
        messageForAnnouncement: (fullName) => `Join us in wishing ${fullName} a very happy birthday and a fantastic year ahead.`,
        notificationTitle: 'Birthday Celebration'
    },
    work_anniversary: {
        title: (fullName, years) => `Happy Work Anniversary ${fullName}!`,
        messageForAnnouncement: (fullName, years) => `Celebrating ${fullName}'s ${toOrdinal(years)} work anniversary at ${ORG_NAME}. Thank you for your contribution!`,
        notificationTitle: 'Work Anniversary Celebration'
    }
};

const getTodayCelebrations = async () => {

    const birthdayQuery = `
        SELECT e.id, e.full_name, e.role, e.department, e.avatar_url, 'birthday'::text AS celebration_type,
               EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.dob::date))::int AS years_count
        FROM employees e
        WHERE e.status = 'Active'
          AND e.dob IS NOT NULL
          AND EXTRACT(MONTH FROM e.dob) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM e.dob) = EXTRACT(DAY FROM CURRENT_DATE)
    `;

    const anniversaryQuery = `
        SELECT e.id, e.full_name, e.role, e.department, e.avatar_url, 'work_anniversary'::text AS celebration_type,
               EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.joining_date::date))::int AS years_count
        FROM employees e
        WHERE e.status = 'Active'
          AND e.joining_date IS NOT NULL
          AND EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM e.joining_date) = EXTRACT(DAY FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.joining_date::date)) >= 1
    `;

    const [birthdayRes, anniversaryRes] = await Promise.all([
        pool.query(birthdayQuery),
        pool.query(anniversaryQuery)
    ]);

    return [...birthdayRes.rows, ...anniversaryRes.rows];
};

const createNotificationsForAllProfiles = async (client, title, message, meta = {}) => {
    await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT id, $1, $2, $3 FROM profiles WHERE status = 'active'`,
        [title, message, meta.type || 'celebration']
    );
};

const createCelebrationAnnouncement = async (client, celebration, hrAuthorId) => {
    const typeMeta = celebrationMeta[celebration.celebration_type];
    const title = typeMeta.title(celebration.full_name, celebration.years_count || 0);
    const content = typeMeta.messageForAnnouncement(celebration.full_name, celebration.years_count || 0);

    const announcementRes = await client.query(
        `INSERT INTO announcements (title, content, author_id)
         VALUES ($1, $2, $3)
         RETURNING id, title, content, created_at`,
        [title, content, hrAuthorId || null]
    );

    return announcementRes.rows[0];
};

const processCelebrations = async (io) => {
    const celebrations = await getTodayCelebrations();
    if (!celebrations.length) {
        return { created: 0, skipped: 0, celebrations: [] };
    }

    const client = await pool.connect();
    let created = 0;
    let skipped = 0;

    try {
        await client.query('BEGIN');


        const hrRes = await client.query(
            `SELECT e.id
             FROM employees e
             WHERE e.role = 'HR' AND e.status = 'Active'
             ORDER BY e.created_at ASC
             LIMIT 1`
        );
        const hrAuthorId = hrRes.rows[0]?.id || null;

        const createdPayloads = [];
        for (const celebration of celebrations) {
            const existing = await client.query(
                `SELECT id FROM employee_celebrations
                 WHERE employee_id = $1 AND celebration_type = $2 AND celebration_date = CURRENT_DATE`,
                [celebration.id, celebration.celebration_type]
            );

            if (existing.rows.length > 0) {
                skipped += 1;
                continue;
            }

            const announcement = await createCelebrationAnnouncement(client, celebration, hrAuthorId);
            await client.query(
                `INSERT INTO employee_celebrations (employee_id, celebration_type, celebration_date, announcement_id)
                 VALUES ($1, $2, CURRENT_DATE, $3)`,
                [celebration.id, celebration.celebration_type, announcement.id]
            );

            const nTitle = celebrationMeta[celebration.celebration_type].notificationTitle;
            const nMessage = announcement.content;
            await createNotificationsForAllProfiles(client, nTitle, nMessage, { type: 'celebration' });

            created += 1;
            createdPayloads.push({
                employeeId: celebration.id,
                employeeName: celebration.full_name,
                celebrationType: celebration.celebration_type,
                yearsCount: celebration.years_count,
                announcement
            });
        }

        await client.query('COMMIT');

        if (io && createdPayloads.length > 0) {
            io.emit('celebration_created', {
                date: new Date(),
                items: createdPayloads
            });
            io.emit('notification_created', {
                type: 'celebration',
                title: 'Today\'s celebrations are live',
                message: 'Check announcements for birthdays and work anniversaries.'
            });
        }

        return { created, skipped, celebrations: createdPayloads };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const scheduleCelebrationJob = (io) => {
    cron.schedule('0 8 * * *', async () => {
        try {
            const result = await processCelebrations(io);
            console.log(`[Celebrations] Daily run completed. created=${result.created}, skipped=${result.skipped}`);
        } catch (err) {
            console.error('[Celebrations] Daily run failed:', err.message);
        }
    }, {
        timezone: APP_TIMEZONE
    });

    console.log(`[Celebrations] Cron scheduled at 08:00 (${APP_TIMEZONE})`);
};

module.exports = {
    scheduleCelebrationJob,
    processCelebrations,
    getTodayCelebrations
};
