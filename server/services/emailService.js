const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
const emailSecure = String(process.env.EMAIL_USE_SSL || (emailPort === 465 ? 'true' : 'false')).toLowerCase() === 'true';
const emailRequireTLS = String(process.env.EMAIL_USE_TLS || 'true').toLowerCase() === 'true';

const toRatio = (value, fallback = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    if (n <= 1) return n;
    if (n <= 100) return n / 100;
    return fallback;
};

const getBreakupRatios = (settings = {}) => {
    const basicRatio = toRatio(settings.basic_ratio, 0.4);
    const hraRatio = toRatio(settings.hra_ratio, 0.2);
    const conveyanceRatio = toRatio(settings.conveyance_amount, 0.2);
    const configuredSum = basicRatio + hraRatio + conveyanceRatio;

    if (configuredSum > 1) {
        return { basicRatio: 0.4, hraRatio: 0.2, conveyanceRatio: 0.2, specialRatio: 0.2 };
    }

    return {
        basicRatio,
        hraRatio,
        conveyanceRatio,
        specialRatio: Math.max(0, 1 - configuredSum),
    };
};

const getMonthlySalaryBreakdown = (monthlyBase, settings = {}) => {
    const { basicRatio, hraRatio, conveyanceRatio, specialRatio } = getBreakupRatios(settings);
    const totalMonthly = Math.max(0, Math.round(Number(monthlyBase) || 0));
    const basic = Math.round(totalMonthly * basicRatio);
    const hra = Math.round(totalMonthly * hraRatio);
    const conveyance = Math.round(totalMonthly * conveyanceRatio);
    const special = Math.max(0, Math.round(totalMonthly * specialRatio));

    return {
        totalMonthly,
        basic,
        hra,
        conveyance,
        special,
    };
};

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtppro.zoho.in',
    port: emailPort,
    secure: emailSecure,
    requireTLS: emailRequireTLS,
    auth: {
        user: process.env.EMAIL_HOST_USER || process.env.EMAIL_USER,
        pass: process.env.EMAIL_HOST_PASSWORD || process.env.EMAIL_PASS,
    },
});

const FROM = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_FROM || `"IndusInnovate Technologies" <${process.env.EMAIL_HOST_USER || process.env.EMAIL_USER}>`;

