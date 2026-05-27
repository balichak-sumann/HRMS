import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import PayslipPDF from '../components/Payroll/PayslipPDF';
import {
    FileText,
    Download,
    Eye,
    Loader2,
    Calendar,
    X
} from 'lucide-react';

const EmployeePayslipsPage = () => {
    const [payslips, setPayslips] = useState([]);
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState(null);

    const getRowSortScore = (row) => {
        const updatedAt = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
        const createdAt = row?.created_at ? new Date(row.created_at).getTime() : 0;
        return Math.max(updatedAt, createdAt, 0);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch payslips for the logged-in user
            const psData = await api.get('/payroll');

            const latestByPeriod = new Map();
            for (const ps of psData || []) {
                const key = `${String(ps.employee_id || '')}::${String(ps.month || '').trim().toLowerCase()}::${Number(ps.year) || ''}`;
                const current = latestByPeriod.get(key);
                if (!current || getRowSortScore(ps) >= getRowSortScore(current)) {
                    latestByPeriod.set(key, ps);
                }
            }

            // Ensure fields are properly mapped without overriding 0 values with hardcoded calculations
            const enrichedPayslips = [...latestByPeriod.values()].map(ps => {
                return {
                    ...ps,
                    gross_salary: Number(ps.gross_salary ?? 0),
                    deductions: Number(ps.deductions ?? 0),
                    net_salary: Number(ps.net_salary ?? 0),
                    conveyance: Number(ps.conveyance ?? 0),
                    specialAllowance: Number(ps.special_allowance ?? ps.specialAllowance ?? 0),
                    pf_employee: Number(ps.pf_employee ?? ps.pf ?? 0),
                    esi_employee: Number(ps.esi_employee ?? 0),
                    ptax: Number(ps.ptax ?? 0),
                    otherDeduction: Number(ps.other_deduction ?? ps.otherDeduction ?? 0)
                };
            });

            setPayslips(enrichedPayslips);

            // Employee data will be part of the payslip relation in local API
            if (enrichedPayslips.length > 0) {
                setEmployee({
                    id: enrichedPayslips[0].employee_uuid || enrichedPayslips[0].employee_id,
                    full_name: enrichedPayslips[0].full_name,
                    department: enrichedPayslips[0].department,
                    role: enrichedPayslips[0].role,
                    location: enrichedPayslips[0].location
                });
            }
        } catch (error) {
            console.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = (ps) => {
        setSelectedPayslip(ps);
        setIsPreviewOpen(true);
    };

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={24} color="var(--primary)" /> My Payslips
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Access and download your monthly salary statements.</p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {payslips.map((ps) => (
                        <div key={ps.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '20px', background: 'rgba(249, 250, 251, 0.5)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ background: 'var(--card-bg)', color: 'var(--text-main)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <Calendar size={20} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{ps.month} {ps.year}</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generated on {new Date(ps.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>₹{ps.net_salary}</span>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', gap: '12px' }}>
                                <PDFDownloadLink
                                    document={<PayslipPDF payslip={ps} employee={employee} />}
                                    fileName={`Payslip_${ps.month}_${ps.year}.pdf`}
                                    style={{ flex: 1, textDecoration: 'none' }}
                                >
                                    {({ loading: pdfLoading }) => (
                                        <button className="btn-action" disabled={pdfLoading} style={{ background: 'var(--primary)', color: 'white', border: 'none', width: '100%' }}>
                                            <Download size={16} />
                                            {pdfLoading ? 'Loading...' : 'Download PDF'}
                                        </button>
                                    )}
                                </PDFDownloadLink>
                                <button
                                    onClick={() => handlePreview(ps)}
                                    className="btn-action"
                                    style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                                >
                                    <Eye size={16} />
                                    Preview
                                </button>
                            </div>
                        </div>
                    ))}

                    {payslips.length === 0 && (
                        <div className="card" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No payslips found for your account.
                        </div>
                    )}
                </div>
            )}

            {/* Preview Modal */}
            {isPreviewOpen && selectedPayslip && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '1000px',
                        margin: '0 auto',
                        height: '100%',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                                Payslip Preview - {selectedPayslip.month} {selectedPayslip.year}
                            </h2>
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                style={{
                                    border: 'none',
                                    background: '#f3f4f6',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, background: '#525659' }}>
                            <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                                <PayslipPDF payslip={selectedPayslip} employee={employee} />
                            </PDFViewer>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .btn-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action:hover { opacity: 0.9; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </>
    );
};

export default EmployeePayslipsPage;
