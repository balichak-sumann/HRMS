import React, { useRef, useState, useEffect } from 'react';
import IDCard from '../components/IDCard';
import { toPng } from 'html-to-image';
import { downloadIdCardPdf } from '../lib/idCardExport';
import { Download, Share2, FileDown, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const EmployeeIDCardPage = () => {
    const { profile } = useAuth();
    const idCardRef = useRef(null);
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [pdfExporting, setPdfExporting] = useState(false);

    useEffect(() => {
        const fetchEmployeeData = async () => {
            try {
                // Fetch full employee details using current user's profile
                const employees = await api.get('/employees');
                const currentEmp = employees.find(e => e.email === profile?.email);
                setEmployee(currentEmp);
            } catch (error) {
                console.error('Error fetching employee data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployeeData();
    }, [profile]);

    const handleDownloadPng = async () => {
        if (!idCardRef.current) return;
        try {
            setExporting(true);
            const dataUrl = await toPng(idCardRef.current, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `ID_Card_${employee.full_name.replace(' ', '_')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('PNG Export failed', err);
        } finally {
            setExporting(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My IndusInnovate ID Card',
                    text: `Official ID Card for ${employee.full_name} at IndusInnovate Technologies`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            alert('Web Share API not supported on this browser.');
        }
    };

    const handleDownloadPdf = async () => {
        if (!idCardRef.current || !employee) return;
        try {
            setPdfExporting(true);
            await downloadIdCardPdf({
                node: idCardRef.current,
                fullName: employee.full_name,
                fallbackName: employee.employee_id || employee.id || 'Employee'
            });
        } catch (err) {
            console.error('PDF Export failed', err);
        } finally {
            setPdfExporting(false);
        }
    };

    if (loading) {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                </div>
            </>
        );
    }

    if (!employee) {
        return (
            <>
                <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Employee profile not found. Please contact HR.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)', fontWeight: '700' }}>Digital ID Card</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Access your official employment identity.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
                <IDCard employee={employee} idRef={idCardRef} />

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        onClick={handleDownloadPng}
                        disabled={exporting}
                        className="btn-export"
                    >
                        <Download size={18} />
                        {exporting ? 'Saving...' : 'Download PNG'}
                    </button>

                    <button
                        onClick={handleDownloadPdf}
                        disabled={pdfExporting}
                        className="btn-export"
                        style={{ background: '#F9FAFB', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                    >
                        <FileDown size={18} />
                        {pdfExporting ? 'Saving...' : 'Download PDF'}
                    </button>

                    <button
                        onClick={handleShare}
                        className="btn-export"
                        style={{ background: '#F0F7FF', color: 'var(--primary)', border: 'none' }}
                    >
                        <Share2 size={18} />
                        Share ID
                    </button>
                </div>
            </div>

            <style>{`
                .btn-export {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--primary);
                    color: white;
                    border: none;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .btn-export:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .btn-export:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                @media print {
                    header, nav, .btn-export, h1, p { display: none !important; }
                    body { background: white !important; }
                    #digital-id-card { margin: 0 auto !important; box-shadow: none !important; }
                }
            `}</style>
        </>
    );
};

export default EmployeeIDCardPage;
