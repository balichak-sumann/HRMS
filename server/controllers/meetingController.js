const { Pool } = require('pg');
const { sendMeetingInvite } = require('../services/emailService');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Create meeting ──────────────────────────────────────────────
const createMeeting = async (req, res) => {
    const { title, agenda, date_time, duration, participants, meeting_type } = req.body;
    
    // Validate date_time is not in the past (allow 1-minute buffer for network latency)
    if (meeting_type !== 'instant' && date_time) {
        const now = new Date();
        const selectedDate = new Date(date_time);
        if (selectedDate < new Date(now.getTime() - 60000)) {
            return res.status(400).json({ error: 'Cannot schedule a meeting for a past date' });
        }
    }

    try {
        const emp = await pool.query(
            `SELECT e.id, e.full_name, e.email FROM employees e 
             JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
             WHERE p.id = $1`,
            [req.user.id]
        );
        const creator_id = emp.rows[0]?.id;
        const creator_name = emp.rows[0]?.full_name;

        if (!creator_id) return res.status(404).json({ error: 'Employee profile not found' });

        const room_id = Math.random().toString(36).substring(7);
        const room_url = `https://indusinnovate.daily.co/${room_id}`;

        const result = await pool.query(
            'INSERT INTO meetings (title, agenda, date_time, duration, room_url, created_by, meeting_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, agenda, date_time, duration || 60, room_url, creator_id, meeting_type || 'scheduled']
        );
        const meeting = result.rows[0];

        if (participants && participants.length > 0) {
            const values = participants.map(pId => `('${meeting.id}', '${pId}')`).join(',');
            await pool.query(`INSERT INTO meeting_participants (meeting_id, employee_id) VALUES ${values}`);

            // Notify and email each participant
            for (const pId of participants) {
                const pRes = await pool.query(
                    `SELECT e.full_name, e.email, p.id as profile_id FROM employees e
                     LEFT JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id
                     WHERE e.id = $1 LIMIT 1`,
                    [pId]
                );
                const participant = pRes.rows[0];
                if (participant) {
                    // Socket notification
                    if (req.io && participant.profile_id) {
                        const notifMsg = `${creator_name || 'Admin'} invited you to the meeting "${title}".`;
                        const notification = await pool.query(
                            `INSERT INTO notifications (user_id, title, message, type)
                             VALUES ($1, $2, $3, $4)
                             RETURNING *`,
                            [participant.profile_id, 'Meeting Invite', notifMsg, 'meeting']
                        );
                        req.io.to(participant.profile_id).emit('notification_created', notification.rows[0]);
                        req.io.to(participant.profile_id).emit('meeting_invite', {
                            meetingId: meeting.id,
                            title,
                            agenda,
                            date_time,
                            message: notifMsg,
                            inviterName: creator_name || 'Admin',
                        });
                    }
                    // Email
                    if (participant.email) {
                        try {
                            await sendMeetingInvite({
                                to: participant.email,
                                name: participant.full_name || participant.email,
                                title,
                                scheduledAt: date_time,
                                agenda,
                                meetingLink: room_url,
                            });
                        } catch (emailErr) {
                            console.warn('Failed to send meeting invite email:', emailErr.message);
                        }
                    }
                }
            }
        }

        res.json(meeting);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get meetings ────────────────────────────────────────────────
const getMeetings = async (req, res) => {
    try {
        const profileRes = await pool.query(
            `SELECT p.role, e.id as employee_id FROM profiles p
             LEFT JOIN employees e ON p.email = e.email OR p.employee_id = e.employee_id
             WHERE p.id = $1`,
            [req.user.id]
        );
        const userRole = profileRes.rows[0]?.role;
        const myId = profileRes.rows[0]?.employee_id;

        let result;
        if (userRole === 'admin') {
            result = await pool.query(`
                SELECT m.*, e.full_name as creator_name
                FROM meetings m
                JOIN employees e ON m.created_by = e.id
                WHERE COALESCE(m.status, 'active') != 'completed'
                  AND COALESCE(m.meeting_type, 'scheduled') = 'scheduled'
                  AND NOT (m.title LIKE 'Group Call:%' AND COALESCE(m.agenda, '') = 'Live group discussion')
                ORDER BY m.date_time ASC
            `);
        } else {
            if (!myId) return res.json([]);
            result = await pool.query(`
                SELECT DISTINCT m.*, e.full_name as creator_name
                FROM meetings m
                JOIN employees e ON m.created_by = e.id
                LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
                WHERE (m.created_by = $1 OR mp.employee_id = $1)
                  AND COALESCE(m.status, 'active') != 'completed'
                  AND COALESCE(m.meeting_type, 'scheduled') = 'scheduled'
                  AND NOT (m.title LIKE 'Group Call:%' AND COALESCE(m.agenda, '') = 'Live group discussion')
                ORDER BY m.date_time ASC
            `, [myId]);
        }
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get meeting by ID ──────────────────────────────────────────
const getMeetingById = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, e.full_name as creator_name 
            FROM meetings m 
            JOIN employees e ON m.created_by = e.id 
            WHERE m.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });

        const meeting = result.rows[0];

        const participants = await pool.query(`
            SELECT e.id, e.full_name, e.role, e.department
            FROM employees e
            JOIN meeting_participants mp ON e.id = mp.employee_id
            WHERE mp.meeting_id = $1
        `, [req.params.id]);

        meeting.participants = participants.rows;
        res.json(meeting);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── End meeting ──────────────────────────────────────────────────
const endMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE meetings SET status = 'completed' WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });

        res.json({ message: 'Meeting ended successfully', meeting: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Add participant to meeting ────────────────────────────────
const addParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id } = req.body;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        // Check if meeting exists
        const meetingResult = await pool.query('SELECT * FROM meetings WHERE id = $1', [id]);
        if (meetingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Check if participant already exists
        const existingResult = await pool.query(
            'SELECT * FROM meeting_participants WHERE meeting_id = $1 AND employee_id = $2',
            [id, employee_id]
        );

        let participantRow = existingResult.rows[0] || null;
        if (!participantRow) {
            const insertResult = await pool.query(
                'INSERT INTO meeting_participants (meeting_id, employee_id) VALUES ($1, $2) RETURNING *',
                [id, employee_id]
            );
            participantRow = insertResult.rows[0];
        }

        // Resolve profile id for notification delivery
        const targetProfileRes = await pool.query(
            `SELECT p.id AS profile_id, e.full_name AS employee_name
             FROM employees e
             LEFT JOIN profiles p
               ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
               OR (
                    p.employee_id IS NOT NULL
                AND e.employee_id IS NOT NULL
                AND LOWER(TRIM(p.employee_id)) = LOWER(TRIM(e.employee_id))
               )
             WHERE e.id = $1
             LIMIT 1`,
            [employee_id]
        );

        const inviterName = req.user?.name || req.user?.email || 'Admin';
        const meeting = meetingResult.rows[0];
        const inviteMessage = `${inviterName} added you to the meeting "${meeting.title}".`;
        const profileId = targetProfileRes.rows[0]?.profile_id || null;

        if (profileId) {
            const notification = await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [profileId, 'Meeting Invite', inviteMessage, 'meeting']
            );

            // Socket notification
            if (req.io) {
                req.io.to(profileId).emit('notification_created', notification.rows[0]);
                req.io.to(profileId).emit('meeting_invite', {
                    meetingId: meeting.id,
                    title: meeting.title,
                    agenda: meeting.agenda,
                    date_time: meeting.date_time,
                    message: inviteMessage,
                    inviterName,
                });
            }

            // Email
            const targetEmpRes = await pool.query(
                `SELECT e.email, e.full_name FROM employees e WHERE e.id = $1 LIMIT 1`,
                [employee_id]
            );
            const targetEmp = targetEmpRes.rows[0];
            if (targetEmp?.email) {
                try {
                    await sendMeetingInvite({
                        to: targetEmp.email,
                        name: targetEmp.full_name || targetEmp.email,
                        title: meeting.title,
                        scheduledAt: meeting.date_time,
                        agenda: meeting.agenda,
                        meetingLink: meeting.room_url,
                    });
                } catch (emailErr) {
                    console.warn('Failed to send meeting invite email:', emailErr.message);
                }
            }
        }

        res.json({ message: 'Participant added successfully', participant: participantRow });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createMeeting,
    getMeetings,
    getMeetingById,
    endMeeting,
    addParticipant,
};