import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import IDCard from '../components/IDCard';
import { toPng } from 'html-to-image';
import { downloadIdCardPdf } from '../lib/idCardExport';
import {
    ArrowLeft,
    User,
    FileText,
    Calendar,
    CreditCard,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Loader2,
    Download,
    Clock,
    CheckCircle,
    AlertCircle
} from 'lucide-react';

const EmployeeProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('Personal Info');
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [idExporting, setIdExporting] = useState(false);
    const [idPdfExporting, setIdPdfExporting] = useState(false);
    const idCardRef = useRef(null);

    const tabs = ['Personal Info', 'Documents', 'Attendance', 'ID Card', 'NDA'];

    useEffect(() => {
        if (!id && profile) {
            setEmployee(profile);
            setLoading(false);
        } else if (id) {
            fetchEmployee();
        } else {
            setLoading(false);
        }
    }, [id, profile]);

    useEffect(() => {
        if (!employee) return;

        const fetchAttendance = async () => {
            try {
                setAttendanceLoading(true);

                const data = id
                    ? await api.get(`/attendance/all?employee_id=${employee.id}`)
                    : await api.get('/attendance/my');

                setAttendanceRecords(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching employee attendance:', error.message);
                setAttendanceRecords([]);
            } finally {
                setAttendanceLoading(false);
            }
        };

        fetchAttendance();
    }, [employee, id]);

    const fetchEmployee = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/employees/${id}`);
            setEmployee(data);
        } catch (error) {
            console.error('Error fetching employee:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateHours = (start, end) => {
        if (!start || !end) return '0.0';
        const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
        return diff.toFixed(1);
    };

    const handleDownloadIdCard = async () => {
        if (!idCardRef.current || !employee) return;

        try {
            setIdExporting(true);
            const dataUrl = await toPng(idCardRef.current, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `ID_Card_${employee.full_name.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export ID card:', error);
        } finally {
            setIdExporting(false);
        }
    };

    const handleDownloadIdCardPdf = async () => {
        if (!idCardRef.current || !employee) return;

        try {
            setIdPdfExporting(true);
            await downloadIdCardPdf({
                node: idCardRef.current,
                fullName: employee.full_name,
                fallbackName: employee.employee_id || employee.id || 'Employee'
            });
        } catch (error) {
            console.error('Failed to export ID card PDF:', error);
        } finally {
            setIdPdfExporting(false);
        }
    };

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const monthlyRecords = attendanceRecords.filter((record) => (record.check_in || '').slice(0, 7) === currentMonthKey);
    const attendanceStats = {
        total: monthlyRecords.length,
        present: monthlyRecords.filter((record) => record.status === 'Present').length,
        late: monthlyRecords.filter((record) => record.status === 'Late').length,
        halfDay: monthlyRecords.filter((record) => record.status === 'Half-Day').length,
    };

    if (loading) {
        return (
            <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    <style>{`
            .animate-spin { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
                </div>
            </>
        );
    }

    if (!employee) {
        return (
            <>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h2>Employee not found</h2>
                    <button onClick={() => navigate(profile?.role === 'admin' ? '/admin/employees' : '/hr/employees')}>Back to list</button>
                </div>
            </>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => navigate(profile?.role === 'admin' ? '/admin/employees' : profile?.role === 'hr' ? '/hr/employees' : '/employee/dashboard')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '8px 0',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    <ArrowLeft size={18} />
                    {(profile?.role === 'admin' || profile?.role === 'hr') ? 'Back to Employees' : 'Back to Dashboard'}
                </button>
            </div>

            <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <img
                        src={employee.avatar_url || '/avatar-placeholder.svg'}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/avatar-placeholder.svg';
                        }}
                        alt={employee.full_name}
                        style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                    />
                    <div>
                        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{employee.full_name}</h1>
                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={16} /> {employee.role}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={16} /> {employee.email}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={16} /> Joined {new Date(employee.joining_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <span className={`status-badge ${(employee.status || 'Active').toLowerCase()}`} style={{ fontSize: '14px', padding: '6px 16px' }}>{employee.status || 'Active'}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '12px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === tab ? '600' : '500',
                            cursor: 'pointer',
                            fontSize: '15px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="card" style={{ minHeight: '400px', padding: '32px' }}>
                {activeTab === 'Personal Info' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>Contact Information</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <InfoItem icon={<Mail size={18} />} label="Email Address" value={employee.email} />
                                <InfoItem icon={<Mail size={18} />} label="Personal Email" value={employee.personal_email || 'Not provided'} />
                                <InfoItem icon={<Phone size={18} />} label="Phone Number" value={employee.phone || 'Not provided'} />
                                <InfoItem icon={<Phone size={18} />} label="Emergency Contact" value={employee.emergency_contact || 'Not provided'} />
                            </div>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>Employment Details</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <InfoItem icon={<Briefcase size={18} />} label="Department" value={employee.department} />
                                <InfoItem icon={<Briefcase size={18} />} label="Employee Code" value={employee.employee_id || 'NA'} />
                                <InfoItem icon={<Briefcase size={18} />} label="Designation" value={employee.designation || employee.role || 'NA'} />
                                <InfoItem icon={<Briefcase size={18} />} label="Technology" value={employee.technology || 'NA'} />
                                <InfoItem icon={<Briefcase size={18} />} label="Experience (Years)" value={employee.experience_years ?? 'NA'} />
                                <InfoItem icon={<MapPin size={18} />} label="Location" value={employee.location || 'NA'} />
                                <InfoItem icon={<MapPin size={18} />} label="Address" value={employee.address || 'NA'} />
                                <InfoItem icon={<CreditCard size={18} />} label="Aadhaar" value={employee.aadhaar_card || 'NA'} />
                                <InfoItem icon={<CreditCard size={18} />} label="PAN" value={employee.pan || 'NA'} />
                                <InfoItem icon={<CreditCard size={18} />} label="Bank A/c" value={employee.bank_account || 'NA'} />
                                <InfoItem icon={<CreditCard size={18} />} label="Bank Name" value={employee.bank_name || 'NA'} />
                                <InfoItem icon={<CreditCard size={18} />} label="Annual Salary (INR)" value={employee.salary ? `₹${employee.salary}` : 'Not provided'} />
                                <InfoItem icon={<Calendar size={18} />} label="Joining Date" value={new Date(employee.joining_date).toLocaleDateString()} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'Attendance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                            <StatCard icon={<Calendar size={18} />} label="This Month Records" value={attendanceStats.total} color="var(--primary)" />
                            <StatCard icon={<CheckCircle size={18} />} label="Present" value={attendanceStats.present} color="#10B981" />
                            <StatCard icon={<Clock size={18} />} label="Late" value={attendanceStats.late} color="#F59E0B" />
                            <StatCard icon={<AlertCircle size={18} />} label="Half Day" value={attendanceStats.halfDay} color="#EF4444" />
                        </div>

                        <div>
                            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Attendance History</h3>
                            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                <div className="table-scroll-wrapper">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                                        <thead style={{ background: '#F9FAFB' }}>
                                            <tr>
                                                <th style={tableHeaderStyle}>Date</th>
                                                <th style={tableHeaderStyle}>Check-In</th>
                                                <th style={tableHeaderStyle}>Check-Out</th>
                                                <th style={tableHeaderStyle}>Hours</th>
                                                <th style={tableHeaderStyle}>Location</th>
                                                <th style={tableHeaderStyle}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceLoading ? (
                                                <tr>
                                                    <td colSpan="6" style={emptyCellStyle}>Loading attendance records...</td>
                                                </tr>
                                            ) : attendanceRecords.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={emptyCellStyle}>No attendance records found for this employee.</td>
                                                </tr>
                                            ) : (
                                                attendanceRecords.map((record) => (
                                                    <tr key={record.id} style={{ borderTop: '1px solid var(--border)' }}>
                                                        <td style={tableCellStyle}>{new Date(record.check_in).toLocaleDateString()}</td>
                                                        <td style={tableCellStyle}>{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td style={tableCellStyle}>{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                                        <td style={tableCellStyle}>{calculateHours(record.check_in, record.check_out)}h</td>
                                                        <td style={tableCellStyle}>{record.location || 'Not recorded'}</td>
                                                        <td style={tableCellStyle}>
                                                            <span className={`status-badge ${(record.status || '').toLowerCase().replace(' ', '-')}`}>{record.status}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'ID Card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Digital ID Card</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Preview and export this employee's official company ID card.</p>
                        </div>
                        <IDCard employee={employee} idRef={idCardRef} />
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={handleDownloadIdCard} disabled={idExporting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download size={16} /> {idExporting ? 'Saving...' : 'Download PNG'}
                            </button>
                            <button className="btn-secondary" onClick={handleDownloadIdCardPdf} disabled={idPdfExporting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} /> {idPdfExporting ? 'Saving...' : 'Download PDF'}
                            </button>
                        </div>
                    </div>
                )}
                {!['Personal Info', 'Attendance', 'ID Card'].includes(activeTab) && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                        <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '18px', fontWeight: '500' }}>{activeTab} content coming soon</p>
                        <p style={{ fontSize: '14px', marginTop: '8px' }}>This section is currently under development.</p>
                    </div>
                )}
            </div>
            <style>{`
        .status-badge.active { background: #D1FAE5; color: #059669; }
        .status-badge.on-leave { background: #FEF3C7; color: #D97706; }
      `}</style>
        </>
    );
};

const InfoItem = ({ icon, label, value }) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ color: 'var(--primary)', marginTop: '2px' }}>{icon}</div>
        <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>{value}</p>
        </div>
    </div>
);

const StatCard = ({ icon, label, value, color }) => (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', background: '#FCFCFD' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>{label}</span>
            <span style={{ color }}>{icon}</span>
        </div>
        <p style={{ fontSize: '26px', fontWeight: '800', margin: 0 }}>{value}</p>
    </div>
);

const tableHeaderStyle = {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

const tableCellStyle = {
    padding: '14px 16px',
    fontSize: '14px',
    verticalAlign: 'top'
};

const emptyCellStyle = {
    padding: '28px 16px',
    textAlign: 'center',
    color: 'var(--text-muted)'
};

export default EmployeeProfilePage;
