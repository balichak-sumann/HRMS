import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import Form16SummaryPDF from '../components/Payroll/Form16SummaryPDF';

const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRForm16Page = () => {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
    const [summary, setSummary] = useState(null);

    const fetchEmployees = async () => {
        const data = await api.get('/employees');
        const rows = Array.isArray(data) ? data : [];
        setEmployees(rows);
        if (!employeeId && rows[0]) setEmployeeId(rows[0].id);
    };

    const fetchSummary = async (empId = employeeId, fy = financialYear) => {
        if (!empId) return;
        try {
            setLoading(true);
            const data = await api.get(`/income-tax/hr/form16/${empId}?financial_year=${encodeURIComponent(fy)}`);
            setSummary(data || null);
        } catch (error) {
            console.error('Failed to load Form 16 summary', error);
            alert(error.message || 'Failed to load Form 16 summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                await fetchEmployees();
            } catch (error) {
                console.error('Failed to load employees', error);
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (employeeId) fetchSummary(employeeId, financialYear);
    }, [employeeId]);

    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Form 16</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Generate and download employee Form 16 summaries.
                </p>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="input-field" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: '240px' }}>
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                        ))}
                    </select>
                    <input className="input-field" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} style={{ width: '160px' }} />
                    <button className="btn-primary" onClick={() => fetchSummary(employeeId, financialYear)}>Load</button>
                </div>

                {summary && (
                    <PDFDownloadLink
                        document={<Form16SummaryPDF summary={summary} />}
                        fileName={`Form16_${summary?.employee?.full_name || 'Employee'}_${summary?.financial_year || financialYear}.pdf`}
                        style={{ textDecoration: 'none' }}
                    >
                        {({ loading: pdfLoading }) => (
                            <button className="btn-primary" disabled={pdfLoading}>
                                {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PDF
                            </button>
                        )}
                    </PDFDownloadLink>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px' }}>
                    <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                </div>
            ) : !summary ? (
                <div className="card" style={{ padding: '16px', color: 'var(--text-muted)' }}>No summary found.</div>
            ) : (
                <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>{summary.employee?.full_name} | FY {summary.financial_year}</h3>
                    <p>Gross Income: <strong>{money(summary.gross_income)}</strong></p>
                    <p>Approved Deductions: <strong>{money(summary.total_approved_deductions)}</strong></p>
                    <p>Taxable Income: <strong>{money(summary.taxable_income)}</strong></p>
                    <p>Total TDS Deducted: <strong>{money(summary.total_tds_deducted)}</strong></p>
                </div>
            )}
        </>
    );
};

export default HRForm16Page;
