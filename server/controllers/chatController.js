const { Pool } = require('../db');
const { sendChatMessageNotificationEmail } = require('../services/emailService');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const isEmailNotificationEnabled = () => {
    const value = String(process.env.CHAT_MESSAGE_EMAIL_NOTIFICATIONS || '').toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
};

// Ensure all profiles have a matching employee record (for chat visibility)
const syncProfilesIntoEmployees = async () => {
    await pool.query(`
        INSERT INTO employees (full_name, email, role, department, employee_id, status)
        SELECT
            COALESCE(NULLIF(TRIM(REPLACE(SUBSTRING_INDEX(p.email, '@', 1), '.', ' ')), ''), 'User') AS full_name,
            p.email,
            CASE
                WHEN LOWER(COALESCE(p.role, '')) = 'admin' THEN 'Administrator'
                WHEN LOWER(COALESCE(p.role, '')) = 'hr' THEN 'HR Manager'
                ELSE 'Employee'
            END AS role,
            'General' AS department,
            p.employee_id,
            'Active' AS status
        FROM profiles p
        LEFT JOIN employees e ON LOWER(TRIM(e.email)) = LOWER(TRIM(p.email))
        WHERE e.id IS NULL
          AND p.email IS NOT NULL
          AND (p.status IS NULL OR LOWER(p.status) <> 'inactive')
    `);
};

// ─── Get contacts ────────────────────────────────────────────────
const getContacts = async (req, res) => {
    try {
        await syncProfilesIntoEmployees();

        const emp = await pool.query(`
            SELECT e.id FROM employees e 
            JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
            WHERE p.id = $1
        `, [req.user.id]);
        const myUuid = emp.rows[0]?.id;

        const result = await pool.query(`
            SELECT id, full_name, role, department, email, 
            (SELECT content FROM messages WHERE (sender_id = $1 AND receiver_id = employees.id) OR (sender_id = employees.id AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1) as last_msg,
            (SELECT created_at FROM messages WHERE (sender_id = $1 AND receiver_id = employees.id) OR (sender_id = employees.id AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1) as last_time
            FROM employees 
            WHERE email != $2
            ORDER BY last_time IS NULL, last_time DESC, full_name ASC
        `, [myUuid, req.user.email]);

        const onlineUsers = req.io.onlineUsers;
        const contacts = result.rows.map(c => ({
            ...c,
            isOnline: onlineUsers ? onlineUsers.has(c.id) : false
        }));

        res.json(contacts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get groups ──────────────────────────────────────────────────
const getGroups = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT g.* 
            FROM chat_groups g
            JOIN chat_group_members gm ON g.id = gm.group_id
            WHERE gm.employee_id = (
                SELECT e.id FROM employees e 
                JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
                WHERE p.id = $1
            )
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create group ──────────────────────────────────────────────────
const createGroup = async (req, res) => {
    const { name, memberIds = [] } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const emp = await pool.query(`
            SELECT e.id FROM employees e 
            JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
            WHERE p.id = $1
        `, [req.user.id]);
        const creatorId = emp.rows[0]?.id;

        if (!creatorId) throw new Error('Creator profile not found');

        // 1. Create group
        const groupRes = await client.query(
            'INSERT INTO chat_groups (name, created_by) VALUES ($1, $2) RETURNING *',
            [name, creatorId]
        );
        const group = groupRes.rows[0];

        // 2. Add members (including creator)
        const allMemberIds = Array.from(new Set([...memberIds, creatorId]));
        for (const mId of allMemberIds) {
            await client.query(
                'INSERT INTO chat_group_members (group_id, employee_id) VALUES ($1, $2)',
                [group.id, mId]
            );
        }

        await client.query('COMMIT');
        res.json(group);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: err.message || 'Server error' });
    } finally {
        client.release();
    }
};

