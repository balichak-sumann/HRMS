const { Pool } = require('pg');
const {
    getFinancialYearFromPayrollMonth,
    getApprovedDeclarationAmount,
} = require('./incomeTaxController');
const {

    getLatestApprovedRevisionForDate,
} = require('./salaryRevisionController');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});



const MONTH_MAP = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
};

const toNumber = (value, defaultValue = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const round2 = (value) => Number((Math.round(value * 100) / 100).toFixed(2));

const parseMonthNumber = (month) => {
    if (month == null) return null;
    const numeric = Number(month);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;

    const normalized = String(month).trim().toLowerCase();
    return MONTH_MAP[normalized] || null;
};

const getMonthBounds = (month, year) => {
    const monthNumber = parseMonthNumber(month);
    const yearNumber = Number(year);

    if (!monthNumber || !Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > 3000) {
        throw new Error('Invalid month/year for payroll calculation');
    }

    const start = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
    const end = new Date(Date.UTC(yearNumber, monthNumber, 0));
    const toYmd = (d) => d.toISOString().slice(0, 10);

    return {
        monthNumber,
        yearNumber,
        startDate: toYmd(start),
        endDate: toYmd(end),
    };
};

const getWorkingDays = (month, year) => {
    const { monthNumber, yearNumber } = getMonthBounds(month, year);
    const daysInMonth = new Date(yearNumber, monthNumber, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
        const weekday = new Date(yearNumber, monthNumber - 1, day).getDay();
        if (weekday !== 0 && weekday !== 6) {
            workingDays += 1;
        }
    }

    return workingDays;
};

const getAttendanceSummary = async (employeeId, month, year) => {
    const { startDate, endDate } = getMonthBounds(month, year);
    const processedDays = getWorkingDays(month, year);

    const result = await pool.query(
        `SELECT
            COALESCE(SUM(day_credit), 0) AS paid_days
         FROM (
            SELECT
              DATE(check_in) AS work_day,
              MAX(
                CASE
                  WHEN status = 'Half-Day' THEN 0.5
                  WHEN status IN ('Present', 'Late') THEN 1
                  ELSE 0
                END
              ) AS day_credit
            FROM attendance
            WHERE employee_id = $1
              AND DATE(check_in) BETWEEN $2::date AND $3::date
              AND EXTRACT(DOW FROM check_in) NOT IN (0, 6)
            GROUP BY DATE(check_in)
         ) t`,
        [employeeId, startDate, endDate]
    );

    const paidDaysRaw = Number(result.rows[0]?.paid_days || 0);
    const paidDays = Math.min(processedDays, round2(paidDaysRaw));

    return {
        startDate,
        endDate,
        processedDays,
        paidDays,
    };
};



const getStatutorySettingsData = async () => {

    const settingsRes = await pool.query(
        `SELECT id,
                pf_employee_rate,
                pf_employer_rate,
                esi_employee_rate,
                esi_employer_rate,
                updated_at
         FROM payroll_statutory_settings
         ORDER BY updated_at DESC
         LIMIT 1`
    );

    const slabsRes = await pool.query(
        `SELECT id, name, income_from, income_to, rate
         FROM payroll_tds_slabs
         ORDER BY income_from ASC, income_to ASC NULLS LAST`
    );

    if (!settingsRes.rows[0]) {
        throw new Error('Statutory settings are not configured. Configure payroll statutory settings before generating payroll.');
    }

    if (slabsRes.rows.length === 0) {
        throw new Error('TDS slabs are not configured. Configure payroll statutory settings before generating payroll.');
    }

    return {
        settings: settingsRes.rows[0],
        tds_slabs: slabsRes.rows,
    };
};

const computeAnnualTdsDetails = (annualIncome, slabs) => {
    const income = Math.max(0, Number(annualIncome) || 0);
    let annualTds = 0;
    const breakdown = [];

    for (const slab of slabs) {
        const from = Number(slab.income_from) || 0;
        const to = slab.income_to == null ? Number.POSITIVE_INFINITY : Number(slab.income_to);
        const rate = Number(slab.rate) || 0;
        const hasUpperCap = Number.isFinite(to);

        if (income <= from) {
            breakdown.push({
                income_from: from,
                income_to: hasUpperCap ? to : null,
                rate,
                taxable_income: 0,
                tax_amount: 0,
                applied: false,
            });
            continue;
        }

        const taxableInThisSlab = Math.max(0, Math.min(income, to) - from);
        const taxInThisSlab = taxableInThisSlab * (rate / 100);
        annualTds += taxInThisSlab;
        breakdown.push({
            income_from: from,
            income_to: hasUpperCap ? to : null,
            rate,
            taxable_income: round2(taxableInThisSlab),
            tax_amount: round2(taxInThisSlab),
            applied: taxableInThisSlab > 0,
        });
    }

    return {
        annual_tds: round2(annualTds),
        breakdown,
    };
};

const computeAnnualTds = (annualIncome, slabs) => computeAnnualTdsDetails(annualIncome, slabs).annual_tds;

const computeStatutoryBreakup = ({ grossSalary, settings, slabs, annualTaxableIncome }) => {
    const gross = Math.max(0, Number(grossSalary) || 0);
    const pfEmployee = round2(gross * ((Number(settings?.pf_employee_rate) || 0) / 100));
    const pfEmployer = round2(gross * ((Number(settings?.pf_employer_rate) || 0) / 100));
    const esiEmployee = round2(gross * ((Number(settings?.esi_employee_rate) || 0) / 100));
    const esiEmployer = round2(gross * ((Number(settings?.esi_employer_rate) || 0) / 100));
    const annualBasis = typeof annualTaxableIncome === 'number'
        ? Math.max(0, annualTaxableIncome)
        : gross * 12;
    const tdsDetails = computeAnnualTdsDetails(annualBasis, slabs || []);
    const annualTds = tdsDetails.annual_tds;
    const monthlyTds = round2(annualTds / 12);

    return {
        pf_employee: pfEmployee,
        pf_employer: pfEmployer,
        esi_employee: esiEmployee,
        esi_employer: esiEmployer,
        annual_taxable_income: round2(annualBasis),
        annual_tds: annualTds,
        tds: monthlyTds,
        tds_breakdown: tdsDetails.breakdown,
    };
};

// ─── Get payroll records ─────────────────────────────────────────
const getPayroll = async (req, res) => {
    try {

        let query = 'SELECT p.*, e.full_name FROM payroll p JOIN employees e ON p.employee_id = e.id';
        let params = [];

        if (!['hr', 'admin'].includes(req.user.role)) {
            const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            if (emp.rows.length > 0) {
                query += ' WHERE p.employee_id = $1';
                params.push(emp.rows[0].id);
            } else {
                return res.json([]);
            }
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create payroll record (HR) ──────────────────────────────────
const createPayroll = async (req, res) => {
    const {
        emp_code, designation, department, location,
        pan_no, bank_account, bank_name,
        employee_id, month, year, basic_salary, hra,
        conveyance, special_allowance, allowances, ptax, other_deduction,
        gross_salary
    } = req.body;
    const client = await pool.connect();
    try {

        await client.query('BEGIN');

        const employeeRes = await client.query('SELECT salary FROM employees WHERE id = $1', [employee_id]);
        if (employeeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const attendance = await getAttendanceSummary(employee_id, month, year);
        const prorationFactor = attendance.processedDays > 0
            ? attendance.paidDays / attendance.processedDays
            : 0;

        const approvedRevision = await getLatestApprovedRevisionForDate(employee_id, attendance.endDate, client);

        const requestedBasic = approvedRevision
            ? toNumber(approvedRevision.proposed_basic_salary)
            : toNumber(basic_salary);
        const requestedHra = approvedRevision
            ? toNumber(approvedRevision.proposed_hra)
            : toNumber(hra);
        const requestedConveyance = approvedRevision
            ? 0
            : toNumber(conveyance);
        const requestedSpecialAllowance = approvedRevision
            ? 0
            : toNumber(special_allowance);
        const requestedAllowances = approvedRevision
            ? toNumber(approvedRevision.proposed_allowances)
            : toNumber(allowances, requestedConveyance + requestedSpecialAllowance);
        const requestedGross = approvedRevision
            ? toNumber(approvedRevision.proposed_basic_salary)
              + toNumber(approvedRevision.proposed_hra)
              + toNumber(approvedRevision.proposed_allowances)
            : toNumber(gross_salary, requestedBasic + requestedHra + requestedAllowances);

        if (!approvedRevision && (requestedBasic <= 0 || requestedHra < 0 || requestedAllowances < 0 || requestedGross <= 0)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Cannot generate payslip — salary components are missing. Please set Basic Salary, HRA, and Allowances in the Payslip Preview above before saving. If this employee has a Salary Revision, ensure it is approved first.',
            });
        }

        const baseBasic = requestedBasic;
        const baseHra = requestedHra;
        const baseConveyance = requestedConveyance;
        const baseSpecialAllowance = requestedSpecialAllowance;
        const baseAllowances = requestedAllowances;
        const baseGross = requestedGross;
        const basePtax = toNumber(ptax);
        const baseOtherDeduction = toNumber(other_deduction);

        const proratedBasic = round2(baseBasic * prorationFactor);
        const proratedHra = round2(baseHra * prorationFactor);
        const proratedConveyance = round2(baseConveyance * prorationFactor);
        const proratedSpecialAllowance = round2(baseSpecialAllowance * prorationFactor);
        const proratedAllowances = round2(baseAllowances * prorationFactor);
        const proratedPtax = round2(basePtax * prorationFactor);
        const proratedOtherDeduction = round2(baseOtherDeduction);
        const proratedGross = round2(baseGross * prorationFactor);

        const financialYear = getFinancialYearFromPayrollMonth(month, year);
        const approvedDeclarationAmount = await getApprovedDeclarationAmount(employee_id, financialYear, client);
        const annualBaseIncome = approvedRevision
            ? Math.max(0, toNumber(approvedRevision.proposed_total_ctc))
            : Math.max(0, baseGross * 12);
        const annualTaxableIncome = Math.max(0, annualBaseIncome - approvedDeclarationAmount);

        const statutory = await getStatutorySettingsData();
        const statutoryBreakup = computeStatutoryBreakup({
            grossSalary: proratedGross,
            settings: statutory.settings,
            slabs: statutory.tds_slabs,
            annualTaxableIncome,
        });

        const approvedClaimsRes = await client.query(
            `SELECT id, amount
             FROM expense_claims
             WHERE employee_id = $1
               AND status = 'Approved'
               AND reimbursed_payroll_id IS NULL
             ORDER BY reviewed_at ASC, created_at ASC`,
            [employee_id]
        );

        const reimbursementClaimIds = approvedClaimsRes.rows.map((row) => row.id);
        const reimbursements = round2(
            approvedClaimsRes.rows.reduce((sum, row) => sum + toNumber(row.amount), 0)
        );

        const approvedEncashmentRes = await client.query(
            `SELECT id, encashment_amount
             FROM leave_encashment_requests
             WHERE employee_id = $1
               AND status = 'Approved'
               AND reimbursed_payroll_id IS NULL
             ORDER BY reviewed_at ASC, created_at ASC`,
            [employee_id]
        );

        const leaveEncashmentIds = approvedEncashmentRes.rows.map((row) => row.id);
        const leaveEncashment = round2(
            approvedEncashmentRes.rows.reduce((sum, row) => sum + toNumber(row.encashment_amount), 0)
        );

        const totalDeductions = round2(
            proratedPtax
            + proratedOtherDeduction
            + statutoryBreakup.pf_employee
            + statutoryBreakup.esi_employee
            + statutoryBreakup.tds
        );
        const totalGross = round2(proratedGross + reimbursements + leaveEncashment);
        const netSalary = round2(totalGross - totalDeductions);

        const result = await client.query(
            `INSERT INTO payroll (
                employee_id, month, year, emp_code, designation, department, location,
                processed_days, paid_days, pan_no, bank_account, bank_name,
                basic_salary, hra, conveyance, special_allowance, allowances,
                pf, pf_employee, pf_employer, esi_employee, esi_employer,
                ptax, tds, reimbursements, leave_encashment, gross_salary, deductions, net_salary, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22,
                $23, $24, $25, $26, $27, $28, $29, $30
            ) RETURNING *`,
            [
                employee_id, month, year, emp_code, designation, department, location,
                attendance.processedDays, attendance.paidDays, pan_no, bank_account, bank_name,
                proratedBasic, proratedHra, proratedConveyance, proratedSpecialAllowance, proratedAllowances,
                statutoryBreakup.pf_employee,
                statutoryBreakup.pf_employee,
                statutoryBreakup.pf_employer,
                statutoryBreakup.esi_employee,
                statutoryBreakup.esi_employer,
                proratedPtax,
                statutoryBreakup.tds,
                reimbursements,
                leaveEncashment,
                totalGross,
                totalDeductions,
                netSalary,
                'Generated'
            ]
        );

        if (reimbursementClaimIds.length > 0) {
            await client.query(
                `UPDATE expense_claims
                 SET reimbursed_payroll_id = $1,
                     updated_at = NOW()
                 WHERE id = ANY($2::uuid[])`,
                [result.rows[0].id, reimbursementClaimIds]
            );
        }

        if (leaveEncashmentIds.length > 0) {
            await client.query(
                `UPDATE leave_encashment_requests
                 SET reimbursed_payroll_id = $1,
                     updated_at = NOW()
                 WHERE id = ANY($2::uuid[])`,
                [result.rows[0].id, leaveEncashmentIds]
            );
        }

        await client.query('COMMIT');

        res.json({
            ...result.rows[0],
            statutory_breakup: statutoryBreakup,
            financial_year: financialYear,
            approved_declaration_amount: approvedDeclarationAmount,
            annual_taxable_income: annualTaxableIncome,
            salary_revision_applied: approvedRevision
                ? {
                    revision_id: approvedRevision.id,
                    effective_date: approvedRevision.effective_date,
                    approved_at: approvedRevision.approved_at,
                }
                : null,
            other_deduction: proratedOtherDeduction,
            reimbursement_claim_count: reimbursementClaimIds.length,
            leave_encashment_request_count: leaveEncashmentIds.length,
            attendance_summary: {
                period_start: attendance.startDate,
                period_end: attendance.endDate,
                processed_days: attendance.processedDays,
                paid_days: attendance.paidDays,
            },
        });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('createPayroll rollback error:', rollbackErr.message);
        }
        console.error(err.message);
        if (err.message && err.message.includes('not configured')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getStatutorySettings = async (req, res) => {
    try {
        const settings = await getStatutorySettingsData();
        res.json(settings);
    } catch (err) {
        console.error('getMyForm16Summary error:', err);
        if (err.message && err.message.includes('financial_year')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Employee not found') {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

const updateStatutorySettings = async (req, res) => {
    const {
        pf_employee_rate,
        pf_employer_rate,
        esi_employee_rate,
        esi_employer_rate,
        tds_slabs = [],
    } = req.body;

    if (!Array.isArray(tds_slabs) || tds_slabs.length === 0) {
        return res.status(400).json({ error: 'At least one TDS slab is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const settingsRes = await client.query(
            `SELECT id
             FROM payroll_statutory_settings
             ORDER BY updated_at DESC
             LIMIT 1`
        );

        const settingsId = settingsRes.rows[0]?.id;

        const parsedPfEmployeeRate = Number(pf_employee_rate);
        const parsedPfEmployerRate = Number(pf_employer_rate);
        const parsedEsiEmployeeRate = Number(esi_employee_rate);
        const parsedEsiEmployerRate = Number(esi_employer_rate);

        if (![parsedPfEmployeeRate, parsedPfEmployerRate, parsedEsiEmployeeRate, parsedEsiEmployerRate].every((v) => Number.isFinite(v) && v >= 0)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid statutory contribution rates' });
        }

        if (!settingsId) {
            await client.query(
                `INSERT INTO payroll_statutory_settings (
                    pf_employee_rate,
                    pf_employer_rate,
                    esi_employee_rate,
                    esi_employer_rate
                ) VALUES ($1, $2, $3, $4)`,
                [
                    parsedPfEmployeeRate,
                    parsedPfEmployerRate,
                    parsedEsiEmployeeRate,
                    parsedEsiEmployerRate,
                ]
            );
        } else {
            await client.query(
                `UPDATE payroll_statutory_settings
                 SET pf_employee_rate = $1,
                     pf_employer_rate = $2,
                     esi_employee_rate = $3,
                     esi_employer_rate = $4,
                     updated_at = NOW()
                 WHERE id = $5`,
                [
                    parsedPfEmployeeRate,
                    parsedPfEmployerRate,
                    parsedEsiEmployeeRate,
                    parsedEsiEmployerRate,
                    settingsId,
                ]
            );
        }

        await client.query('DELETE FROM payroll_tds_slabs');

        for (const slab of tds_slabs) {
            const incomeFrom = toNumber(slab.income_from);
            const incomeTo = slab.income_to === null || slab.income_to === '' || typeof slab.income_to === 'undefined'
                ? null
                : toNumber(slab.income_to);
            const rate = toNumber(slab.rate);

            if (!Number.isFinite(incomeFrom) || incomeFrom < 0 || !Number.isFinite(rate) || rate < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Invalid TDS slab values' });
            }
            if (incomeTo !== null && (!Number.isFinite(incomeTo) || incomeTo <= incomeFrom)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'income_to must be greater than income_from' });
            }

            const slabName = (slab.name || '').trim();
            await client.query(
                `INSERT INTO payroll_tds_slabs (name, income_from, income_to, rate)
                 VALUES ($1, $2, $3, $4)`,
                [slabName, incomeFrom, incomeTo, rate]
            );
        }

        await client.query('COMMIT');
        const settings = await getStatutorySettingsData();
        res.json(settings);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('updateStatutorySettings error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getMonthlyComplianceReport = async (req, res) => {
    try {

        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ error: 'month and year are required' });
        }

        const rows = await pool.query(
            `SELECT p.id,
                    p.employee_id,
                    e.full_name,
                    p.month,
                    p.year,
                    p.gross_salary,
                    COALESCE(p.pf_employee, p.pf, 0) AS pf_employee,
                    COALESCE(p.pf_employer, 0) AS pf_employer,
                    COALESCE(p.esi_employee, 0) AS esi_employee,
                    COALESCE(p.esi_employer, 0) AS esi_employer,
                    COALESCE(p.tds, 0) AS tds,
                    p.net_salary
             FROM payroll p
             JOIN employees e ON e.id = p.employee_id
             WHERE LOWER(TRIM(p.month)) = LOWER(TRIM($1))
               AND p.year = $2
             ORDER BY e.full_name ASC`,
            [String(month), Number(year)]
        );

        const totals = rows.rows.reduce(
            (acc, row) => {
                acc.pf_employee += toNumber(row.pf_employee);
                acc.pf_employer += toNumber(row.pf_employer);
                acc.esi_employee += toNumber(row.esi_employee);
                acc.esi_employer += toNumber(row.esi_employer);
                acc.tds += toNumber(row.tds);
                return acc;
            },
            { pf_employee: 0, pf_employer: 0, esi_employee: 0, esi_employer: 0, tds: 0 }
        );

        res.json({
            month: String(month),
            year: Number(year),
            totals: {
                pf_employee: round2(totals.pf_employee),
                pf_employer: round2(totals.pf_employer),
                esi_employee: round2(totals.esi_employee),
                esi_employer: round2(totals.esi_employer),
                tds: round2(totals.tds),
            },
            records: rows.rows,
        });
    } catch (err) {
        console.error('getMonthlyComplianceReport error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getPayrollAttendanceMetrics = async (req, res) => {
    try {
        const { employee_id, month, year } = req.query;

        if (!employee_id || !month || !year) {
            return res.status(400).json({ error: 'employee_id, month and year are required' });
        }

        const attendance = await getAttendanceSummary(employee_id, month, year);
        return res.json({
            processed_days: attendance.processedDays,
            paid_days: attendance.paidDays,
            period_start: attendance.startDate,
            period_end: attendance.endDate,
        });
    } catch (err) {
        console.error(err.message);
        if (err.message && err.message.includes('Invalid month/year')) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Send payslip (HR) ──────────────────────────────────────────
const sendPayslip = async (req, res) => {
    try {
        const { sendPayslipEmail } = require('../services/emailService');
        const { pdfFileName } = req.body || {};

        const pdfBuffer = req.file?.buffer || null;

        if (!pdfBuffer?.length) {
            return res.status(400).json({ error: 'Payslip PDF upload is required for email attachment' });
        }

        // Fetch payroll record with employee details
        const payrollRes = await pool.query(
            `SELECT p.*, e.full_name, e.email
             FROM payroll p
             JOIN employees e ON p.employee_id = e.id
             WHERE p.id = $1`,
            [req.params.id]
        );

        if (payrollRes.rows.length === 0) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        const payroll = payrollRes.rows[0];

        if (!payroll.email) {
            return res.status(400).json({ error: 'Employee email not configured' });
        }

        // Send payslip email
        await sendPayslipEmail({
            to: payroll.email,
            name: payroll.full_name,
            month: payroll.month,
            year: payroll.year,
            netSalary: payroll.net_salary,
            attachmentBuffer: pdfBuffer,
            attachmentFileName: pdfFileName || req.file?.originalname,
        });

        // Mark as sent
        await pool.query(
            "UPDATE payroll SET status = 'Sent', sent_at = NOW() WHERE id = $1",
            [req.params.id]
        );

        res.json({ message: `Payslip sent successfully to ${payroll.email}` });
    } catch (err) {
        console.error('sendPayslip error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to send payslip email' });
    }
};

module.exports = {
    getPayroll,
    createPayroll,
    sendPayslip,
    getPayrollAttendanceMetrics,
    getStatutorySettings,
    updateStatutorySettings,
    getMonthlyComplianceReport,
};
