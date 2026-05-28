const { Pool } = require('../db');
const fs = require('fs');
const path = require('path');
const { sendOfferLetterEmail } = require('../services/emailService');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Create offer letter (HR) ───────────────────────────────────
const createOfferLetter = async (req, res) => {
    try {
        const body = req.body || {};
        const { candidate_name, email, role, department, ctc, joining_date } = body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const rawCtc = String(ctc ?? '').trim();

        const missingFields = [];
        if (!candidate_name || !String(candidate_name).trim()) missingFields.push('candidate_name');

        if (missingFields.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Please provide a valid candidate email address.' });
        }

        let normalizedCtc = 0;
        if (rawCtc) {
            const parsedCtc = Number(rawCtc);
            if (!Number.isFinite(parsedCtc) || parsedCtc < 0) {
                return res.status(400).json({ error: 'CTC must be a valid non-negative number.' });
            }
            normalizedCtc = parsedCtc;
        }

        if (!req.file?.buffer?.length) {
            return res.status(400).json({ error: 'Generated offer letter PDF is missing in request' });
        }

        let savedFilePath = null;
        if (req.file?.buffer?.length) {
            const safeName = (candidate_name || 'candidate').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            const fileName = `offer_letter_${safeName || 'candidate'}_${Date.now()}.pdf`;
            const uploadDir = path.join(__dirname, '..', 'uploads', 'offer_letters');
            fs.mkdirSync(uploadDir, { recursive: true });
            const fullPath = path.join(uploadDir, fileName);
            fs.writeFileSync(fullPath, req.file.buffer);
            savedFilePath = `/uploads/offer_letters/${fileName}`;
        }

        const result = await pool.query(
            "INSERT INTO offer_letters (candidate_name, email, role, department, ctc, joining_date, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [
                String(candidate_name).trim(),
                normalizedEmail || null,
                role || 'Software Developer - L1',
                department || 'IT',
                normalizedCtc,
                joining_date || null,
                savedFilePath,
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('createOfferLetter failed:', err);
        res.status(500).json({ error: err?.message || 'Server error' });
    }
};

// ─── Get all offer letters (HR) ─────────────────────────────────
const getOfferLetters = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM offer_letters ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Send offer letter (HR) ─────────────────────────────────────
const sendOfferLetter = async (req, res) => {
    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const settingsRes = await pool.query(
            `SELECT basic_ratio,
                    hra_ratio,
                    conveyance_amount,
                    fixed_pf_deduction,
                    fixed_employer_pf_deduction,
                    fixed_insurance_deduction,
                    fixed_ptax_deduction
             FROM payroll_statutory_settings
             ORDER BY updated_at DESC
             LIMIT 1`
        );
        const statutorySettings = settingsRes.rows[0] || {};

        const existing = await pool.query(
            "SELECT id, candidate_name, email, role, department, ctc, joining_date, type, file_path FROM offer_letters WHERE id = $1",
            [req.params.id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Offer letter not found' });
        }

        const letter = existing.rows[0];
        if (!letter.email) {
            return res.status(400).json({ error: 'Candidate email is missing for this offer letter' });
        }
        if (!emailRegex.test(String(letter.email).trim())) {
            return res.status(400).json({ error: 'Candidate email format is invalid for this offer letter.' });
        }

        if (!letter.file_path) {
            return res.status(400).json({ error: 'Generated offer letter PDF is missing. Please regenerate before sending.' });
        }

        const attachmentPath = path.join(__dirname, '..', letter.file_path.replace(/^\/+/, '').replace(/\//g, path.sep));

        if (!fs.existsSync(attachmentPath)) {
            return res.status(400).json({ error: 'Generated offer letter PDF file not found on server. Please regenerate before sending.' });
        }

        await sendOfferLetterEmail({
            to: letter.email,
            candidateName: letter.candidate_name,
            role: letter.role,
            positionTitle: letter.role,
            department: letter.department,
            location: 'Hyderabad',
            ctc: letter.ctc,
            issueDate: null,
            joiningDate: letter.joining_date,
            type: letter.type || 'offer',
            attachmentPath,
            settings: statutorySettings
        });

        await pool.query("UPDATE offer_letters SET status = 'Sent' WHERE id = $1", [req.params.id]);
        res.json({ message: 'Offer letter sent successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update offer letter status (HR) ────────────────────────────
const updateOfferLetterStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const result = await pool.query(
            "UPDATE offer_letters SET status = $1 WHERE id = $2 RETURNING *",
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Bulk Send offer letters (HR) ──────────────────────────────
const bulkSendOfferLetters = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No offer letter IDs provided for bulk send' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const settingsRes = await pool.query(
            `SELECT basic_ratio,
                    hra_ratio,
                    conveyance_amount,
                    fixed_pf_deduction,
                    fixed_employer_pf_deduction,
                    fixed_insurance_deduction,
                    fixed_ptax_deduction
             FROM payroll_statutory_settings
             ORDER BY updated_at DESC
             LIMIT 1`
        );
        const statutorySettings = settingsRes.rows[0] || {};
        const results = { success: [], failures: [] };

        for (const id of ids) {
            try {
                const existing = await pool.query(
                    "SELECT id, candidate_name, email, role, department, ctc, joining_date, type, file_path FROM offer_letters WHERE id = $1",
                    [id]
                );

                if (existing.rows.length === 0) {
                    results.failures.push({ id, error: 'Offer letter not found' });
                    continue;
                }

                const letter = existing.rows[0];
                if (!letter.email || !emailRegex.test(String(letter.email).trim()) || !letter.file_path) {
                    results.failures.push({ id, candidate: letter.candidate_name, error: 'Missing email or PDF file' });
                    continue;
                }

                const attachmentPath = path.join(__dirname, '..', letter.file_path.replace(/^\/+/, '').replace(/\//g, path.sep));
                if (!fs.existsSync(attachmentPath)) {
                    results.failures.push({ id, candidate: letter.candidate_name, error: 'PDF file not found on server' });
                    continue;
                }

                await sendOfferLetterEmail({
                    to: letter.email,
                    candidateName: letter.candidate_name,
                    role: letter.role,
                    positionTitle: letter.role,
                    department: letter.department,
                    location: 'Hyderabad',
                    ctc: letter.ctc,
                    issueDate: null,
                    joiningDate: letter.joining_date,
                    type: letter.type || 'offer',
                    attachmentPath,
                    settings: statutorySettings
                });

                await pool.query("UPDATE offer_letters SET status = 'Sent' WHERE id = $1", [id]);
                results.success.push({ id, candidate: letter.candidate_name });

            } catch (itemErr) {
                console.error(`Bulk send failed for ID ${id}:`, itemErr.message);
                results.failures.push({ id, error: itemErr.message });
            }
        }

        res.json({
            message: `Bulk processing completed: ${results.success.length} sent, ${results.failures.length} failed.`,
            results
        });
    } catch (err) {
        console.error('bulkSendOfferLetters failed:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { createOfferLetter, getOfferLetters, sendOfferLetter, bulkSendOfferLetters, updateOfferLetterStatus };

