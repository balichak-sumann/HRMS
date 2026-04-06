const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const getMyNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, message, type, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );

        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        console.error('Error marking notifications as read:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const markOneAsRead = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING id, is_read`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error marking notification as read:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getMyNotifications,
    markAllAsRead,
    markOneAsRead,
};
