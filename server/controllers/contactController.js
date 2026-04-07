const crypto = require('crypto');
const { Pool } = require('../db');
const { sendContactSubmissionNotification } = require('../services/emailService');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

let tableReady = false;

const ensureContactTable = async () => {
    if (tableReady) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(190) NOT NULL,
            company VARCHAR(190) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    tableReady = true;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const submitContactForm = async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const company = String(req.body?.company || '').trim();

    if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Please enter a valid name.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!company || company.length < 2) {
        return res.status(400).json({ error: 'Please enter a valid company name.' });
    }

    try {
        await ensureContactTable();

        const id = crypto.randomUUID();
        const submittedAt = new Date();

        await pool.query(
            `INSERT INTO contact_submissions (id, name, email, company, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, name, email, company, submittedAt]
        );

        try {
            await sendContactSubmissionNotification({
                name,
                email,
                company,
                submittedAt: submittedAt.toISOString(),
            });
        } catch (mailErr) {
            console.error('[Contact] Saved submission but failed to send notification:', mailErr.message);
            return res.status(202).json({
                success: true,
                warning: 'Submission saved, but notification email could not be sent.',
            });
        }

        return res.status(201).json({ success: true, message: 'Thanks for reaching out. We will contact you soon.' });
    } catch (err) {
        console.error('[Contact] Failed to submit contact form:', err.message);
        return res.status(500).json({ error: 'Unable to submit contact form right now. Please try again.' });
    }
};

module.exports = {
    submitContactForm,
};
