import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { Loader2, DollarSign, Calculator, Calendar } from 'lucide-react';

const toInr = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toRatio = (value, fallback = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    if (n <= 1) return n;
    if (n <= 100) return n / 100;
    return fallback;
};

const getBreakupRatios = (settings = {}) => {
    const basicRatio = toRatio(settings.basic_ratio, 0);
    const hraRatio = toRatio(settings.hra_ratio, 0);
    const conveyanceRatio = toRatio(settings.conveyance_amount, 0);
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

const EmployeeSalaryStructurePage = () => {
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [current, setCurrent] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyEnabled, setHistoryEnabled] = useState(false);
    const [statutorySettings, setStatutorySettings] = useState(null);

    const loadCurrent = async () => {
        const data = await api.get('/salary-revisions/my/current');
        setCurrent(data || null);
        setHistoryEnabled(!!data?.history_enabled);
    };

    const loadStatutorySettings = async () => {
        try {
            const data = await api.get('/payroll/statutory-settings');
            setStatutorySettings(data || null);
        } catch (err) {
            console.error('Failed to fetch statutory settings', err);
        }
    };

    const loadHistory = async () => {
        try {
            setHistoryLoading(true);
            const data = await api.get('/salary-revisions/my/history');
            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            await Promise.all([loadCurrent(), loadStatutorySettings()]);
            // If history is enabled, we'll fetch it in the effect
        } catch (error) {
            console.error('Failed to load salary structure', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        if (historyEnabled) {
            loadHistory().catch(() => {});
        }
    }, [historyEnabled]);

    const breakdown = useMemo(() => {
        if (!current || !statutorySettings) return null;
        const settings = statutorySettings.settings || {};
        const annualCtc = Number(current.total_ctc || 0);
        const monthlyCtc = Math.round(annualCtc / 12);
        const hasPaidCtc = annualCtc > 0;

        const employeePfMonth = hasPaidCtc ? (Number(settings.fixed_pf_deduction) || 0) : 0;
        const employerPfMonth = employeePfMonth;
        const insuranceMonth = hasPaidCtc ? (Number(settings.fixed_insurance_deduction) || 0) : 0;
        const professionalTaxMonth = hasPaidCtc ? (Number(settings.fixed_ptax_deduction) || 0) : 0;

        const grossMonth = hasPaidCtc
            ? Math.max(0, monthlyCtc - employeePfMonth - employerPfMonth - insuranceMonth - professionalTaxMonth)
            : 0;

        const { basicRatio, hraRatio, conveyanceRatio, specialRatio } = getBreakupRatios(settings);

        const basicPayMonth = hasPaidCtc ? Math.round(grossMonth * basicRatio) : 0;
        const hraMonth = hasPaidCtc ? Math.round(grossMonth * hraRatio) : 0;
        const conveyanceMonth = hasPaidCtc ? Math.round(grossMonth * conveyanceRatio) : 0;
        const specialAllowanceMonth = hasPaidCtc ? Math.max(0, Math.round(grossMonth * specialRatio)) : 0;

        return {
            monthlyCtc,
            annualCtc,
            employeePfMonth,
            employerPfMonth,
            insuranceMonth,
            professionalTaxMonth,
            grossMonth,
            basicPayMonth,
            hraMonth,
            conveyanceMonth,
            specialAllowanceMonth,
        };
    }, [current, statutorySettings]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 className="animate-spin" size={36} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', color: 'var(--text-main)', fontWeight: '800', letterSpacing: '-0.02em' }}>My Salary Structure</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px' }}>
                    View your current detailed salary breakdown and approved package.
                </p>
            </div>

            {!current ? (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Salary structure not available yet. Please contact HR.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Detailed Breakdown Card */}
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calculator size={20} color="var(--primary)" /> Salary Annexure
                                </h3>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    Effective: {current.effective_date ? new Date(current.effective_date).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <div style={{ padding: '0 24px 24px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            <th style={{ padding: '12px 0' }}>Salary Component</th>
                                            <th style={{ padding: '12px 0', textAlign: 'right' }}>Monthly (INR)</th>
                                            <th style={{ padding: '12px 0', textAlign: 'right' }}>Annual (INR)</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '14px' }}>
                                        {breakdown && (
                                            <>
                                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '14px 0', fontWeight: '500' }}>Basic Pay</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.basicPayMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.basicPayMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '14px 0', fontWeight: '500' }}>House Rent Allowance (HRA)</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.hraMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.hraMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '14px 0', fontWeight: '500' }}>Conveyance Allowance</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.conveyanceMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.conveyanceMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '14px 0', fontWeight: '500' }}>Special Allowance</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.specialAllowanceMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.specialAllowanceMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.01)' }}>
                                                    <td style={{ padding: '14px 0', fontWeight: '800' }}>Net Payable (A)</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: '800' }}>{toInr(breakdown.grossMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: '800' }}>{toInr(breakdown.grossMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    <td style={{ padding: '14px 0' }}>Employee PF Contribution</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.employeePfMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.employeePfMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    <td style={{ padding: '14px 0' }}>Employer PF Contribution</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.employerPfMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.employerPfMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    <td style={{ padding: '14px 0' }}>Insurance (Company Paid)</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.insuranceMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.insuranceMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    <td style={{ padding: '14px 0' }}>Professional Tax</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.professionalTaxMonth)}</td>
                                                    <td style={{ padding: '14px 0', textAlign: 'right' }}>{toInr(breakdown.professionalTaxMonth * 12)}</td>
                                                </tr>
                                                <tr style={{ background: 'var(--primary-glow)', borderBottom: '2px solid var(--primary)' }}>
                                                    <td style={{ padding: '16px 0', fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>Total CTC (A + Benefits)</td>
                                                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>{toInr(breakdown.monthlyCtc)}</td>
                                                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '800', color: 'var(--primary)', fontSize: '16px' }}>{toInr(breakdown.annualCtc)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Revision History */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Calendar size={20} color="var(--primary)" /> Salary Revision History
                            </h3>
                            {!historyEnabled ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Revision history visibility is currently disabled by HR.</p>
                            ) : historyLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                    <Loader2 className="animate-spin" size={16} /> Loading history...
                                </div>
                            ) : history.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No salary revisions found for your account.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {history.map((revision) => (
                                        <div key={revision.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', background: 'var(--card-bg)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '11px', 
                                                    fontWeight: '700',
                                                    background: revision.status === 'approved' ? '#DEF7EC' : '#FDE8E8',
                                                    color: revision.status === 'approved' ? '#03543F' : '#9B1C1C',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {revision.status}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Effective: {new Date(revision.effective_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Total CTC:</span>
                                                    <span style={{ fontWeight: '600', marginLeft: '6px' }}>{toInr(revision.proposed_total_ctc)}</span>
                                                </div>
                                            </div>
                                            {revision.approver_comment && (
                                                <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    "{revision.approver_comment}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Quick Stats Card */}
                        <div className="card" style={{ padding: '24px', background: 'var(--primary)', color: '#fff' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Annual Gross CTC</p>
                                <h2 style={{ fontSize: '28px', fontWeight: '800' }}>{toInr(current.total_ctc)}</h2>
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '13px', opacity: 0.8 }}>Monthly Gross</span>
                                    <span style={{ fontWeight: '600' }}>{toInr(current.total_ctc / 12)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', opacity: 0.8 }}>Net Take Home*</span>
                                    <span style={{ fontWeight: '600' }}>{breakdown ? toInr(breakdown.grossMonth) : '-'}</span>
                                </div>
                                <p style={{ fontSize: '10px', marginTop: '12px', opacity: 0.7, fontStyle: 'italic' }}>
                                    *Approximate net monthly salary after standard statutory deductions. Correct tax as per declaration will apply.
                                </p>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-main)' }}>Note on Calculations</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                This breakdown follows the standard company ratio of 40:20:20 (Basic:HRA:Conveyance). 
                                PF, Professional Tax, and Insurance are deducted as per statutory norms. 
                                For any discrepancies, please reach out to your Finance Lead.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeSalaryStructurePage;
