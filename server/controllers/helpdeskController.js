const { Pool } = require('../db');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Helper: Get employee by email ───────────────────────────────
const getEmployeeByEmail = async (email) => {
    const result = await pool.query(
        'SELECT id, role FROM employees WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
};

// ─── Helper: Get HR team members ─────────────────────────────────
const getHRTeamMembers = async () => {
    const result = await pool.query(
        `SELECT e.id, e.full_name, e.email
         FROM employees e
         LEFT JOIN profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
         WHERE LOWER(COALESCE(p.role, e.role, '')) IN ('hr', 'admin')
         ORDER BY e.full_name ASC`
    );
    return result.rows;
};

// ─── Helper: Emit real-time notification via Socket.IO ───────────
const emitTicketUpdate = (io, ticketId, targetUserId, eventType, data) => {
    const payload = {
        ticketId,
        targetUserId,
        ...data,
        timestamp: new Date()
    };

    io.to('hr_helpdesk').emit(eventType, payload);
    if (targetUserId) {
        io.to(`employee_${targetUserId}`).emit(eventType, payload);
    }
};

// ─── Create ticket ──────────────────────────────────────────────
const createTicket = async (req, res) => {
    const { category, subject, description, priority } = req.body;
    try {
        const emp = await getEmployeeByEmail(req.user.email);
        if (!emp) return res.status(404).json({ error: 'Employee not found' });

        const result = await pool.query(
            `INSERT INTO helpdesk_tickets (employee_id, category, subject, description, priority)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [emp.id, category, subject, description, priority || 'medium']
        );

        const ticket = result.rows[0];

        // Emit notification to HR team
        if (req.io) {
            req.io.to('hr_helpdesk').emit('ticket_created', {
                ticketId: ticket.id,
                employeeName: req.user.email,
                category: ticket.category,
                subject: ticket.subject,
                timestamp: new Date()
            });
        }

        res.status(201).json(ticket);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get my tickets (employee) ───────────────────────────────────
const getMyTickets = async (req, res) => {
    const { status, category } = req.query;
    try {
        const emp = await getEmployeeByEmail(req.user.email);
        if (!emp) return res.status(404).json({ error: 'Employee not found' });

        let query = `
            SELECT 
                t.*,
                COUNT(c.id) as comment_count,
                (SELECT COUNT(*) FROM helpdesk_attachments WHERE ticket_id = t.id) as attachment_count,
                a.full_name as assigned_to_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_comments c ON t.id = c.ticket_id
            LEFT JOIN employees a ON t.assigned_to = a.id
            WHERE t.employee_id = $1
        `;
        
        let params = [emp.id];
        let paramIndex = 2;

        if (status) {
            query += ` AND t.status = $${paramIndex++}`;
            params.push(status);
        }

        if (category) {
            query += ` AND t.category = $${paramIndex++}`;
            params.push(category);
        }

        query += ` GROUP BY t.id, a.full_name ORDER BY t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get tickets assigned to me (employee) ──────────────────────
const getAssignedTickets = async (req, res) => {
    const { status, category } = req.query;
    try {
        const emp = await getEmployeeByEmail(req.user.email);
        if (!emp) return res.status(404).json({ error: 'Employee not found' });

        let query = `
            SELECT 
                t.*,
                e.full_name as employee_name,
                e.email as employee_email,
                COUNT(c.id) as comment_count,
                (SELECT COUNT(*) FROM helpdesk_attachments WHERE ticket_id = t.id) as attachment_count,
                a.full_name as assigned_to_name
            FROM helpdesk_tickets t
            LEFT JOIN employees e ON t.employee_id = e.id
            LEFT JOIN helpdesk_comments c ON t.id = c.ticket_id
            LEFT JOIN employees a ON t.assigned_to = a.id
            WHERE t.assigned_to = $1
        `;
        
        let params = [emp.id];
        let paramIndex = 2;

        if (status) {
            query += ` AND t.status = $${paramIndex++}`;
            params.push(status);
        }

        if (category) {
            query += ` AND t.category = $${paramIndex++}`;
            params.push(category);
        }

        query += ` GROUP BY t.id, e.id, a.id ORDER BY t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get all tickets for HR with filters ─────────────────────────
const getAllTickets = async (req, res) => {
    const { status, category, priority, assigned_to } = req.query;
    try {
        let query = `
            SELECT 
                t.*,
                e.full_name as employee_name,
                e.email as employee_email,
                e.department as employee_department,
                a.full_name as assigned_to_name,
                COUNT(c.id) as comment_count,
                (SELECT COUNT(*) FROM helpdesk_attachments WHERE ticket_id = t.id) as attachment_count
            FROM helpdesk_tickets t
            LEFT JOIN employees e ON t.employee_id = e.id
            LEFT JOIN helpdesk_comments c ON t.id = c.ticket_id
            LEFT JOIN employees a ON t.assigned_to = a.id
            WHERE 1=1
        `;

        let params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND t.status = $${paramIndex++}`;
            params.push(status);
        }

        if (category) {
            query += ` AND t.category = $${paramIndex++}`;
            params.push(category);
        }

        if (priority) {
            query += ` AND t.priority = $${paramIndex++}`;
            params.push(priority);
        }

        if (assigned_to) {
            query += ` AND t.assigned_to = $${paramIndex++}`;
            params.push(assigned_to);
        }

        query += ` GROUP BY t.id, e.full_name, e.email, e.department, a.full_name ORDER BY t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get ticket details with comments ────────────────────────────
const getTicketDetails = async (req, res) => {
    const { ticketId } = req.params;
    try {
        const actor = await getEmployeeByEmail(req.user.email);
        if (!actor) return res.status(404).json({ error: 'Employee not found' });

        // Get ticket with attachments
        const ticketRes = await pool.query(
            `SELECT 
                t.*,
                e.full_name as employee_name,
                e.email as employee_email,
                e.department as employee_department,
                a.full_name as assigned_to_name
             FROM helpdesk_tickets t
             LEFT JOIN employees e ON t.employee_id = e.id
             LEFT JOIN employees a ON t.assigned_to = a.id
             WHERE t.id = $1`,
            [ticketId]
        );

        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketRes.rows[0];
        if (req.user.role === 'employee' && ticket.employee_id !== actor.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get comments
        const commentsRes = await pool.query(
            `SELECT c.*, e.full_name as user_name, e.email as user_email
             FROM helpdesk_comments c
             LEFT JOIN employees e ON c.user_id = e.id
             WHERE c.ticket_id = $1
             ORDER BY c.created_at ASC`,
            [ticketId]
        );

        // Get attachments
        const attachmentsRes = await pool.query(
            `SELECT * FROM helpdesk_attachments WHERE ticket_id = $1 ORDER BY created_at ASC`,
            [ticketId]
        );

        res.json({
            ticket,
            comments: commentsRes.rows,
            attachments: attachmentsRes.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Add comment to ticket ───────────────────────────────────────
const addComment = async (req, res) => {
    const { ticketId } = req.params;
    const { comment_text } = req.body;
    try {
        const emp = await getEmployeeByEmail(req.user.email);
        if (!emp) return res.status(404).json({ error: 'Employee not found' });

        // Verify ticket exists
        const ticketRes = await pool.query(
            'SELECT employee_id FROM helpdesk_tickets WHERE id = $1',
            [ticketId]
        );
        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticketOwnerId = ticketRes.rows[0].employee_id;

        if (req.user.role === 'employee' && emp.id !== ticketOwnerId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Add comment
        const commentRes = await pool.query(
            `INSERT INTO helpdesk_comments (ticket_id, user_id, comment_text)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [ticketId, emp.id, comment_text]
        );

        // Get user name
        const userRes = await pool.query(
            'SELECT full_name FROM employees WHERE id = $1',
            [emp.id]
        );

        const comment = {
            ...(commentRes.rows[0] || {
                id: ticketId,
                user_id: emp.id,
                comment_text,
                created_at: new Date()
            }),
            user_name: userRes.rows[0]?.full_name || 'Unknown',
            user_email: req.user.email
        };

        // Emit real-time notification
        if (req.io) {
            emitTicketUpdate(req.io, ticketId, ticketOwnerId, 'comment_added', {
                comment,
                commenterRole: req.user.role
            });
        }

        res.status(201).json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update ticket assignment (HR only) ──────────────────────────
const updateAssignment = async (req, res) => {
    const { ticketId } = req.params;
    const { assigned_to } = req.body;
    try {
        const result = await pool.query(
            `UPDATE helpdesk_tickets 
             SET assigned_to = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [assigned_to || null, ticketId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = result.rows[0];

        // Get assignee name if assigned
        let assigneeName = null;
        if (assigned_to) {
            const empRes = await pool.query(
                'SELECT full_name FROM employees WHERE id = $1',
                [assigned_to]
            );
            assigneeName = empRes.rows[0]?.full_name;
        }

        // Emit real-time notification
        if (req.io) {
            emitTicketUpdate(req.io, ticketId, ticket.employee_id, 'assignment_changed', {
                assigned_to,
                assigned_to_name: assigneeName,
                updated_by_role: req.user.role || 'hr'
            });

            // Create bell/toast notification for ticket owner
            try {
                const ownerProfileRes = await pool.query(
                    `SELECT p.id AS profile_id
                     FROM employees e
                     JOIN profiles p
                       ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
                       OR (p.employee_id IS NOT NULL AND p.employee_id::text = e.id::text)
                       OR (p.employee_id IS NOT NULL AND e.employee_id IS NOT NULL AND p.employee_id = e.employee_id)
                     WHERE e.id = $1
                     LIMIT 1`,
                    [ticket.employee_id]
                );

                const notificationMessage = assigned_to
                    ? `Your ticket was assigned to ${assigneeName || 'a team member'}.`
                    : 'Your ticket assignment was cleared.';

                if (ownerProfileRes.rows[0]?.profile_id) {
                    const notificationRes = await pool.query(
                        `INSERT INTO notifications (user_id, title, message, type)
                         VALUES ($1, $2, $3, $4)
                         RETURNING id, user_id, title, message, type, is_read, created_at`,
                        [
                            ownerProfileRes.rows[0].profile_id,
                            'Ticket assignment updated',
                            notificationMessage,
                            'helpdesk_assignment',
                        ]
                    );

                    req.io.to(ownerProfileRes.rows[0].profile_id).emit('notification_created', notificationRes.rows[0]);
                    req.io.to(String(ticket.employee_id)).emit('notification_created', notificationRes.rows[0]);
                } else {
                    req.io.to(String(ticket.employee_id)).emit('notification_created', {
                        id: `rt_assign_${Date.now()}`,
                        title: 'Ticket assignment updated',
                        message: notificationMessage,
                        type: 'helpdesk_assignment',
                        is_read: false,
                        created_at: new Date().toISOString(),
                    });
                }
            } catch (notifyErr) {
                console.warn('[Helpdesk] Assignment notification failed:', notifyErr.message);
            }
        }

        res.json({ ...ticket, assigned_to_name: assigneeName });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update ticket status (HR only) ──────────────────────────────
const updateStatus = async (req, res) => {
    const { ticketId } = req.params;
    const { status } = req.body;
    try {
        const updates = { updated_at: 'NOW()' };
        const params = [status, ticketId];
        let paramIndex = 3;

        // Set resolved_at if status becomes resolved
        const setClause = status === 'resolved'
            ? `status = $1, resolved_at = NOW(), updated_at = NOW()`
            : status === 'closed'
            ? `status = $1, closed_at = NOW(), updated_at = NOW()`
            : `status = $1, updated_at = NOW()`;

        const result = await pool.query(
            `UPDATE helpdesk_tickets 
             SET ${setClause}
             WHERE id = $2
             RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = result.rows[0];

        // Emit real-time notification to employee
        if (req.io) {
            emitTicketUpdate(req.io, ticketId, ticket.employee_id, 'status_changed', {
                status,
                updated_by_role: 'hr'
            });
        }

        res.json(ticket);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get HR dashboard stats ─────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        // Open tickets by category
        const categoryStatsRes = await pool.query(`
            SELECT category, COUNT(*) as count
            FROM helpdesk_tickets
            WHERE status IN ('open', 'in_progress')
            GROUP BY category
        `);

        // Average resolution time
        const resolutionTimeRes = await pool.query(`
            SELECT 
                AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours,
                COUNT(*) as total_resolved
            FROM helpdesk_tickets
            WHERE resolved_at IS NOT NULL
        `);

        // Total open tickets
        const openTicketsRes = await pool.query(`
            SELECT COUNT(*) as count
            FROM helpdesk_tickets
            WHERE status = 'open'
        `);

        // Tickets by priority
        const priorityStatsRes = await pool.query(`
            SELECT priority, COUNT(*) as count
            FROM helpdesk_tickets
            WHERE status IN ('open', 'in_progress')
            GROUP BY priority
        `);

        res.json({
            openTicketCount: openTicketsRes.rows[0]?.count || 0,
            categoryStats: categoryStatsRes.rows,
            priorityStats: priorityStatsRes.rows,
            totalResolved: Number(resolutionTimeRes.rows[0]?.total_resolved || 0),
            averageResolutionTime: resolutionTimeRes.rows[0]?.avg_hours
                ? Math.round(resolutionTimeRes.rows[0].avg_hours * 10) / 10
                : 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get HR team members ─────────────────────────────────────────
const getTeamMembers = async (req, res) => {
    try {
        const result = await pool.query(
              `SELECT e.id, e.full_name, e.email, e.department
               FROM employees e
               LEFT JOIN profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
               WHERE LOWER(COALESCE(p.role, e.role, '')) IN ('hr', 'admin')
               ORDER BY e.full_name ASC`,
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Upload attachment ───────────────────────────────────────────
const uploadAttachment = async (req, res) => {
    const { ticketId } = req.params;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Verify ticket exists
        const ticketRes = await pool.query(
            'SELECT id FROM helpdesk_tickets WHERE id = $1',
            [ticketId]
        );
        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Store attachment in database
        const attachment = await pool.query(
            `INSERT INTO helpdesk_attachments (ticket_id, file_path, file_name, file_size)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [ticketId, req.file.path, req.file.originalname, req.file.size]
        );

        res.status(201).json(attachment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Download attachment ─────────────────────────────────────────
const downloadAttachment = async (req, res) => {
    const { attachmentId } = req.params;
    try {
        const result = await pool.query(
            'SELECT file_path, file_name FROM helpdesk_attachments WHERE id = $1',
            [attachmentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const { file_path, file_name } = result.rows[0];
        const path = require('path');
        const absolutePath = path.isAbsolute(file_path)
            ? file_path
            : path.join(__dirname, '..', file_path);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'File not found on server. It may have been moved or deleted.' });
        }

        res.download(absolutePath, file_name);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createTicket,
    getMyTickets,
    getAssignedTickets,
    getAllTickets,
    getTicketDetails,
    addComment,
    updateAssignment,
    updateStatus,
    getDashboardStats,
    getTeamMembers,
    uploadAttachment,
    downloadAttachment
};
