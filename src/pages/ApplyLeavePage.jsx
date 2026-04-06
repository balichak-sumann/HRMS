import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    FileText,
    CalendarDays,
    Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

const ApplyLeavePage = () => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [formData, setFormData] = useState({
        leave_type: 'Casual',
        start_date: '',
        end_date: '',
        reason: '',
    });
    const [file, setFile] = useState(null);

    // For demo/simplicity, we'll assume a fixed employee_id or fetch the first one from employees
    const [employeeId, setEmployeeId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leaves, typesData] = await Promise.all([
                api.get('/leaves').catch(() => []),
                api.get('/lookups?category=LEAVE_TYPE').catch(() => [])
            ]);
            setHistory(leaves || []);
            const fetchedTypes = typesData?.map(t => t.value) || [];
            if (fetchedTypes.length > 0) {
                setLeaveTypes(fetchedTypes);
                setFormData(prev => ({ ...prev, leave_type: fetchedTypes[0] }));
            }

            // Store only leave history — balance cards removed (no entitlement system yet)
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);

            if (end < start) {
                toast.error('End date cannot be before start date');
                return;
            }

            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            const submitData = new FormData();
            submitData.append('leave_type', formData.leave_type);
            submitData.append('start_date', formData.start_date);
            submitData.append('end_date', formData.end_date);
            submitData.append('reason', formData.reason);
            submitData.append('days', days);
            if (file) {
                submitData.append('attachment', file);
            }

            console.log('--- SUBMITTING LEAVE ---');
            console.log('Sending to api.post(/leaves)');
            for (let pair of submitData.entries()) {
                console.log(pair[0], pair[1]);
            }

            const response = await api.post('/leaves', submitData);
            console.log('Server responded with:', response);


            toast.success('Leave application submitted successfully!');
            setFormData({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
            setFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.message || 'Failed to submit leave request');
        } finally {
            setLoading(false);
        }
    };

    // Compute leave summary stats from history
    const approvedLeaves = history.filter(l => l.status === 'Approved');
    const totalDaysTaken = approvedLeaves.reduce((sum, l) => sum + (parseInt(l.days) || 0), 0);
    const leaveByType = [
        { type: 'Casual', days: approvedLeaves.filter(l => l.leave_type === 'Casual').reduce((s, l) => s + (parseInt(l.days) || 0), 0), color: '#3B82F6' },
        { type: 'Sick', days: approvedLeaves.filter(l => l.leave_type === 'Sick').reduce((s, l) => s + (parseInt(l.days) || 0), 0), color: '#EF4444' },
        { type: 'Earned', days: approvedLeaves.filter(l => l.leave_type === 'Earned').reduce((s, l) => s + (parseInt(l.days) || 0), 0), color: '#10B981' },
    ];

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', color: 'var(--text-main)', fontWeight: '700' }}>Time Off Hub</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>Submit requests, attach documents, and track your leave.</p>
            </div>

            {/* ── Leave Summary Row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', marginBottom: '32px' }}>
                {/* Total Days Taken Card */}
                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Total Days Taken</p>
                    <h2 style={{ fontSize: '48px', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{totalDaysTaken}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>approved leave days</p>
                </div>

                {/* Leave Breakdown Chart */}
                <div className="card" style={{ padding: '24px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: '16px' }}>Leave Breakdown by Type</p>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={leaveByType} barSize={40}>
                            <XAxis dataKey="type" tick={{ fontSize: 13, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v) => [`${v} days`, 'Approved']} contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                            <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                                {leaveByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
                <div className="card" style={{ padding: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus size={20} color="var(--primary)" /> Apply New Leave
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>LEAVE CATEGORY</label>
                            <select
                                className="input-field"
                                value={formData.leave_type}
                                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                            >
                                {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>START DATE</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>END DATE</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    required
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>REASON / REMARKS</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                placeholder="State your reason for leave..."
                                required
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                style={{ resize: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>ATTACHMENT (OPTIONAL)</label>
                            <div style={{
                                border: '1px dashed var(--border)',
                                borderRadius: '8px',
                                padding: '12px',
                                textAlign: 'center',
                                background: '#F9FAFB',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="file"
                                    id="leave-attachment"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="leave-attachment" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                    <FileText size={18} />
                                    {file ? file.name : 'Click to upload proof'}
                                </label>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', padding: '14px' }}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {loading ? 'Processing Mission...' : 'Submit Request'}
                        </button>
                    </form>
                </div>

                <div className="card" style={{ padding: '0' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={20} color="var(--primary)" /> Leave History
                        </h3>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                                <tr>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dates</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '500' }}>{item.leave_type}</td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <p style={{ fontSize: '14px' }}>{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.days} days</p>
                                        </td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {history.length === 0 && (
                            <EmptyState
                                title="No Leave History"
                                message="Your leave applications will appear here once submitted."
                                icon={<Calendar size={48} />}
                            />
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .input-field {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          outline: none;
          font-size: 14px;
        }
        .btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover { opacity: 0.9; }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </>
    );
};

export default ApplyLeavePage;
