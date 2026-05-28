import React, { useRef, useState } from 'react';
import EmployeeTable from '../components/Employees/EmployeeTable';
import AddEmployeeModal from '../components/Employees/AddEmployeeModal';
import { CreditCard, Users, UserMinus, Download, FileText } from 'lucide-react';
import IDCard from '../components/IDCard';
import HROffboardingPage from './HROffboardingPage';
import HRSalaryRevisionsPage from './HRSalaryRevisionsPage';
import { toPng } from 'html-to-image';
import { downloadIdCardPdf } from '../lib/idCardExport';

const EmployeesPage = () => {
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'id-cards' | 'offboarding' | 'salary-revisions'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [exportingPngId, setExportingPngId] = useState(null);
    const [exportingPdfId, setExportingPdfId] = useState(null);
    const cardRefs = useRef({});

    const handleDataLoaded = (data) => {
        setEmployees(data);
    };

    const handleEdit = (employee) => {
        setEmployeeToEdit(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEmployeeToEdit(null);
    };

    const sanitizeFileName = (rawName, fallback = 'Employee') => {
        const safe = String(rawName || '')
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^A-Za-z0-9_-]/g, '');
        return safe || fallback;
    };

    const setCardRef = (employeeId, node) => {
        if (!employeeId) return;
        if (node) {
            cardRefs.current[employeeId] = node;
            return;
        }
        delete cardRefs.current[employeeId];
    };

    const handleDownloadPng = async (employee) => {
        const node = cardRefs.current[employee?.id];
        if (!node || !employee) return;

        try {
            setExportingPngId(employee.id);
            const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `ID_Card_${sanitizeFileName(employee.full_name, employee.employee_id || employee.id)}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export ID card PNG:', error);
        } finally {
            setExportingPngId(null);
        }
    };

    const handleDownloadPdf = async (employee) => {
        const node = cardRefs.current[employee?.id];
        if (!node || !employee) return;

        try {
            setExportingPdfId(employee.id);
            await downloadIdCardPdf({
                node,
                fullName: employee.full_name,
                fallbackName: employee.employee_id || employee.id || 'Employee',
            });
        } catch (error) {
            console.error('Failed to export ID card PDF:', error);
        } finally {
            setExportingPdfId(null);
        }
    };

    return (
        <>
            <div className="no-print responsive-flex-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-3xl)', color: 'var(--text-main)', fontWeight: '700' }}>Employees</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-md)', marginTop: '4px' }}>
                        Manage employees, view details, and issue digital identity cards.
                    </p>
                </div>

                {activeTab === 'id-cards' && null}
            </div>

            {/* Tabs */}
            <div className="no-print" style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
                <button
                    onClick={() => setActiveTab('list')}
                    style={{
                        padding: '12px 4px',
                        fontSize: 'var(--font-md)',
                        fontWeight: '600',
                        color: activeTab === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'list' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Users size={18} />
                    Employee Directory
                </button>
                <button
                    onClick={() => setActiveTab('id-cards')}
                    style={{
                        padding: '12px 4px',
                        fontSize: 'var(--font-md)',
                        fontWeight: '600',
                        color: activeTab === 'id-cards' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'id-cards' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <CreditCard size={18} />
                    Digital ID Cards
                </button>
                <button
                    onClick={() => setActiveTab('offboarding')}
                    style={{
                        padding: '12px 4px',
                        fontSize: 'var(--font-md)',
                        fontWeight: '600',
                        color: activeTab === 'offboarding' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'offboarding' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <UserMinus size={18} />
                    Offboarding
                </button>
                <button
                    onClick={() => setActiveTab('salary-revisions')}
                    style={{
                        padding: '12px 4px',
                        fontSize: 'var(--font-md)',
                        fontWeight: '600',
                        color: activeTab === 'salary-revisions' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'salary-revisions' ? '2px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <CreditCard size={18} />
                    Salary Revisions
                </button>
            </div>

            {activeTab === 'list' ? (
                <EmployeeTable
                    onAddClick={() => { setEmployeeToEdit(null); setIsModalOpen(true); }}
                    onEditClick={handleEdit}
                    onDataLoaded={handleDataLoaded}
                />
            ) : activeTab === 'id-cards' ? (
                <div className="id-cards-print-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px', padding: '16px 0' }}>
                    {employees.map(emp => (
                        <div key={emp.id} className="id-card-print-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <IDCard employee={emp} idRef={(node) => setCardRef(emp.id, node)} />
                            <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                    onClick={() => handleDownloadPng(emp)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-main)',
                                        fontSize: 'var(--font-sm)',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    disabled={exportingPngId === emp.id}
                                >
                                    <Download size={14} />
                                    {exportingPngId === emp.id ? 'Saving PNG...' : 'Download PNG'}
                                </button>
                                <button
                                    onClick={() => handleDownloadPdf(emp)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-main)',
                                        fontSize: 'var(--font-sm)',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    disabled={exportingPdfId === emp.id}
                                >
                                    <FileText size={14} />
                                    {exportingPdfId === emp.id ? 'Saving PDF...' : 'Download PDF'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="card" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No employees found to generate ID cards.
                        </div>
                    )}
                </div>
            ) : activeTab === 'offboarding' ? (
                <HROffboardingPage />
            ) : (
                <HRSalaryRevisionsPage />
            )}

            <AddEmployeeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                employeeData={employeeToEdit}
                onRefresh={() => window.location.reload()}
            />

            <style>{`
                @media print {
                    header, [role="tablist"], button, .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                    
                    .id-cards-print-container {
                        display: block !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    .id-card-print-wrapper {
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        width: 100% !important;
                        height: 100vh !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }

                    #digital-id-card { 
                        margin: 0 !important; 
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </>
    );
};

export default EmployeesPage;
