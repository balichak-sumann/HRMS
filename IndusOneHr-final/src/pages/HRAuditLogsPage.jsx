import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    Search,
    Download,
    User,
    Activity,
    Loader2,
    CheckCircle2,
    Edit3,
    Trash2,
    LogIn,
    LogOut,
    Eye,
    X,
} from 'lucide-react';

const HRAuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filters, setFilters] = useState({
        status: 'All',
        category: 'All',
        user: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchLogs();
    }, [filters.status, filters.category, filters.start_date, filters.end_date]);

    // Use debounced search for user
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.user]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters).toString();
            const data = await api.get(`/audit?${queryParams}`);
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRowColor = (action) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('login') || lowerAction.includes('signup') || lowerAction.includes('accepted')) return '#ECFDF5'; // Greenish
        if (lowerAction.includes('edit') || lowerAction.includes('update')) return '#FFFBEB'; // Orangish
        if (lowerAction.includes('delete') || lowerAction.includes('rejected') || lowerAction.includes('declined')) return '#FEF2F2'; // Reddish
        return 'transparent';
    };

    const getActionIcon = (action) => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('login')) return <LogIn size={14} color="#10B981" />;
        if (lowerAction.includes('logout')) return <LogOut size={14} color="#6B7280" />;
        if (lowerAction.includes('edit')) return <Edit3 size={14} color="#F59E0B" />;
        if (lowerAction.includes('delete')) return <Trash2 size={14} color="#EF4444" />;
        if (lowerAction.includes('create')) return <CheckCircle2 size={14} color="#3B82F6" />;
        return <Activity size={14} color="#6B7280" />;
    };

    const handleExportCSV = () => {
        if (logs.length === 0) return;

        const headers = ['Timestamp', 'User Name', 'Email', 'Action', 'Module', 'IP Address', 'Details'];
        const csvRows = logs.map(l => [
            new Date(l.created_at).toLocaleString(),
            l.full_name,
            l.user_email,
            l.action,
            l.module,
            l.ip_address,
            l.details ? l.details.replace(/"/g, '""') : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const parseDetailsPayload = (detailsValue) => {
        if (!detailsValue) return null;
        if (typeof detailsValue === 'object') return detailsValue;

        const raw = String(detailsValue).trim();
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };

    const detailsPayload = parseDetailsPayload(selectedLog?.details);

    return (
        <>
            <div className="responsive-flex-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Audit Logs</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Monitor all system mutations and administrative actions.</p>
                </div>

                <button
                    onClick={handleExportCSV}
                    className="btn-export"
                    style={{ background: 'var(--primary)', color: 'white', border: 'none' }}
                >
                    <Download size={18} />
                    Export to CSV
                </button>
            </div>

            {/* Filters Bar */}
            <div className="card responsive-grid-filters" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>SEARCH USER</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Name or Email..."
                            style={{ paddingLeft: '34px', fontSize: '13px' }}
                            value={filters.user}
                            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>MODULE</label>
                    <select
                        className="input-field"
                        style={{ fontSize: '13px' }}
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    >
                        <option value="All">All Modules</option>
                        <option value="Authentication">Authentication</option>
                        <option value="Leave Management">Leave Management</option>
                        <option value="Payroll">Payroll</option>
                        <option value="Complaint Box">Complaint Box</option>
                        <option value="Employees">Employees</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>ACTION TYPE</label>
                    <select
                        className="input-field"
                        style={{ fontSize: '13px' }}
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="All">All Actions</option>
                        <option value="Login">Login</option>
                        <option value="Create">Create</option>
                        <option value="Edit">Edit</option>
                        <option value="Delete">Delete</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>FROM DATE</label>
                    <input
                        type="date"
                        className="input-field"
                        style={{ fontSize: '13px' }}
                        value={filters.start_date}
                        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>TO DATE</label>
                    <input
                        type="date"
                        className="input-field"
                        style={{ fontSize: '13px' }}
                        value={filters.end_date}
                        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Initiator</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Module</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IP Address</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs found for selected criteria.</td></tr>
                            ) : logs.map(l => (
                                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', background: getRowColor(l.action), transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(l.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={14} color="#64748B" />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{l.full_name}</p>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.user_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700' }}>
                                            {getActionIcon(l.action)}
                                            {l.action}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                                        <span style={{ 
                                            padding: '4px 8px', 
                                            background: 'var(--input-bg)', 
                                            color: 'var(--text-main)', 
                                            borderRadius: '4px', 
                                            border: '1px solid var(--border)', 
                                            fontSize: '11px', 
                                            fontWeight: '600',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '100px'
                                        }}>
                                            {l.module}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                        {l.ip_address}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            title="View details"
                                            onClick={() => setSelectedLog(l)}
                                            style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedLog && (
                <div
                    onClick={() => setSelectedLog(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1200,
                        padding: '16px',
                    }}
                >
                    <div
                        className="card"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: 'min(860px, 96vw)',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '20px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>Audit Log Details</h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                            >
                                <X size={16} color="var(--text-main)" />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px', marginBottom: '14px' }}>
                            <div><strong>Timestamp:</strong> {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : '-'}</div>
                            <div><strong>Action:</strong> {selectedLog.action || '-'}</div>
                            <div><strong>Module:</strong> {selectedLog.module || '-'}</div>
                            <div><strong>IP Address:</strong> {selectedLog.ip_address || '-'}</div>
                            <div><strong>User Name:</strong> {selectedLog.full_name || '-'}</div>
                            <div><strong>Email:</strong> {selectedLog.user_email || '-'}</div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <p style={{ fontWeight: 700, marginBottom: '6px' }}>Details (Raw)</p>
                            <pre style={{
                                margin: 0,
                                padding: '12px',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                background: 'var(--input-bg)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '12px',
                                color: 'var(--text-main)'
                            }}>{selectedLog.details || 'No details provided'}</pre>
                        </div>

                        {detailsPayload && (
                            <div style={{ marginTop: '12px' }}>
                                <p style={{ fontWeight: 700, marginBottom: '6px' }}>Details (Parsed JSON)</p>
                                <pre style={{
                                    margin: 0,
                                    padding: '12px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    background: 'var(--input-bg)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: '12px',
                                    color: 'var(--text-main)'
                                }}>{JSON.stringify(detailsPayload, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .btn-export {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .btn-export:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};

export default HRAuditLogsPage;