// ─── Add members to group ──────────────────────────────────────────
const addMembers = async (req, res) => {
    const { groupId, memberIds } = req.body;
    console.log('[addMembers] groupId:', groupId, 'memberIds:', memberIds);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify the group exists
        const groupCheck = await client.query(
            'SELECT id FROM chat_groups WHERE id = $1',
            [groupId]
        );
        if (groupCheck.rows.length === 0) {
            throw new Error('Group not found');
        }

        for (const mId of memberIds) {
            // Check if already a member to avoid duplicates
            const existing = await client.query(
                'SELECT 1 FROM chat_group_members WHERE group_id = $1 AND employee_id = $2',
                [groupId, mId]
            );
            if (existing.rows.length === 0) {
                await client.query(
                    'INSERT INTO chat_group_members (group_id, employee_id) VALUES ($1, $2)',
                    [groupId, mId]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Members added successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[addMembers] Error:', err.message);
        res.status(500).json({ error: err.message || 'Server error' });
    } finally {
        client.release();
    }
};

// ─── Get chat history ────────────────────────────────────────────
const getHistory = async (req, res) => {
    const { type } = req.query;
    const { targetId } = req.params;

    try {
        const emp = await pool.query(`
            SELECT e.id FROM employees e 
            JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
            WHERE p.id = $1
        `, [req.user.id]);
        const myId = emp.rows[0]?.id;

        if (!myId) return res.status(404).json({ error: 'Profile not found' });

        let query = '';
        let params = [];

        if (type === 'group') {
            query = `
                SELECT m.*, e.full_name as sender_name 
                FROM messages m
                JOIN employees e ON m.sender_id = e.id
                WHERE m.group_id = $1 
                ORDER BY m.created_at ASC
            `;
            params = [targetId];
        } else {
            query = `
                SELECT m.*, e.full_name as sender_name 
                FROM messages m
                JOIN employees e ON m.sender_id = e.id
                WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
                   OR (m.sender_id = $2 AND m.receiver_id = $1)
                ORDER BY m.created_at ASC
            `;
            params = [myId, targetId];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Send message ────────────────────────────────────────────────
const sendMessage = async (req, res) => {
    const { content, receiver_id, group_id, attachment_url } = req.body;
    if (!content || !String(content).trim()) {
        if (!attachment_url) {
            return res.status(400).json({ error: 'Message content is required' });
        }
    }
    if (!receiver_id && !group_id) {
        return res.status(400).json({ error: 'receiver_id or group_id is required' });
    }
    try {
        const emp = await pool.query(`
            SELECT e.id FROM employees e 
            JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
            WHERE p.id = $1
        `, [req.user.id]);
        const sender_id = emp.rows[0]?.id;

        if (!sender_id) return res.status(404).json({ error: 'Profile not found' });

        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, group_id, content, attachment_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [sender_id, receiver_id || null, group_id || null, content, attachment_url || null]
        );

        const inserted = result.rows[0];

        // Get sender name
        const senderRes = await pool.query('SELECT full_name FROM employees WHERE id = $1', [sender_id]);
        const message = { ...inserted, sender_name: senderRes.rows[0]?.full_name || 'Unknown' };

        const roomId = group_id ? `group_${group_id}` : [sender_id, receiver_id].sort().join('_');
        req.io.to(roomId).emit('receive_message', message);

        // Also emit directly to both users' personal rooms (ensures delivery even if room join failed)
        if (!group_id && receiver_id) {
            req.io.to(String(receiver_id)).emit('receive_message', message);
            req.io.to(String(sender_id)).emit('receive_message', message);
        }

        // Respond immediately after message delivery. Notification side-effects should not block chat UX.
        res.json(message);

        // Create recipient notification for direct chats.
        if (!group_id && receiver_id && String(receiver_id) !== String(sender_id)) {
            void (async () => {
                try {
                    const recipientRes = await pool.query(
                        `SELECT p.id AS profile_id,
                                p.email,
                                COALESCE(e.full_name, p.email) AS recipient_name
                         FROM employees e
                         JOIN profiles p
                           ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
                           OR (p.employee_id IS NOT NULL AND p.employee_id::text = e.id::text)
                           OR (p.employee_id IS NOT NULL AND e.employee_id IS NOT NULL AND p.employee_id = e.employee_id)
                         WHERE e.id = $1
                         ORDER BY
                            CASE WHEN LOWER(TRIM(p.email)) = LOWER(TRIM(e.email)) THEN 0 ELSE 1 END,
                            CASE WHEN p.employee_id::text = e.id::text THEN 0 ELSE 1 END,
                            COALESCE(p.updated_at, '1970-01-01') DESC
                         LIMIT 1`,
                        [receiver_id]
                    );

                    const senderDisplayName = message.sender_name || 'Someone';
                    const preview = String(content || attachment_url || 'New message').trim();
                    const safePreview = preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;

                    let emittedPayload = {
                        id: `rt_msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                        title: 'New message received',
                        message: `${senderDisplayName}: ${safePreview}`,
                        type: 'chat_message',
                        is_read: false,
                        created_at: new Date().toISOString(),
                    };

                    if (recipientRes.rows[0]?.profile_id) {
                        const notificationRes = await pool.query(
                            `INSERT INTO notifications (user_id, title, message, type)
                             VALUES ($1, $2, $3, $4)
                             RETURNING id, user_id, title, message, type, is_read, created_at`,
                            [
                                recipientRes.rows[0].profile_id,
                                'New message received',
                                `${senderDisplayName}: ${safePreview}`,
                                'chat_message',
                            ]
                        );

                        emittedPayload = notificationRes.rows[0];

                        // Emit to both known identity rooms for reliability across app areas.
                        req.io.to(recipientRes.rows[0].profile_id).emit('notification_created', emittedPayload);
                        req.io.to(String(receiver_id)).emit('notification_created', emittedPayload);

                        if (isEmailNotificationEnabled() && recipientRes.rows[0].email) {
                            sendChatMessageNotificationEmail({
                                to: recipientRes.rows[0].email,
                                recipientName: recipientRes.rows[0].recipient_name,
                                senderName: senderDisplayName,
                                messagePreview: safePreview,
                            }).catch((emailErr) => {
                                console.warn('[Chat Email] Notification email failed:', emailErr.message);
                            });
                        }
                    } else {
                        // Fallback realtime emit even if DB profile lookup fails.
                        req.io.to(String(receiver_id)).emit('notification_created', emittedPayload);
                        console.warn('[Chat Notify] Recipient profile not found for receiver_id:', receiver_id);
                    }
                } catch (notifyErr) {
                    // Do not block chat delivery if notification persistence/realtime emit fails.
                    console.warn('[Chat Notify] Failed to create/emit recipient notification:', notifyErr.message);
                }
            })();
        }
        return;
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Clear chat history ──────────────────────────────────────────
const clearHistory = async (req, res) => {
    const { targetId } = req.params;
    const { type } = req.query; // 'group' or 'direct'

    try {
        const emp = await pool.query(`
            SELECT e.id FROM employees e 
            JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
            WHERE p.id = $1
        `, [req.user.id]);
        const myId = emp.rows[0]?.id;

        if (!myId) return res.status(404).json({ error: 'Profile not found' });

        if (type === 'group') {
            // For group chats, delete all messages in the group
            await pool.query('DELETE FROM messages WHERE group_id = $1', [targetId]);
        } else {
            // Delete messages where sender/receiver match both directions
            await pool.query(`
                DELETE FROM messages 
                WHERE 
                    (sender_id = $1 AND receiver_id = $2) 
                    OR 
                    (sender_id = $2 AND receiver_id = $1)
            `, [myId, targetId]);
        }

        res.json({ message: 'Chat history cleared successfully' });
    } catch (err) {
        console.error('Failed to clear history:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Leave group ──────────────────────────────────────────────────
const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        
        if (!groupId) {
            return res.status(400).json({ error: 'groupId is required' });
        }

        // Get employee ID from profile
        const emp = await pool.query(`
            SELECT e.id FROM employees e 
            JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id 
            WHERE p.id = $1
        `, [req.user.id]);
        const employeeId = emp.rows[0]?.id;

        if (!employeeId) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }

        // Remove employee from group
        const result = await pool.query(
            'DELETE FROM chat_group_members WHERE group_id = $1 AND employee_id = $2 RETURNING *',
            [groupId, employeeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not a member of this group' });
        }

        res.json({ message: 'Successfully left the group' });
    } catch (err) {
        console.error('Failed to leave group:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get group members ─────────────────────────────────────────────
const getGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        
        if (!groupId) {
            return res.status(400).json({ error: 'groupId is required' });
        }

        const result = await pool.query(`
            SELECT e.id, e.full_name, e.email, e.role, e.department
            FROM employees e
            JOIN chat_group_members cgm ON e.id = cgm.employee_id
            WHERE cgm.group_id = $1
            ORDER BY e.full_name
        `, [groupId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Failed to get group members:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getContacts,
    getGroups,
    createGroup,
    addMembers,
    leaveGroup,
    getGroupMembers,
    getHistory,
    clearHistory,
    sendMessage
};
