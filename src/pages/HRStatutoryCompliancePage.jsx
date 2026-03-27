import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Calendar, Download, Loader2 } from 'lucide-react';
import StatutoryCompliancePDF from '../components/Payroll/StatutoryCompliancePDF';

const currentDate = new Date();
const defaultMonth = currentDate.toLocaleString('en-US', { month: 'long' });
const defaultYear = String(currentDate.getFullYear());

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRStatutoryCompliancePage = () => {
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);
    const [report, setReport] = useState({ month: defaultMonth, year: Number(defaultYear), totals: {}, records: [] });

    const fetchReport = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/payroll/compliance-report?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`);
            setReport(data || { month, year: Number(year), totals: {}, records: [] });
        } catch (error) {
            console.error('Failed to fetch statutory report', error);
            alert(error.message || 'Failed to fetch statutory report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Statutory Report</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        Monthly totals for PF, ESI and TDS based on generated payroll.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <select className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: '140px' }}>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <select className="input-field" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: '100px' }}>
                        {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 4 + i))
                            .filter(y => Number(y) <= new Date().getFullYear())
                            .map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                    </select>
                    <button className="btn-primary" style={{ borderRadius: '8px' }} onClick={fetchReport}>Load</button>
                    <PDFDownloadLink
                        document={<StatutoryCompliancePDF report={report} />}
                        fileName={`Statutory_Compliance_${month}_${year}.pdf`}
                        style={{ textDecoration: 'none' }}
                    >
                        {({ loading: pdfLoading }) => (
                            <button className="btn-primary" style={{ borderRadius: '8px' }} disabled={pdfLoading}>
                                {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                PDF
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px' }}>
                    <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div className="card" style={{ padding: '14px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>PF Collected (Employee)</p>
                            <p style={{ fontSize: '21px', fontWeight: '700', color: 'var(--text-main)' }}>{money(report?.totals?.pf_employee)}</p>
                        </div>
                        <div className="card" style={{ padding: '14px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>ESI Collected (Employee)</p>
                            <p style={{ fontSize: '21px', fontWeight: '700', color: 'var(--text-main)' }}>{money(report?.totals?.esi_employee)}</p>
                        </div>
                        <div className="card" style={{ padding: '14px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>TDS Deducted</p>
                            <p style={{ fontSize: '21px', fontWeight: '700', color: 'var(--text-main)' }}>{money(report?.totals?.tds)}</p>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '16px' }}>
                        <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Monthly Payroll Statutory Breakup</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>Employee</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Gross</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>PF Emp</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>ESI Emp</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>TDS</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Net</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report?.records || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '10px', color: 'var(--text-muted)' }}>
                                                No payroll records found for {month} {year}.
                                            </td>
                                        </tr>
                                    ) : report.records.map((row) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '8px' }}>{row.full_name}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.gross_salary)}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.pf_employee)}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.esi_employee)}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.tds)}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.net_salary)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default HRStatutoryCompliancePage;
