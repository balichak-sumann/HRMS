require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool, types } = require('./db');

// Fix: Return DATE columns as plain 'YYYY-MM-DD' strings instead of
// timezone-shifted JavaScript Date objects (prevents IST offset bug)
types.setTypeParser(1082, (val) => val); // 1082 = DATE OID

const path = require('path');

const app = express();
const server = require('http').createServer(app);
const { scheduleCelebrationJob, processCelebrations } = require('./services/celebrationService');
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
console.log(`[Startup] PORT env=${process.env.PORT || '(unset)'} HOST env=${process.env.HOST || '(unset)'}`);

// Middleware
app.use(cors());
app.use((req, res, next) => {
    console.log(`[Request]: ${req.method} ${req.url}`);
    next();
});
app.use(express.json({ limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
}

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Attach io to req for use in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/offer-letters', require('./routes/offerLetters'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/drive', require('./routes/drive'));
app.use('/api/user', require('./routes/user'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/leave-encashment', require('./routes/leaveEncashment'));
app.use('/api/offboarding', require('./routes/offboarding'));
app.use('/api/helpdesk', require('./routes/helpdesk'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/income-tax', require('./routes/incomeTax'));
app.use('/api/salary-revisions', require('./routes/salaryRevisions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/lookups', require('./routes/lookups'));

// Socket.io Logic
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', async (data) => {
        // data can be a string (legacy) or an object { roomId, userId, name }
        const roomId = typeof data === 'string' ? data : data.roomId;
        const userId = typeof data === 'string' ? socket.userId : data.userId;
        const name = typeof data === 'object' ? data.name : null;

        socket.join(roomId);
        if (userId) socket.userId = userId;
        if (name) socket.userName = name;

        console.log(`User ${name || userId || socket.id} joined room: ${roomId}`);

        // Notify others in the room that a new user has joined
        if (roomId.startsWith('meeting_')) {
            socket.to(roomId).emit('user_joined', {
                userId: userId,
                socketId: socket.id,
                name: name || socket.userName
            });

            // If first person joining, record it
            const meetingId = roomId.replace('meeting_', '');
            try {
                // Only update if NULL
                await pool.query('UPDATE meetings SET first_person_joined_at = COALESCE(first_person_joined_at, NOW()) WHERE id = $1', [meetingId]);
            } catch (err) {
                console.error(`[Socket] Error updating first_person_joined_at for ${meetingId}:`, err.message);
            }
        }
    });

    // Join personal signaling room
    socket.on('identify', (userId) => {
        if (!userId) {
            console.warn(`[Socket] User ${socket.id} tried to identify with null/undefined userId`);
            return;
        }
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`[Socket] User identified: socket=${socket.id}, userId=${userId}`);

        // Broadcast that this user is now online
        io.emit('user_online', userId);
    });

    socket.on('send_message', (data) => {
        // Broadcast to specific room (group or 1-1)
        io.to(data.roomId).emit('receive_message', data);
    });

    socket.on('send_meeting_chat', (data) => {
        socket.to(data.roomId).emit('receive_meeting_chat', data);
    });

    socket.on('leave_room', async (data) => {
        const roomId = typeof data === 'string' ? data : data?.roomId;
        const userId = typeof data === 'object' ? data?.userId : socket.userId;
        if (!roomId) return;

        socket.leave(roomId);
        if (roomId.startsWith('meeting_')) {
            if (userId) socket.to(roomId).emit('user_left', userId);

            // Check if room is empty
            const room = io.sockets.adapter.rooms.get(roomId);
            if (!room || room.size === 0) {
                console.log(`[Socket] Meeting room ${roomId} is now empty.`);
            }
        }
    });

    // --- Signaling for Voice/Video Calls ---
    socket.on('call_user', (data) => {
        console.log(`[Call] Signaling: call_user from ${data.from} to ${data.to} (Room check: ${io.sockets.adapter.rooms.has(data.to)})`);
        // data contains: to (receiver id), offer, from (sender info/id), type (voice/video)
        io.to(data.to).emit('incoming_call', {
            from: data.from,
            offer: data.offer,
            type: data.type,
            caller_name: data.caller_name
        });
    });

    socket.on('answer_call', (data) => {
        console.log(`Answer from ${data.from} to ${data.to}`);
        // data contains: to (caller id), answer
        io.to(data.to).emit('call_answered', {
            answer: data.answer,
            from: data.from
        });
    });

    socket.on('ice_candidate', (data) => {
        // data contains: to, candidate, from
        console.log(`ICE candidate from ${data.from} to ${data.to}`);
        io.to(data.to).emit('ice_candidate', {
            candidate: data.candidate,
            from: data.from
        });
    });

    socket.on('hangup', (data) => {
        // data contains: to
        console.log(`Hangup signal to ${data.to}`);
        io.to(data.to).emit('call_ended');
    });

    socket.on('disconnecting', async () => {
        if (!socket.userId) return;

        // Notify meeting rooms before socket fully leaves them.
        for (const roomId of socket.rooms) {
            if (roomId.startsWith('meeting_')) {
                socket.to(roomId).emit('user_left', socket.userId);

                // Check if this is the last person leaving
                const room = io.sockets.adapter.rooms.get(roomId);
                if (room && room.size === 1) {
                    console.log(`[Socket] Last person leaving room ${roomId}.`);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit('user_offline', socket.userId);
        }
    });
});

// Attach onlineUsers to io so it can be checked in controllers
io.onlineUsers = onlineUsers;

scheduleCelebrationJob(io);

if (process.env.CELEBRATIONS_RUN_ON_STARTUP === 'true') {
    processCelebrations(io)
        .then((result) => {
            console.log(`[Celebrations] Startup run completed. created=${result.created}, skipped=${result.skipped}`);
        })
        .catch((err) => {
            console.error('[Celebrations] Startup run failed:', err.message);
        });
}

// Test Route
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1 AS ok');
        res.json({ status: 'IndusInnovate Server Running', database: 'Connected' });
    } catch (err) {
        console.error('[Health] Database check failed:', err.message);
        res.status(503).json({
            status: 'IndusInnovate Server Running',
            database: 'Disconnected',
            error: 'Database connection failed',
        });
    }
});

if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../dist');
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
            return next();
        }
        return res.sendFile(path.join(distPath, 'index.html'));
    });
}

server.on('error', (err) => {
    console.error('[Startup] Server failed to bind:', err.message);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    console.log(`[Startup] Server running on ${HOST}:${PORT}`);
});