// ─── Generate Offer Letter PDF ───────────────────────────────────
const generateOfferLetterPDF = (offerData, settings = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            // Collect PDF data
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text('INDUSINNOVATE', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text('Innovating the future, the indus way', { align: 'center' });
            doc.moveDown(0.3);

            // Date
            doc.fontSize(9).text(`Date: ${offerData.issueDate || new Date().toLocaleDateString('en-GB')}`);
            doc.moveDown(0.2);
            doc.text(`Dear ${offerData.candidateName},`);
            doc.moveDown(0.4);

            // Body
            doc.fontSize(9).text('We are pleased to extend an offer of employment for the position mentioned below. Your exceptional qualifications make you an ideal fit for our organization.');
            doc.moveDown(0.4);

            // Position Details
            doc.fontSize(10).font('Helvetica-Bold').text('POSITION DETAILS', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(9).font('Helvetica');
            doc.text(`Position: ${offerData.positionTitle || 'Software Developer'}`);
            doc.text(`Department: ${offerData.department || 'IT'}`);
            doc.text(`Location: ${offerData.location || 'Hyderabad'}`);
            doc.text(`Joining Date: ${offerData.joiningDate || 'To be confirmed'}`);
            doc.moveDown(0.3);

            // Salary Table Header
            const monthlyCtc = offerData.ctc ? Math.round(Number(offerData.ctc) / 12) : 33334;
            const employeePf = Number(settings.fixed_pf_deduction) || 1800;
            const employerPf = employeePf;
            const insurance = Number(settings.fixed_insurance_deduction) || 450;
            const professionalTax = Number(settings.fixed_ptax_deduction) || 200;
            const gross = Math.max(0, monthlyCtc - employeePf - employerPf - insurance - professionalTax);
            const salaryBreakdown = getMonthlySalaryBreakdown(gross, settings);
            const { basic, hra, conveyance, special } = salaryBreakdown;
            const netPayable = gross;

            doc.fontSize(9).font('Helvetica-Bold').text('SALARY ANNEXURE', { underline: true });
            doc.moveDown(0.3);

            // Simple table format
            const tableTop = doc.y;
            const col1 = 60;
            const col2 = 300;
            const col3 = 400;
            const rowHeight = 18;

            // Header row
            doc.fontSize(8).font('Helvetica-Bold');
            doc.text('Components', col1, tableTop);
            doc.text('Per Month', col2, tableTop);
            doc.text('Per Annum', col3, tableTop);
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            let y = tableTop + 20;
            const rows = [
                ['Basic Pay', `₹${basic.toLocaleString('en-IN')}`, `₹${(basic * 12).toLocaleString('en-IN')}`],
                ['House Rent Allowance', `₹${hra.toLocaleString('en-IN')}`, `₹${(hra * 12).toLocaleString('en-IN')}`],
                ['Conveyance', `₹${conveyance.toLocaleString('en-IN')}`, `₹${(conveyance * 12).toLocaleString('en-IN')}`],
                ['Special Allowance', `₹${special.toLocaleString('en-IN')}`, `₹${(special * 12).toLocaleString('en-IN')}`],
                ['Net Payable (A)', `₹${netPayable.toLocaleString('en-IN')}`, `₹${(netPayable * 12).toLocaleString('en-IN')}`],
                ['Employee PF Contribution', `₹${employeePf.toLocaleString('en-IN')}`, `₹${(employeePf * 12).toLocaleString('en-IN')}`],
                ['Employer PF Contribution', `₹${employerPf.toLocaleString('en-IN')}`, `₹${(employerPf * 12).toLocaleString('en-IN')}`],
                ['Insurance (Company Paid)', `₹${insurance.toLocaleString('en-IN')}`, `₹${(insurance * 12).toLocaleString('en-IN')}`],
                ['Professional Tax', `₹${professionalTax.toLocaleString('en-IN')}`, `₹${(professionalTax * 12).toLocaleString('en-IN')}`],
                ['Total CTC', `₹${monthlyCtc.toLocaleString('en-IN')}`, `₹${(offerData.ctc || '4,00,008').toLocaleString('en-IN')}`]
            ];

            doc.fontSize(7).font('Helvetica');
            rows.forEach((row, i) => {
                if (i === rows.length - 1) doc.font('Helvetica-Bold');
                doc.text(row[0], col1, y);
                doc.text(row[1], col2, y);
                doc.text(row[2], col3, y);
                y += rowHeight;
            });

            doc.moveDown(0.5);
            doc.font('Helvetica');
            doc.fontSize(8);
            doc.text('• Employment will be subject to a probation period of 4 months');
            doc.text('• Working hours: Monday to Friday, 9:00 AM - 6:00 PM');
            doc.text('• Variable pay will be given every 6 months based on performance');

            doc.moveDown(0.5);
            doc.text('We welcome you to our organization. Looking forward to your positive response.');
            doc.moveDown(0.5);
            doc.text('Warm Regards,');
            doc.text('HR Team');
            doc.text('IndusInnovate Technologies');

            // Finalize PDF
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

// ─── Send Welcome Email ──────────────────────────────────────────
const sendWelcomeEmail = async ({ to, name, email, password, role, resetLink }) => {
    const info = await transporter.sendMail({
        from: FROM,
        to,
        subject: 'Welcome to IndusInnovate Technologies – Your Account Details',
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">HR Management Portal</p>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">Welcome, ${name}!</h2>
                <p style="color:#6B7280;">Your ${role} account has been created successfully. Here are your login credentials:</p>
                <div style="background:#F0F7FF;border-left:4px solid #3B82F6;padding:16px;border-radius:4px;margin:24px 0;">
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Email:</strong> ${email}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Temporary Password:</strong> ${password}</p>
                </div>
                <p style="color:#EF4444;font-size:13px;">⚠️ You will be required to change your password on first login.</p>
                ${resetLink ? `<p style="color:#6B7280;font-size:13px;">Please follow the link below to change your password:</p>
                <a href="${resetLink}" style="display:inline-block;background:#10B981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Change Password</a>` : ''}
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Login to Portal</a>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2025 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });

    return info;
};

// ─── Send Password Reset Email ────────────────────────────────────
const sendPasswordResetEmail = async ({ to, name, resetLink }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: 'Password Reset Request – IndusInnovate Technologies',
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">Password Reset</h2>
                <p style="color:#6B7280;">Hi ${name}, we received a request to reset your password. Click the button below to set a new password.</p>
                <a href="${resetLink}" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:24px 0;">Reset Password</a>
                <p style="color:#EF4444;font-size:13px;">⚠️ This link expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2025 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Leave Approval/Rejection Email ─────────────────────────
const sendLeaveStatusEmail = async ({ to, name, status, leaveType, fromDate, toDate, remarks }) => {
    const isApproved = status === 'Approved';
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Leave Request ${status} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:${isApproved ? '#10B981' : '#EF4444'};">${isApproved ? '✅' : '❌'} Leave ${status}</h2>
                <p style="color:#6B7280;">Hi ${name}, your leave request has been <strong>${status.toLowerCase()}</strong>.</p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:16px;border-radius:8px;margin:24px 0;">
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Leave Type:</strong> ${leaveType}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>From:</strong> ${fromDate} &nbsp;<strong>To:</strong> ${toDate}</p>
                    ${remarks ? `<p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Remarks:</strong> ${remarks}</p>` : ''}
                </div>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2025 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Payslip Notification Email ────────────────────────────
const sendPayslipEmail = async ({ to, name, month, year, netSalary, attachmentBuffer, attachmentFileName }) => {
    if (!attachmentBuffer || !attachmentBuffer.length) {
        throw new Error('Payslip attachment is required to send email');
    }

    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Your Payslip for ${month} ${year} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">💰 Payslip Ready</h2>
                <p style="color:#6B7280;">Hi ${name}, your payslip for <strong>${month} ${year}</strong> has been generated.</p>
                <div style="background:#EFF6FF;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
                    <p style="color:#6B7280;font-size:13px;margin:0;">Net Take Home</p>
                    <p style="color:#1E40AF;font-size:32px;font-weight:700;margin:8px 0;">₹${Number(netSalary).toLocaleString('en-IN')}</p>
                </div>
                <p style="color:#6B7280;">Your payslip PDF is attached to this email.</p>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2025 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`,
        attachments: [
            {
                filename: attachmentFileName || `Payslip_${String(name || 'Employee').replace(/\s+/g, '_')}_${month}_${year}.pdf`,
                content: attachmentBuffer,
                contentType: 'application/pdf',
            },
        ],
    });
};

// ─── Send Meeting Invite Email ───────────────────────────────────
const sendMeetingInvite = async ({ to, name, title, scheduledAt, agenda, meetingLink }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Meeting Invite: ${title} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">📅 You're Invited</h2>
                <p style="color:#6B7280;">Hi ${name}, you have been invited to a meeting.</p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:16px;border-radius:8px;margin:24px 0;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">${title}</p>
                    <p style="margin:6px 0 0;font-size:14px;color:#374151;"><strong>When:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
                    ${agenda ? `<p style="margin:6px 0 0;font-size:14px;color:#374151;"><strong>Agenda:</strong> ${agenda}</p>` : ''}
                </div>
                ${meetingLink ? `<a href="${meetingLink}" style="display:inline-block;background:#10B981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Join Meeting</a>` : ''}
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2025 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Account Status Change Email ──────────────────────────
const sendAccountStatusEmail = async ({ to, name, status }) => {
    const normalizedStatus = String(status || '').toLowerCase();
    const isActive = normalizedStatus === 'active';
    const heading = isActive ? 'Account Reactivated' : 'Account Deactivated';
    const accent = isActive ? '#10B981' : '#EF4444';
    const icon = isActive ? '✅' : '⚠️';
    const portalUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    await transporter.sendMail({
        from: FROM,
        to,
        subject: `${heading} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:${accent};margin-top:0;">${icon} ${heading}</h2>
                <p style="color:#6B7280;">Hi ${name}, your employee account status has been updated.</p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:16px;border-radius:8px;margin:20px 0;">
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Current Status:</strong> ${isActive ? 'Active' : 'Inactive'}</p>
                </div>
                ${isActive
                    ? `<p style="color:#374151;">You can now access the portal using your registered credentials.</p>
                       <a href="${portalUrl}" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Login to Portal</a>`
                    : '<p style="color:#374151;">Your access to the portal is currently disabled. Please contact HR/admin for assistance.</p>'}
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2026 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Chat Message Notification Email (Optional) ───────────
const sendChatMessageNotificationEmail = async ({ to, recipientName, senderName, messagePreview }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `New message from ${senderName} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">New Message Received</h2>
                <p style="color:#6B7280;">Hi ${recipientName || 'there'}, you received a new message.</p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:16px;border-radius:8px;margin:20px 0;">
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Sender:</strong> ${senderName}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Message:</strong> ${messagePreview}</p>
                </div>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open Chat</a>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2026 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Shift Assignment Email (Optional) ─────────────────────
const sendShiftAssignmentEmail = async ({ to, name, shiftName, startTime, endTime, effectiveFrom }) => {
    const shiftWindow = `${String(startTime || '').slice(0, 5)} - ${String(endTime || '').slice(0, 5)}`;
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Shift Assigned: ${shiftName} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">New Shift Assignment</h2>
                <p style="color:#6B7280;">Hi ${name || 'there'}, your shift assignment has been updated.</p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:16px;border-radius:8px;margin:20px 0;">
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Shift:</strong> ${shiftName}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Timing:</strong> ${shiftWindow}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Effective From:</strong> ${effectiveFrom}</p>
                </div>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/employee/attendance" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Attendance</a>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2026 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Onboarding Assignment Email (Optional) ─────────────────
const sendOnboardingAssignedEmail = async ({ to, name, templateName }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Onboarding Assigned: ${templateName} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">IndusInnovate Technologies</h1>
            </div>
            <div style="padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;">Onboarding Checklist Assigned</h2>
                <p style="color:#6B7280;">Hi ${name || 'there'}, a new onboarding checklist has been assigned to you.</p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:16px;border-radius:8px;margin:20px 0;">
                    <p style="margin:0;font-size:14px;color:#374151;"><strong>Template:</strong> ${templateName}</p>
                </div>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/employee/onboarding" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open Onboarding</a>
                <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© 2026 IndusInnovate Technologies. All rights reserved.</p>
            </div>
        </div>`
    });
};

// ─── Send Offer Letter Email ─────────────────────────────────────
const sendOfferLetterEmail = async ({ to, candidateName, role, positionTitle, department, location, ctc, issueDate, joiningDate, type, attachmentPath, settings = {} }) => {
    const isOffer = type === 'offer';
    const safeCandidateName = (candidateName || 'Candidate').replace(/\s+/g, '_');
    const monthlyCtc = ctc ? Math.round(Number(ctc) / 12) : 33334;
    const employeePf = Number(settings.fixed_pf_deduction) || 1800;
    const employerPf = employeePf;
    const insurance = Number(settings.fixed_insurance_deduction) || 450;
    const professionalTax = Number(settings.fixed_ptax_deduction) || 200;
    const gross = Math.max(0, monthlyCtc - employeePf - employerPf - insurance - professionalTax);
    const salaryBreakdown = getMonthlySalaryBreakdown(gross, settings);
    const { basic, hra, conveyance, special } = salaryBreakdown;
    const netPayable = gross;

    let normalizedPdfBuffer = null;

    if (attachmentPath && fs.existsSync(attachmentPath)) {
        normalizedPdfBuffer = fs.readFileSync(attachmentPath);
    } else {
        const pdfBuffer = await generateOfferLetterPDF({
            candidateName,
            positionTitle: positionTitle || role,
            department,
            location,
            ctc,
            issueDate,
            joiningDate
        }, settings);
        normalizedPdfBuffer = Buffer.from(pdfBuffer || []);
    }

    if (!normalizedPdfBuffer || !normalizedPdfBuffer.length) {
        throw new Error('Offer letter PDF generation failed');
    }

    try {
        await transporter.sendMail({
        from: FROM,
        to,
        subject: `${isOffer ? 'Offer Letter' : 'Joining Letter'} – IndusInnovate Technologies`,
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:700px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#1E3A8A,#3B82F6);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:28px;font-weight:700;">IndusInnovate Technologies</h1>
                <p style="color:#E0E7FF;margin:8px 0 0 0;font-size:14px;">Innovating the future, the indus way</p>
            </div>
            <div style="padding:40px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#111827;font-size:22px;margin-top:0;">🎉 ${isOffer ? 'Congratulations!' : 'Welcome to the Team!'}</h2>
                <p style="color:#374151;font-size:15px;line-height:1.6;">Dear <strong>${candidateName}</strong>,</p>
                
                <p style="color:#374151;font-size:15px;line-height:1.6;">We are pleased to extend ${isOffer ? 'an offer' : 'a joining letter'} for the position of <strong>${positionTitle || role}</strong> in the <strong>${department}</strong> department. Your exceptional skills and experience make you an ideal fit for our team.</p>
                
                <div style="background:#F0FDF4;border-left:4px solid #10B981;padding:20px;border-radius:4px;margin:24px 0;">
                    <p style="margin:8px 0;font-size:14px;color:#374151;"><strong>Position:</strong> ${positionTitle || role}</p>
                    <p style="margin:8px 0;font-size:14px;color:#374151;"><strong>Department:</strong> ${department}</p>
                    <p style="margin:8px 0;font-size:14px;color:#374151;"><strong>Location:</strong> ${location}</p>
                    <p style="margin:8px 0;font-size:14px;color:#374151;"><strong>Joining Date:</strong> ${joiningDate}</p>
                    <p style="margin:8px 0;font-size:14px;color:#374151;"><strong>Annual CTC:</strong> ₹${ctc ? ctc.toLocaleString('en-IN') : 'As discussed'}</p>
                </div>

                <h3 style="color:#1F2937;font-size:16px;margin-top:24px;margin-bottom:12px;">📊 Compensation Breakdown (Monthly)</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                    <tr style="background:#F9FAFB;">
                        <td style="padding:10px;border:1px solid #E5E7EB;"><strong>Basic Pay</strong></td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${basic.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px;border:1px solid #E5E7EB;">House Rent Allowance (HRA)</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${hra.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background:#F9FAFB;">
                        <td style="padding:10px;border:1px solid #E5E7EB;">Conveyance Allowance</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${conveyance.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px;border:1px solid #E5E7EB;">Special Allowance</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${special.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background:#E0F2FE;">
                        <td style="padding:10px;border:1px solid #E5E7EB;"><strong>Net Payable (A)</strong></td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;"><strong>₹${netPayable.toLocaleString('en-IN')}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding:10px;border:1px solid #E5E7EB;">Employee PF Contribution</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${employeePf.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px;border:1px solid #E5E7EB;">Employer PF Contribution</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${employerPf.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background:#F9FAFB;">
                        <td style="padding:10px;border:1px solid #E5E7EB;">Insurance (Company Paid)</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${insurance.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px;border:1px solid #E5E7EB;">Professional Tax</td>
                        <td style="padding:10px;border:1px solid #E5E7EB;text-align:right;">₹${professionalTax.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background:#FEF3C7;">
                        <td style="padding:12px;border:1px solid #E5E7EB;"><strong>Total CTC (A + Benefits)</strong></td>
                        <td style="padding:12px;border:1px solid #E5E7EB;text-align:right;"><strong>₹${monthlyCtc.toLocaleString('en-IN')}</strong></td>
                    </tr>
                </table>

                <h3 style="color:#1F2937;font-size:14px;margin-top:20px;margin-bottom:10px;">📋 Key Details:</h3>
                <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;">
                    <li>Employment will be subject to a probation period of 4 months</li>
                    <li>Working hours: Monday to Friday, 9:00 AM - 6:00 PM</li>
                    <li>Based on your performance, variable pay will be given every 6 months</li>
                    <li>Statutory deductions as per applicable laws will be made</li>
                </ul>

                <p style="color:#374151;font-size:14px;margin-top:24px;line-height:1.6;">Please find the complete offer letter attached. If you have any questions or require clarifications, feel free to reach out to our HR team.</p>
                
                <p style="color:#374151;margin-top:24px;font-size:15px;"><strong>Warm Regards,</strong><br>HR Team<br>IndusInnovate Technologies<br>📧 ${process.env.EMAIL_USER}<br>Innovating the future, the indus way</p>
                
                <p style="color:#9CA3AF;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;">© 2026 IndusInnovate Technologies Private Limited. All rights reserved. This communication contains confidential information and is intended only for the addressee.</p>
            </div>
        </div>`,
        attachments: [
            {
                filename: attachmentPath ? path.basename(attachmentPath) : `Offer_Letter_${safeCandidateName}.pdf`,
                content: normalizedPdfBuffer.toString('base64'),
                encoding: 'base64',
                contentType: 'application/pdf',
            }
        ]
        });
    } catch (err) {
        const detail = err?.response || err?.message || 'Unknown mail transport error';
        throw new Error(`Mail send failed: ${detail}`);
    }
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendLeaveStatusEmail,
    sendPayslipEmail,
    sendMeetingInvite,
    sendAccountStatusEmail,
    sendChatMessageNotificationEmail,
    sendShiftAssignmentEmail,
    sendOnboardingAssignedEmail,
    sendOfferLetterEmail,
};
