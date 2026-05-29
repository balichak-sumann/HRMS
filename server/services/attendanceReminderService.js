/**
 * Attendance Reminder Service
 * 1. Sends reminder emails to employees who haven't checked in:
 *    - 5 minutes before their shift start time
 *    - At their shift start time
 * 2. Auto-checks out employees who have been checked in for 12+ hours without checking out
 * 
 * Default shift: 9:30 AM - 6:30 PM unless overridden in shift management.
 */
const cron = require('node-cron');
const { Pool } = require('../db');
const { sendMail } = require('./emailService');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FROM = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_FROM || `"IndusInnovate Technologies" <${process.env.EMAIL_HOST_USER || process.env.EMAIL_USER || ''}>`;

const DEFAULT_SHIFT_START = '09:30';
const DEFAULT_SHIFT_END = '18:30';

const getIstNow = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

const formatLocalYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getIstTimeHHMM = () => {
    const now = getIstNow();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

/**
 * Get the shift start time for an employee. Falls back to default 09:30.
 */
const getEmployeeShiftStart = async (employeeId) => {
    try {
        const today = formatLocalYmd(getIstNow());
        const result = await pool.query(`
            SELECT s.start_time
            FROM employee_shift_assignments esa
            JOIN shifts s ON s.id = esa.shift_id
            WHERE esa.employee_id = $1
              AND esa.effective_from <= $2
              AND (esa.effective_to IS NULL OR esa.effective_to >= $2)
            ORDER BY esa.effective_from DESC
            LIMIT 1
        `, [employeeId, today]);

        if (result.rows.length > 0 && result.rows[0].start_time) {
            return String(result.rows[0].start_time).slice(0, 5); // "HH:MM"
        }
    } catch (err) {
        // Ignore — use default
    }
    return DEFAULT_SHIFT_START;
};

/**
 * Send check-in reminder emails to employees who:
 * - Have attendance_reminder enabled
 * - Haven't checked in today
 * - Are not on approved leave
 * - It's a working day (not weekend, not holiday)
 * - Current time matches their shift start (or 5 min before)
 */
const sendCheckInReminders = async (minutesBefore = 0) => {
    try {
        const now = getIstNow();
        const today = formatLocalYmd(now);
        const dayOfWeek = now.getDay();

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) return;

        // Skip if today is a holiday
        const holidayCheck = await pool.query(
            'SELECT id FROM holidays WHERE date = $1 LIMIT 1',
            [today]
        );
        if (holidayCheck.rows.length > 0) return;

        const currentTime = getIstTimeHHMM();

        // Get employees who have reminder enabled and haven't checked in today
        const result = await pool.query(`
            SELECT e.id, e.full_name, e.email
            FROM employees e
            JOIN profiles p ON (p.employee_uuid = e.id OR LOWER(TRIM(p.email)) = LOWER(TRIM(e.email)))
            JOIN user_settings us ON us.profile_id = p.id
            WHERE us.attendance_reminder = 1
              AND e.status = 'active'
              AND LOWER(COALESCE(p.role, '')) NOT IN ('admin', 'hr')
              AND LOWER(COALESCE(e.role, '')) NOT IN ('admin', 'hr', 'hr manager', 'super admin', 'owner admin')
              AND e.id NOT IN (
                  SELECT employee_id FROM attendance
                  WHERE attendance_date = $1
                    AND check_in IS NOT NULL
              )
              AND e.id NOT IN (
                  SELECT employee_id FROM leaves
                  WHERE status = 'Approved'
                    AND $1 BETWEEN start_date AND end_date
              )
        `, [today]);

        let sentCount = 0;
        for (const emp of result.rows) {
            try {
                const shiftStart = await getEmployeeShiftStart(emp.id);

                // Calculate target time (shift start minus minutesBefore)
                const [sh, sm] = shiftStart.split(':').map(Number);
                let targetMinutes = sh * 60 + sm - minutesBefore;
                if (targetMinutes < 0) targetMinutes += 24 * 60;
                const targetHH = String(Math.floor(targetMinutes / 60)).padStart(2, '0');
                const targetMM = String(targetMinutes % 60).padStart(2, '0');
                const targetTime = `${targetHH}:${targetMM}`;

                // Only send if current time matches the target (within 1 minute window)
                if (currentTime !== targetTime) continue;

                const urgency = minutesBefore > 0
                    ? `Your shift starts in ${minutesBefore} minutes (${shiftStart}).`
                    : `Your shift has started at ${shiftStart}.`;

                await sendMail({
                    from: FROM,
                    to: emp.email,
                    subject: `⏰ Attendance Reminder – ${minutesBefore > 0 ? 'Shift Starting Soon' : 'Please Check In Now'}`,
                    html: `
                    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
                        <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                            <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
                        </div>
                        <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                            <h2 style="color:#F59E0B;">⏰ Check-In Reminder</h2>
                            <p style="color:#374151;">Hi ${emp.full_name},</p>
                            <p style="color:#6B7280;">${urgency} You haven't checked in for today (${today}).</p>
                            <p style="color:#6B7280;">Please mark your attendance at the earliest.</p>
                            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/employee/attendance" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Mark Attendance</a>
                            <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">You can disable this reminder from Settings → Notifications.</p>
                        </div>
                    </div>`
                });
                sentCount++;
            } catch (emailErr) {
                console.warn(`[AttendanceReminder] Failed to send to ${emp.email}:`, emailErr.message);
            }
        }

        if (sentCount > 0) {
            console.log(`[AttendanceReminder] Sent ${sentCount} reminders (${minutesBefore}min before shift)`);
        }
    } catch (err) {
        console.error('[AttendanceReminder] Error:', err.message);
    }
};

