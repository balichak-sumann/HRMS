const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Get announcements ───────────────────────────────────────────
const getAnnouncements = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, e.full_name as author_name, e.avatar_url as author_avatar
            FROM announcements a
            LEFT JOIN employees e ON a.author_id = e.id
            ORDER BY a.created_at DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create announcement ─────────────────────────────────────────
const createAnnouncement = async (req, res) => {
    const { title, content } = req.body;
    const author_id = req.user.employee_uuid || req.user.id;

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO announcements (title, content, author_id) VALUES ($1, $2, $3) RETURNING *',
            [title, content, author_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating announcement:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Delete announcement (HR/Admin) ────────────────────────────
const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM announcements WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.json({ message: 'Announcement deleted successfully' });
    } catch (err) {
        console.error('Error deleting announcement:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement };
