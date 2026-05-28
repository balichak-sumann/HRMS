import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const statusStyle = {
    Pending: { color: '#9a6f00', background: '#fff8e1' },
    Approved: { color: '#0f766e', background: '#e6fffa' },
    Rejected: { color: '#b91c1c', background: '#fee2e2' },
};

const EmployeeLeaveEncashmentPage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState(null);
    const [requests, setRequests] = useState([]);
    const [form, setForm] = useState({ leave_type: '', days_requested: '' });

    const loadData = async () => {
        try {
            setLoading(true);
            const [summaryData, requestData] = await Promise.all([
                api.get('/leave-encashment/my/summary'),
                api.get('/leave-encashment/my/requests'),
            ]);
            setSummary(summaryData || null);
            setRequests(Array.isArray(requestData) ? requestData : []);

            const firstType = summaryData?.policy?.encashable_leave_types?.[0] || '';
            setForm((prev) => ({ ...prev, leave_type: prev.leave_type || firstType }));
        } catch (error) {
            console.error('Failed to load leave encashment data', error);
            alert(error.message || 'Failed to load leave encashment data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedBalance = useMemo(() => {
        return (summary?.balances || []).find((b) => b.leave_type === form.leave_type);
    }, [summary, form.leave_type]);

    const maxRequestableDays = useMemo(() => {
        const availableForType = Number(selectedBalance?.encashable_days || 0);
        const annualRemaining = Number(summary?.remaining_days_this_year || 0);
        return Math.max(0, Math.min(availableForType, annualRemaining));
    }, [selectedBalance, summary]);

    const submitRequest = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/leave-encashment/my/requests', {
                leave_type: form.leave_type,
                days_requested: Number(form.days_requested),
            });
            setForm((prev) => ({ ...prev, days_requested: '' }));
            await loadData();
        } catch (error) {
            console.error('Failed to submit leave encashment request', error);
            alert(error.message || 'Failed to submit leave encashment request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 className="animate-spin" size={36} color="var(--primary)" />
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Leave Encashment</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Encash eligible leave days and track HR review status.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Year</p>
                    <p style={{ fontSize: '24px', fontWeight: '700' }}>{summary?.year || '-'}</p>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Annual Limit Remaining</p>
                    <p style={{ fontSize: '24px', fontWeight: '700' }}>{summary?.remaining_days_this_year ?? 0} days</p>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Approved This Year</p>
                    <p style={{ fontSize: '24px', fontWeight: '700' }}>{summary?.approved_days_this_year ?? 0} days</p>
                </div>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Encashable Balance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                    {(summary?.balances || []).map((row) => (
                        <div key={row.leave_type} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.leave_type}</p>
                            <p style={{ fontSize: '22px', fontWeight: '700' }}>{row.encashable_days}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Submit Encashment Request</h3>
                <form onSubmit={submitRequest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Leave Type</label>
                        <select className="input-field" value={form.leave_type} onChange={(e) => setForm((prev) => ({ ...prev, leave_type: e.target.value }))} required>
                            {(summary?.policy?.encashable_leave_types || []).map((leaveType) => (
                                <option key={leaveType} value={leaveType}>{leaveType}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Days Requested {selectedBalance ? `(type available: ${selectedBalance.encashable_days}, annual remaining: ${summary?.remaining_days_this_year ?? 0}, max request: ${maxRequestableDays})` : ''}
                        </label>
                        <input
                            className="input-field"
                            type="number"
                            min="1"
                            max={Math.min(100, maxRequestableDays || 0) || 100}
                            step="1"
                            value={form.days_requested}
                            onChange={(e) => setForm((prev) => ({ ...prev, days_requested: e.target.value }))}
                            required
                        />
                    </div>
                    <button className="btn-primary" type="submit" disabled={submitting}>
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                </form>
                <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Formula: one day basic salary per leave day.
                </p>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>My Encashment Requests</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Date</th>
                                <th style={{ padding: '8px' }}>Leave Type</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Days</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '8px' }}>Status</th>
                                <th style={{ padding: '8px' }}>Reviewer Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '12px', color: 'var(--text-muted)' }}>No encashment requests yet.</td>
                                </tr>
                            ) : requests.map((row) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px' }}>{new Date(row.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '8px' }}>{row.leave_type}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{row.days_requested}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.encashment_amount)}</td>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '999px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            ...(statusStyle[row.status] || statusStyle.Pending),
                                        }}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px' }}>{row.reviewer_comment || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default EmployeeLeaveEncashmentPage;