/**
 * Auto-checkout employees who have been checked in for 12+ hours without checking out.
 */
const autoCheckoutOverdue = async () => {
    try {
        const overdueResult = await pool.query(`
            SELECT id, employee_id, check_in
            FROM attendance
            WHERE check_out IS NULL
              AND check_in IS NOT NULL
              AND check_in < DATE_SUB(NOW(), INTERVAL 12 HOUR)
        `);

        if (overdueResult.rows.length === 0) return;

        console.log(`[AutoCheckout] Processing ${overdueResult.rows.length} overdue records`);

        for (const record of overdueResult.rows) {
            try {
                await pool.query(
                    `UPDATE attendance
                     SET check_out = DATE_ADD(check_in, INTERVAL 12 HOUR),
                         total_hours = 12.0
                     WHERE id = $1 AND check_out IS NULL`,
                    [record.id]
                );
            } catch (updateErr) {
                console.warn(`[AutoCheckout] Failed for record ${record.id}:`, updateErr.message);
            }
        }

        console.log(`[AutoCheckout] Auto-checked out ${overdueResult.rows.length} records`);
    } catch (err) {
        console.error('[AutoCheckout] Error:', err.message);
    }
};

/**
 * Schedule the cron jobs
 */
const scheduleAttendanceReminders = () => {
    // Run every minute on weekdays to check if any employee's shift is about to start
    // (5 min before) or has started (at shift time)
    cron.schedule('* * * * 1-5', () => {
        sendCheckInReminders(5);  // 5 minutes before shift
        sendCheckInReminders(0);  // At shift start
    }, { timezone: 'Asia/Kolkata' });

    // Run auto-checkout every hour
    cron.schedule('0 * * * *', () => {
        autoCheckoutOverdue();
    }, { timezone: 'Asia/Kolkata' });

    console.log('[AttendanceReminder] Cron scheduled: shift-based reminders (weekdays), auto-checkout hourly');
};

module.exports = { scheduleAttendanceReminders, sendCheckInReminders, autoCheckoutOverdue };
