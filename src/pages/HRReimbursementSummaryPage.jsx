import React, { useEffect, useState } from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { api } from '../lib/api';
import ReimbursementSummaryPDF from '../components/Payroll/ReimbursementSummaryPDF';

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const now = new Date();
const defaultMonth = monthNames[now.getMonth()];
const defaultYear = String(now.getFullYear());

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRReimbursementSummaryPage = () => {
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState({
        month: defaultMonth,
        year: Number(defaultYear),
        total_approved_amount: 0,
        employees: [],
    });

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/expenses/summary/monthly?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`);
            setReport(data || {
                month,
                year: Number(year),
                total_approved_amount: 0,
                employees: [],
            });
        } catch (error) {
            console.error('Failed to fetch reimbursement summary', error);
            alert(error.message || 'Failed to fetch reimbursement summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Reimbursement Summary</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        Monthly approved reimbursements grouped by employee.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <select className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: '140px' }}>
                        {monthNames.map((m) => (
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
                    <button className="btn-primary" style={{ borderRadius: '8px' }} onClick={fetchSummary}>Load</button>
                    <PDFDownloadLink
                        document={<ReimbursementSummaryPDF report={report} />}
                        fileName={`Reimbursement_Summary_${month}_${year}.pdf`}
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
                    <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total Approved</p>
                        <p style={{ fontSize: '24px', fontWeight: '700' }}>{money(report.total_approved_amount)}</p>
                    </div>

                    <div className="card" style={{ padding: '16px' }}>
                        <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Employee Wise Approved Reimbursements</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>Employee</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Approved Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.employees || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={2} style={{ padding: '10px', color: 'var(--text-muted)' }}>
                                                No approved reimbursements for {month} {year}.
                                            </td>
                                        </tr>
                                    ) : report.employees.map((row) => (
                                        <tr key={row.employee_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px' }}>{row.full_name}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{money(row.approved_amount)}</td>
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

export default HRReimbursementSummaryPage;
