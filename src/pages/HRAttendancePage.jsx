import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { getIstTodayYmd, getIstCurrentMonth } from '../lib/istDate';

const HRAttendancePage = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [filters, setFilters] = useState({
        date: getIstTodayYmd(),
        month: getIstCurrentMonth(),
        department: ''
    });
    const [updatingId, setUpdatingId] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [previewPhoto, setPreviewPhoto] = useState(null);

    useEffect(() => {
        fetchAttendance();
    }, [filters.date, filters.department]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const data = await api.get('/departments');
            setDepartments(data || []);
        } catch (err) {
            console.error('Failed to fetch departments', err);
        }
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                date: filters.date,
                ...(filters.department ? { department: filters.department } : {})
            }).toString();
            const data = await api.get(`/attendance/all?${query}`);
            setRecords(data);
        } catch (err) {
            console.error('Failed to fetch attendance', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateHours = (start, end) => {
        if (!start || !end) return '0.0';
        const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
        return diff.toFixed(1);
    };

    const formatTime = (value) => {
        if (!value) return '--:--';
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Present':
                return { bg: '#D1FAE5', text: '#047857', label: '✓ Present' }; // Light green
            case 'Late':
                return { bg: '#FEF3C7', text: '#92400E', label: '⏱ Late' }; // Light yellow
            case 'On Leave':
                return { bg: '#FECACA', text: '#991B1B', label: '🏥 On Leave' }; // Light red
            case 'Absent':
                return { bg: '#E5E7EB', text: '#374151', label: '✕ Absent' }; // Light gray
            default:
                return { bg: '#D1FAE5', text: '#047857', label: '✓ Present' }; // Blue
        }
    };

    const handleStatusChange = async (record, newStatus) => {
        let attendanceId = record.id;

        try {
            setUpdatingId(record.employee_id);
            
            if (!attendanceId) {
                // Create new attendance record if it doesn't exist
                const createResponse = await api.post('/attendance/create', {
                    employee_id: record.employee_id,
                    date: filters.date,
                    status: newStatus
                });
                attendanceId = createResponse.id;
            } else {
                // Update existing record
                await api.put(`/attendance/${attendanceId}`, { status: newStatus });
            }
            
            // Update the local state
            setRecords(records.map(r => 
                r.employee_id === record.employee_id ? { ...r, id: attendanceId, status: newStatus } : r
            ));
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status: ' + (err?.response?.data?.error || err.message || 'Unknown error'));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleExport = async () => {
        try {
            const exportParams = new URLSearchParams({
                month: filters.month,
                ...(filters.department ? { department: filters.department } : {})
            }).toString();

            const monthlyRows = await api.get(`/attendance/monthly-export?${exportParams}`);
            const headers = [
                'Employee ID',
                'Employee',
                'Department',
                'Month',
                'Present Days',
                'Late Days',
                'On Leave Days',
                'Absent Days',
                'Half-Day Count',
                'Recorded Days',
                'Total Hours'
            ];

            const rows = monthlyRows.map(r => [
                r.employee_display_id || r.employee_id,
                r.full_name,
                r.department || 'Unassigned',
                filters.month,
                r.present_days,
                r.late_days,
                r.on_leave_days,
                r.absent_days,
                r.half_day_count,
                r.recorded_days,
                r.total_hours
            ]);

            const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `attendance_monthly_report_${filters.month}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Failed to export monthly attendance', err);
            alert('Failed to export monthly attendance: ' + (err.message || 'Unknown error'));
        }
    };

    const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'Present').length,
        late: records.filter(r => r.status === 'Late').length,
        onLeave: records.filter(r => r.status === 'On Leave').length
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', color: 'var(--text-main)' }}>Company Attendance</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Monitor and manage employee daily presence.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        type="month"
                        className="input-field"
                        value={filters.month}
                        onChange={e => setFilters({ ...filters, month: e.target.value })}
                        max={getIstCurrentMonth()}
                        style={{ minWidth: '170px' }}
                    />
                    <button
                        onClick={handleExport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                    >
                        <Download size={18} /> Export Report
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }} className="grid-cols-4">
                <div className="card">
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Records</p>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users color="var(--primary)" /> {stats.total}
                    </h2>
                </div>
                <div className="card">
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Present Today</p>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CheckCircle color="#10B981" /> {stats.present}
                    </h2>
                </div>
                <div className="card">
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Late Entries</p>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock color="#F59E0B" /> {stats.late}
                    </h2>
                </div>
                <div className="card">
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>On Leave</p>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle color="#EF4444" /> {stats.onLeave}
                    </h2>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px', background: 'var(--card-bg)' }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '240px', maxWidth: '320px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>DATE</label>
                        <input
                            type="date"
                            className="input-field"
                            value={filters.date}
                            onChange={e => setFilters({ ...filters, date: e.target.value })}
                            style={{ width: '100%' }}
                            max={getIstTodayYmd()}
                        />
                    </div>
                    <div style={{ flex: '1', minWidth: '240px', maxWidth: '320px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>DEPARTMENT</label>
                        <select
                            className="input-field"
                            value={filters.department}
                            onChange={e => setFilters({ ...filters, department: e.target.value })}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Departments</option>
                            {departments.map(dep => (
                                <option key={dep.id || dep.name} value={dep.name}>{dep.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <div className="table-scroll-wrapper" style={{ overflow: 'visible' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>EMPLOYEE</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>DEPARTMENT</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>CHECK-IN</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>CHECK-OUT</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>HOURS</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No records found for this criteria.</td>
                                </tr>
                            ) : (
                                records.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px', fontWeight: '500' }}>{row.full_name}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{row.department}</td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {row.checkin_photo && (
                                                    <img src={row.checkin_photo} alt="" onClick={() => setPreviewPhoto(row.checkin_photo)} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981', cursor: 'pointer' }} />
                                                )}
                                                <div>
                                                    <div>{formatTime(row.check_in)}</div>
                                                    {row.location && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {row.location}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {row.checkout_photo && (
                                                    <img src={row.checkout_photo} alt="" onClick={() => setPreviewPhoto(row.checkout_photo)} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #EF4444', cursor: 'pointer' }} />
                                                )}
                                                <div>
                                                    <div>{formatTime(row.check_out)}</div>
                                                    {row.checkout_location && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {row.checkout_location}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {row.total_hours !== undefined && row.total_hours !== null
                                                ? `${Number(row.total_hours).toFixed(1)}h`
                                                : `${calculateHours(row.check_in, row.check_out)}h`
                                            }
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <select
                                                value={row.status || 'On Leave'}
                                                onChange={(e) => handleStatusChange(row, e.target.value)}
                                                disabled={updatingId === row.employee_id}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: getStatusColor(row.status).bg,
                                                    color: getStatusColor(row.status).text,
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    outline: 'none',
                                                    minWidth: '130px',
                                                }}
                                            >
                                                <option value="Present">✓ Present</option>
                                                <option value="Late">⏰ Late</option>
                                                <option value="Half-Day">½ Half-Day</option>
                                                <option value="On Leave">🏖 On Leave</option>
                                                <option value="Absent">✕ Absent</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Photo Lightbox */}
            {previewPhoto && (
                <div
                    onClick={() => setPreviewPhoto(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <img src={previewPhoto} alt="Attendance Photo" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
                </div>
            )}
        </div >
    );
};

export default HRAttendancePage;
