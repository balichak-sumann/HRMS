import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/Payroll/PayslipPDF';
import {
    ArrowLeft,
    Wallet,
    Download,
    Send,
    CheckCircle,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HRPayrollEmployeePage = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuth();
    const role = String(profile?.role || '').toLowerCase();
    const isHr = role ? role === 'hr' : location.pathname.startsWith('/hr');
    const basePath = role === 'admin'
        ? '/admin'
        : role === 'hr'
            ? '/hr'
            : (location.pathname.startsWith('/hr') ? '/hr' : '/admin');

    const [selectedEmp, setSelectedEmp] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [payslip, setPayslip] = useState(null);
    const [month, setMonth] = useState('March');
    const [year, setYear] = useState('2026');
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [statutorySettings, setStatutorySettings] = useState(null);
    const [generatedPayrollMeta, setGeneratedPayrollMeta] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    const round2 = (value) => Number((Math.round((Number(value) || 0) * 100) / 100).toFixed(2));

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
    const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const getProrationFactor = (data) => {
        const processedDays = Number(data?.processed_days) || 0;
        if (processedDays <= 0) return 1;

        const paidDaysRaw = data?.paid_days === undefined || data?.paid_days === null
            ? processedDays
            : Number(data.paid_days);
        const paidDays = Number.isFinite(paidDaysRaw) ? paidDaysRaw : 0;
        return Math.min(Math.max(paidDays / processedDays, 0), 1);
    };

    const getTdsBreakdown = (annualIncome, slabs = []) => {
        const income = Math.max(0, Number(annualIncome) || 0);

        return slabs.map((slab) => {
            const from = Number(slab.income_from) || 0;
            const to = slab.income_to == null || slab.income_to === '' ? Number.POSITIVE_INFINITY : Number(slab.income_to);
            const rate = Number(slab.rate) || 0;
            const taxable = income > from ? Math.max(0, Math.min(income, to) - from) : 0;
            const tax = taxable * (rate / 100);

            return {
                income_from: from,
                income_to: Number.isFinite(to) ? to : null,
                rate,
                taxable_income: round2(taxable),
                tax_amount: round2(tax),
                applied: taxable > 0,
            };
        });
    };

    const computeAnnualTds = (annualIncome, slabs = []) => {
        const income = Math.max(0, Number(annualIncome) || 0);
        let total = 0;

        for (const slab of slabs) {
            const from = Number(slab.income_from) || 0;
            const to = slab.income_to == null ? Number.POSITIVE_INFINITY : Number(slab.income_to);
            const rate = Number(slab.rate) || 0;

            if (income <= from) continue;

            const taxable = Math.max(0, Math.min(income, to) - from);
            total += taxable * (rate / 100);
        }

        return round2(total);
    };

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                setLoading(true);
                const [employee, settings] = await Promise.all([
                    api.get(`/employees/${employeeId}`),
                    api.get('/payroll/statutory-settings').catch(() => null)
                ]);
                setSelectedEmp(employee);
                if (settings) setStatutorySettings(settings);
            } catch (error) {
                toast.error(error.message || 'Failed to load employee details');
            } finally {
                setLoading(false);
            }
        };

        fetchEmployee();
    }, [employeeId]);

    useEffect(() => {
        if (selectedEmp) {
            setPayslip(buildInitialPayslip(selectedEmp));
        }
    }, [selectedEmp, month, year]);

    useEffect(() => {
        setPayslip((prev) => {
            if (!prev) return prev;
            return recalculatePayslip(prev);
        });
    }, [statutorySettings]);

    useEffect(() => {
        setGeneratedPayrollMeta(null);
    }, [selectedEmp?.id, month, year]);

    useEffect(() => {
        const fetchAttendanceMetrics = async () => {
            if (!selectedEmp) return;

            try {
                setMetricsLoading(true);
                const metrics = await api.get(
                    `/payroll/attendance-metrics?employee_id=${selectedEmp.id}&month=${encodeURIComponent(month)}&year=${year}`
                );

                setPayslip((prev) => {
                    const base = prev || buildInitialPayslip(selectedEmp);
                    const next = {
                        ...base,
                        processed_days: metrics.processed_days,
                        paid_days: metrics.paid_days,
                    };
                    return recalculatePayslip(next);
                });
            } catch (error) {
                console.error(error.message);
            } finally {
                setMetricsLoading(false);
            }
        };

        fetchAttendanceMetrics();
    }, [selectedEmp, month, year]);

    const buildInitialPayslip = (employee) => {
        const annualSalaryInput = Number(employee.salary);
        const annualSalary = Number.isFinite(annualSalaryInput) && annualSalaryInput > 0 ? annualSalaryInput : 0;
        const monthlyCtc = Math.round(annualSalary / 12);
        
        const settings = statutorySettings?.settings || {};
        const employeePfDef = Number(settings.fixed_pf_deduction) || 1800;
        const employerPfDef = employeePfDef;
        const insDef = Number(settings.fixed_insurance_deduction) || 450;
        const { basicRatio, hraRatio, conveyanceRatio, specialRatio } = getBreakupRatios(settings);
        const ptaxAmount = Number(settings.fixed_ptax_deduction) || 200;

        // Breakup base = full Monthly CTC (deductions are applied separately)
        const gross = annualSalary > 0 ? Math.max(0, monthlyCtc) : 0;
        
        // Components based on dynamic logic
        const basic = annualSalary > 0 ? Math.round(gross * basicRatio) : 0;
        const hra = annualSalary > 0 ? Math.round(gross * hraRatio) : 0;
        const conveyance = annualSalary > 0 ? Math.round(gross * conveyanceRatio) : 0;
        const specialAllowance = annualSalary > 0 ? Math.max(0, Math.round(gross * specialRatio)) : 0;

        const ptax = annualSalary > 0 ? ptaxAmount : 0; // Dynamic P Tax
        const otherDeduction = 0;
        const fixedEmployeePf = annualSalary > 0 ? employeePfDef : 0;
        const fixedEmployerPf = annualSalary > 0 ? employerPfDef : 0;
        const fixedInsurance = annualSalary > 0 ? insDef : 0;

        return {
            month,
            year: Number(year),
            emp_code: employee.employee_id || employee.id || 'NA',
            designation: employee.role || '',
            department: employee.department || '',
            location: employee.location || '',
            processed_days: 31,
            paid_days: 31,
            pan_no: employee.pan || '',
            bank_account: employee.bank_account || '',
            bank_name: employee.bank_name || '',
            // Monthly Base Values
            base_basic_salary: basic,
            base_hra: hra,
            base_conveyance: conveyance,
            base_special_allowance: specialAllowance,
            // Prorated Payable Values (Initially same as base)
            basic_salary: basic,
            hra: hra,
            conveyance: conveyance,
            specialAllowance: specialAllowance,
            allowances: conveyance + specialAllowance,
            reimbursements: 0,
            leave_encashment: 0,
            pf: 0,
            pf_employee: 0,
            pf_employer: 0,
            esi_employee: 0,
            esi_employer: 0,
            tds: 0,
            gross_salary: gross,
            deductions: ptax,
            net_salary: gross - ptax,
            ptax,
            otherDeduction,
            fixed_employee_pf: fixedEmployeePf,
            fixed_employer_pf: fixedEmployerPf,
            fixed_insurance: fixedInsurance,
            created_at: new Date().toISOString()
        };
    };

    const recalculatePayslip = (current) => {
        const baseBasic = Number(current.base_basic_salary) || 0;
        const baseHra = Number(current.base_hra) || 0;
        const baseConveyance = Number(current.base_conveyance) || 0;
        const baseSpecial = Number(current.base_special_allowance) || 0;

        const otherDeduction = Number(current.otherDeduction ?? current.tds) || 0;
        const ptax = current.ptax != null && current.ptax !== '' ? Number(current.ptax) : 0;
        
        const factor = getProrationFactor(current);
        const hasZeroFactor = factor === 0;
        const overrides = current.manualProratedOverrides || {};

        // Prorate all Earnings
        const basic_salary = hasZeroFactor
            ? Math.max(0, Number(overrides.basic_salary ?? current.basic_salary ?? 0))
            : Math.round(baseBasic * factor);
        const hra = hasZeroFactor
            ? Math.max(0, Number(overrides.hra ?? current.hra ?? 0))
            : Math.round(baseHra * factor);
        const conveyance = hasZeroFactor
            ? Math.max(0, Number(overrides.conveyance ?? current.conveyance ?? 0))
            : Math.round(baseConveyance * factor);
        const specialAllowance = hasZeroFactor
            ? Math.max(0, Number(overrides.specialAllowance ?? current.specialAllowance ?? 0))
            : Math.round(baseSpecial * factor);
        const allowances = conveyance + specialAllowance;
        const baseSalaryEarnings = basic_salary + hra + allowances;

        // Include reimbursements and leave encashment in gross (matches backend calculation)
        const reimbursements = round2(Number(current.reimbursements) || 0);
        const leaveEncashment = round2(Number(current.leave_encashment) || 0);
        const gross_salary = baseSalaryEarnings + reimbursements + leaveEncashment;

        const fixedEmployeePf = Number(statutorySettings?.settings?.fixed_pf_deduction) || 0;
        const fixedEmployerPf = fixedEmployeePf;
        const fixedInsurance = Number(statutorySettings?.settings?.fixed_insurance_deduction) || 0;
        const slabs = statutorySettings?.tds_slabs || [];

        const pf_employee = 0;
        const pf_employer = 0;
        const esi_employee = 0;
        const esi_employer = 0;
        
        // TDS calculated on base salary earnings only (not including reimbursements)
        const annualTds = computeAnnualTds(baseSalaryEarnings * 12, slabs);
        const tds = round2(annualTds / 12);

        const fixedDeductions = round2(fixedEmployeePf + fixedEmployerPf + fixedInsurance);
        const deductions = round2(fixedDeductions + tds + ptax + round2(otherDeduction));
        const net_salary = round2(gross_salary - deductions);

        return {
            ...current,
            basic_salary,
            hra,
            conveyance,
            specialAllowance,
            allowances,
            pf: pf_employee,
            pf_employee,
            pf_employer,
            esi_employee,
            esi_employer,
            tds,
            gross_salary,
            deductions,
            net_salary,
            reimbursements,
            leave_encashment: leaveEncashment,
            otherDeduction,
            fixed_employee_pf: fixedEmployeePf,
            fixed_employer_pf: fixedEmployerPf,
            fixed_insurance: fixedInsurance,
            year: Number(current.year) || Number(year)
        };
    };

    const updateNumericField = (field, value) => {
        setPayslip((prev) => {
            if (!prev) return prev;
            const parsed = value === '' ? 0 : Number(value);
            const normalized = Number.isNaN(parsed) ? 0 : parsed;
            const editableToBaseFieldMap = {
                basic_salary: 'base_basic_salary',
                hra: 'base_hra',
                conveyance: 'base_conveyance',
                specialAllowance: 'base_special_allowance',
            };

            if (editableToBaseFieldMap[field]) {
                const factor = getProrationFactor(prev);
                const baseField = editableToBaseFieldMap[field];
                const recalculatedBase = factor > 0 ? Math.round(normalized / factor) : normalized;
                const currentOverrides = prev.manualProratedOverrides || {};
                const updatedOverrides = factor === 0
                    ? { ...currentOverrides, [field]: normalized }
                    : currentOverrides;
                const next = {
                    ...prev,
                    [field]: normalized,
                    [baseField]: recalculatedBase,
                    manualProratedOverrides: updatedOverrides,
                };
                return recalculatePayslip(next);
            }

            const next = { ...prev, [field]: normalized };
            return recalculatePayslip(next);
        });
    };

    const normalizePanByPosition = (rawValue) => {
        const source = String(rawValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        let next = '';

        for (const ch of source) {
            const idx = next.length;
            const needsLetter = idx < 5 || idx === 9;
            const needsDigit = idx >= 5 && idx <= 8;
            if (needsLetter && /[A-Z]/.test(ch)) next += ch;
            if (needsDigit && /\d/.test(ch)) next += ch;
            if (next.length >= 10) break;
        }

        return next;
    };

    const updateTextField = (field, value) => {
        setPayslip((prev) => {
            if (!prev) return prev;

            if (field === 'pan_no') {
                return { ...prev, [field]: normalizePanByPosition(value) };
            }

            return { ...prev, [field]: value };
        });
    };

    const generatePayslip = async () => {
        if (!selectedEmp || !payslip) return;

        // Client-side validation — require payable values
        const payableBasic = Number(payslip.basic_salary) || 0;
        const payableGross = Number(payslip.gross_salary) || 0;
        
        if (payableBasic <= 0 || payableGross <= 0) {
            setValidationErrors({ basic_salary: payableBasic <= 0 });
            return;
        }
        setValidationErrors({});

        try {
            setGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 1200));
            const created = await api.post('/payroll', {
                employee_id: selectedEmp.id,
                month: payslip.month,
                year: payslip.year,
                emp_code: payslip.emp_code,
                designation: payslip.designation,
                department: payslip.department,
                location: payslip.location,
                processed_days: payslip.processed_days,
                paid_days: payslip.paid_days,
                pan_no: payslip.pan_no,
                bank_account: payslip.bank_account,
                bank_name: payslip.bank_name,
                basic_salary: payslip.basic_salary,
                hra: payslip.hra,
                conveyance: payslip.conveyance,
                special_allowance: payslip.specialAllowance,
                allowances: payslip.allowances,
                pf: payslip.pf_employee,
                pf_employee: payslip.pf_employee,
                pf_employer: payslip.pf_employer,
                esi_employee: payslip.esi_employee,
                esi_employer: payslip.esi_employer,
                ptax: payslip.ptax,
                tds: payslip.tds,
                other_deduction: payslip.otherDeduction,
                gross_salary: payslip.gross_salary,
                deductions: payslip.deductions,
                net_salary: payslip.net_salary
            });
            if (created?.id) {
                setPayslip((prev) => (prev ? { ...prev, id: created.id } : prev));
            }
            setGeneratedPayrollMeta(created || null);
            toast.success('Payslip generated and saved successfully!');
        } catch (error) {
            const msg = error?.message || 'Failed to generate payslip';
            toast.error(msg, { duration: 5000 });
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!selectedEmp || !payslip) {
            toast.error('Employee details are still loading');
            return;
        }

        try {
            const blob = await pdf(<PayslipPDF payslip={payslip} employee={selectedEmp} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Payslip_${selectedEmp.full_name}_${month}_${year}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF');
        }
    };

    if (loading || !selectedEmp || !payslip) {
        return (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading payroll details...
            </div>
        );
    }

    const previewAnnualIncome = round2((Number(payslip.gross_salary) || 0) * 12);
    const previewBreakdown = getTdsBreakdown(previewAnnualIncome, statutorySettings?.tds_slabs || []);
    const generatedBreakdown = generatedPayrollMeta?.statutory_breakup?.tds_breakdown || [];
    const generatedAnnualTaxable = generatedPayrollMeta?.annual_taxable_income;

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => navigate(`${basePath}/payroll`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                        <ArrowLeft size={16} /> Back to Employee List
                    </button>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                        Payroll / {selectedEmp.full_name}
                    </p>
                    <h1 style={{ fontSize: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Wallet size={24} color="var(--primary)" /> Payroll: {selectedEmp.full_name}
                    </h1>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    All salary amounts are in INR (₹).
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Payslip Preview</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: '8px 12px', width: 'auto' }}>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                            </select>
                            <select className="input-field" value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: '8px 12px', width: 'auto' }}>
                                {[2024, 2025, 2026].filter(y => y <= new Date().getFullYear()).map(y => <option key={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ background: '#F9FAFB', padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Employee</p>
                                <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{selectedEmp.full_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Period</p>
                                <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{month} {year}</p>
                            </div>
                        </div>

                        <div className="payroll-breakdown" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', padding: '24px' }}>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>EARNINGS (Prorated Monthly)</p>
                                <div className="pay-row pay-row-editable">
                                <span>Basic Salary <span style={{ color: '#EF4444' }}>*</span></span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                        <input type="number" value={payslip.basic_salary} onChange={(e) => { updateNumericField('basic_salary', e.target.value); setValidationErrors((v) => ({ ...v, basic_salary: false })); }} style={{ width: '100%', textAlign: 'right', border: validationErrors.basic_salary ? '2px solid #EF4444' : undefined }} className="input-field" />
                                    </div>
                                    {validationErrors.basic_salary && <p style={{ color: '#EF4444', fontSize: '11px', margin: '2px 0 0', gridColumn: '1 / -1' }}>Basic Salary is required</p>}
                                </div>
                                <div className="pay-row pay-row-editable">
                                    <span>HRA <span style={{ color: '#EF4444' }}>*</span></span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                        <input type="number" value={payslip.hra} onChange={(e) => updateNumericField('hra', e.target.value)} style={{ width: '100%', textAlign: 'right' }} className="input-field" />
                                    </div>
                                </div>
                                <div className="pay-row pay-row-editable">
                                    <span>Conveyance</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                        <input type="number" value={payslip.conveyance} onChange={(e) => updateNumericField('conveyance', e.target.value)} style={{ width: '100%', textAlign: 'right' }} className="input-field" />
                                    </div>
                                </div>
                                <div className="pay-row pay-row-editable">
                                    <span>Special Allowance</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                        <input type="number" value={payslip.specialAllowance} onChange={(e) => updateNumericField('specialAllowance', e.target.value)} style={{ width: '100%', textAlign: 'right' }} className="input-field" />
                                    </div>
                                </div>
                                <div className="pay-row total"><span>Gross Total (Payable)</span> <span>₹{payslip.gross_salary}</span></div>
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: '#EF4444', marginBottom: '12px' }}>DEDUCTIONS</p>
                                <div className="pay-row"><span>Fixed PF (Employee)</span> <span>₹{payslip.fixed_employee_pf || 0}</span></div>
                                <div className="pay-row"><span>Fixed PF (Employer)</span> <span>₹{payslip.fixed_employer_pf || 0}</span></div>
                                <div className="pay-row"><span>Fixed Insurance</span> <span>₹{payslip.fixed_insurance || 0}</span></div>
                                <div className="pay-row"><span>TDS</span> <span>₹{payslip.tds}</span></div>
                                <div className="pay-row pay-row-editable">
                                    <span>Other Deduction</span>
                                    <input type="number" value={payslip.otherDeduction} onChange={(e) => updateNumericField('otherDeduction', e.target.value)} style={{ width: '100%', textAlign: 'right' }} className="input-field" />
                                </div>
                                <div className="pay-row pay-row-editable">
                                    <span>P Tax</span>
                                    <input type="number" value={payslip.ptax} onChange={(e) => updateNumericField('ptax', e.target.value)} style={{ width: '100%', textAlign: 'right' }} className="input-field" />
                                </div>
                                <div className="pay-row total"><span>Total Deductions</span> <span>₹{payslip.deductions}</span></div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', background: '#FCFCFD' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>Payslip Details (Editable)</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                {metricsLoading
                                    ? 'Calculating attendance days...'
                                    : isHr
                                        ? 'Paid/Processed days are auto-calculated from attendance (calendar month). All figures below are in INR (₹).'
                                        : 'As admin, you can override Paid Days before saving payroll. All figures below are in INR (₹).'}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Employee Code</label>
                                    <input className="input-field" value={payslip.emp_code || ''} onChange={(e) => updateTextField('emp_code', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Designation</label>
                                    <input className="input-field" value={payslip.designation || ''} onChange={(e) => updateTextField('designation', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Department</label>
                                    <input className="input-field" value={payslip.department || ''} onChange={(e) => updateTextField('department', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Location</label>
                                    <input className="input-field" value={payslip.location || ''} onChange={(e) => updateTextField('location', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PAN</label>
                                    <input className="input-field" value={payslip.pan_no || ''} onChange={(e) => updateTextField('pan_no', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bank Name</label>
                                    <input className="input-field" value={payslip.bank_name || ''} onChange={(e) => updateTextField('bank_name', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bank Account</label>
                                    <input className="input-field" value={payslip.bank_account || ''} onChange={(e) => updateTextField('bank_account', e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Processed Days</label>
                                    <input className="input-field" type="number" value={payslip.processed_days || 0} readOnly />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Paid Days</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        min="0"
                                        max={payslip.processed_days || 0}
                                        step="0.5"
                                        value={payslip.paid_days || 0}
                                        onChange={(e) => {
                                            if (isHr) return;
                                            updateNumericField('paid_days', e.target.value);
                                        }}
                                        readOnly={isHr}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PF Employer Contribution</label>
                                    <input className="input-field" type="number" value={payslip.pf_employer || 0} readOnly />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESI Employer Contribution</label>
                                    <input className="input-field" type="number" value={payslip.esi_employer || 0} readOnly />
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', background: 'var(--card-bg)' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>TDS Slab Breakdown</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                {generatedBreakdown.length > 0
                                    ? `Generated payroll uses annual taxable income of ${formatCurrency(generatedAnnualTaxable)}.`
                                    : `Preview uses annualized gross ${formatCurrency(previewAnnualIncome)}. Generate payslip to see exact applied slabs after declaration adjustments.`}
                            </p>

                            <div style={{ display: 'grid', gap: '8px' }}>
                                {(generatedBreakdown.length > 0 ? generatedBreakdown : previewBreakdown).map((row, idx) => (
                                    <div
                                        key={`${idx}-${row.income_from}-${row.income_to ?? 'open'}`}
                                        style={{
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            background: row.applied ? 'rgba(16, 185, 129, 0.10)' : 'transparent'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                Slab {idx + 1}: {formatCurrency(row.income_from)} to {row.income_to == null ? 'No Upper Cap' : formatCurrency(row.income_to)} @ {row.rate}%
                                            </span>
                                            <span style={{ fontSize: '12px', color: row.applied ? '#059669' : 'var(--text-muted)', fontWeight: 600 }}>
                                                {row.applied ? 'Applied' : 'Not Applied'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                            <span>Taxable in slab: {formatCurrency(row.taxable_income)}</span>
                                            <span>Tax from slab: {formatCurrency(row.tax_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ background: '#EFF6FF', padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '14px', fontWeight: '600' }}>Net Salary Payable</p>
                            <p style={{ fontSize: '24px', fontWeight: '800', color: '#1E40AF' }}>₹{payslip.net_salary}</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                        <button 
                            id="confirm-save-btn" 
                            onClick={generatePayslip} 
                            disabled={generating || !!generatedPayrollMeta} 
                            className={generatedPayrollMeta ? 'generated-success' : generating ? 'generating' : 'normal'}
                        >
                            {generating ? <Loader2 className="animate-spin" size={18} /> : generatedPayrollMeta ? <CheckCircle size={18} /> : <CheckCircle size={18} />}
                            {generating ? 'Generating...' : generatedPayrollMeta ? 'Payslip Generated' : 'Confirm & Save Payslip'}
                        </button>

                        <button
                            onClick={async () => {
                                if (!payslip?.id) {
                                    toast.error('Payslip must be saved first before sending email');
                                    return;
                                }
                                try {
                                    setGenerating(true);
                                    const blob = await pdf(<PayslipPDF payslip={payslip} employee={selectedEmp} />).toBlob();
                                    const formData = new FormData();
                                    const fileName = `Payslip_${selectedEmp.full_name}_${payslip.month}_${payslip.year}.pdf`;
                                    formData.append('payslipPdf', blob, fileName);
                                    formData.append('pdfFileName', fileName);

                                    await api.post(`/payroll/${payslip.id}/send`, formData);
                                    toast.success('Payslip sent successfully to ' + selectedEmp.email);
                                } catch (error) {
                                    toast.error(error.message || 'Failed to send payslip email');
                                } finally {
                                    setGenerating(false);
                                }
                            }}
                            className="btn-secondary"
                            style={{ flex: 1, background: '#F3F4F6', color: '#000000' }}
                            disabled={generating || !payslip?.id}
                        >
                            {generating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send Email
                        </button>

                        <button onClick={handleDownloadPDF} className="btn-secondary" style={{ flex: 1, background: '#F3F4F6', color: '#000000' }}>
                            <Download size={18} /> PDF
                        </button>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '760px' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                        PDF Template Preview (exact generated format)
                    </div>
                    <div style={{ height: '700px', background: '#525659' }}>
                        <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                            <PayslipPDF payslip={payslip} employee={selectedEmp} />
                        </PDFViewer>
                    </div>
                </div>
            </div>

            <style>{`
                #confirm-save-btn {
                    flex: 1.5;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: none !important;
                }
                #confirm-save-btn.normal {
                    background-color: #3B82F6 !important;
                    color: #000000 !important;
                    cursor: pointer;
                }
                #confirm-save-btn.generating {
                    background-color: #6B7280 !important;
                    color: #FFFFFF !important;
                    cursor: not-allowed;
                }
                #confirm-save-btn:disabled {
                    background-color: #6B7280 !important;
                    color: #FFFFFF !important;
                }

                .pay-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(120px, 160px);
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 10px;
                    color: var(--text-main);
                }

                .pay-row span:first-child {
                    color: var(--text-main);
                }

                .pay-row span:last-child {
                    justify-self: end;
                    font-weight: 600;
                }

                .pay-row.total {
                    padding-top: 8px;
                    border-top: 1px dashed var(--border);
                    margin-top: 8px;
                    font-weight: 700;
                }

                .pay-row.pay-row-editable .input-field {
                    margin: 0;
                }

                @media (max-width: 820px) {
                    .pay-row {
                        grid-template-columns: 1fr;
                        gap: 6px;
                    }

                    .pay-row span:last-child {
                        justify-self: start;
                    }
                }
            `}</style>
        </>
    );
};

export default HRPayrollEmployeePage;
