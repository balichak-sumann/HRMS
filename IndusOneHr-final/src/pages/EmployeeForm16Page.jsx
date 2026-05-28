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

const EmployeeForm16Page = () => {
    const [loading, setLoading] = useState(true);
    const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
    const [summary, setSummary] = useState(null);

    const fetchSummary = async (fy = financialYear) => {
        try {
            setLoading(true);
            const data = await api.get(`/income-tax/my/form16?financial_year=${encodeURIComponent(fy)}`);
            setSummary(data || null);
        } catch (error) {
            console.error('Failed to load Form 16 summary', error);
            alert(error.message || 'Failed to load Form 16 summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>My Form 16</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Download your annual tax summary and TDS details.
                </p>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input className="input-field" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} style={{ width: '160px' }} />
                    <button className="btn-primary" onClick={() => fetchSummary(financialYear)}>Load</button>
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
                    <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>FY {summary.financial_year}</h3>
                    <p>Gross Income: <strong>{money(summary.gross_income)}</strong></p>
                    <p>Approved Deductions: <strong>{money(summary.total_approved_deductions)}</strong></p>
                    <p>Taxable Income: <strong>{money(summary.taxable_income)}</strong></p>
                    <p>Total TDS Deducted: <strong>{money(summary.total_tds_deducted)}</strong></p>
                </div>
            )}
        </>
    );
};

export default EmployeeForm16Page;
