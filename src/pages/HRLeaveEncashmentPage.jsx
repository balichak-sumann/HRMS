import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, Save } from 'lucide-react';

// Removed explicit leave array config
const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRLeaveEncashmentPage = () => {
    const [loading, setLoading] = useState(true);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [savingPolicy, setSavingPolicy] = useState(false);
    const [filter, setFilter] = useState('Pending');
    const [requests, setRequests] = useState([]);
    const [comments, setComments] = useState({});
    const [policy, setPolicy] = useState({
        encashable_leave_types: [],
        max_days_per_year: '',
        payout_formula: 'BASIC_PER_DAY',
    });

    const fetchPolicy = async () => {
        const data = await api.get('/leave-encashment/policy');
        if (data && !data.unconfigured) {
            setPolicy(data);
        }
    };

    const fetchRequests = async (nextFilter = filter) => {
        const data = await api.get(`/leave-encashment/requests?status=${encodeURIComponent(nextFilter)}`);
        setRequests(Array.isArray(data) ? data : []);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const typesData = await api.get('/lookups?category=LEAVE_TYPE').catch(() => []);
            setLeaveTypes(typesData?.map(t => t.value) || []);
            await Promise.all([fetchPolicy(), fetchRequests(filter)]);
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

    useEffect(() => {
        if (!loading) {
            fetchRequests(filter).catch((error) => {
                console.error('Failed to refresh requests', error);
            });
        }
    }, [filter]);

    const toggleLeaveType = (leaveType) => {
        setPolicy((prev) => {
            const hasType = prev.encashable_leave_types.includes(leaveType);
            const nextTypes = hasType
                ? prev.encashable_leave_types.filter((t) => t !== leaveType)
                : [...prev.encashable_leave_types, leaveType];
            return { ...prev, encashable_leave_types: nextTypes };
        });
    };

    const savePolicy = async () => {
        try {
            setSavingPolicy(true);
            await api.put('/leave-encashment/policy', {
                encashable_leave_types: policy.encashable_leave_types,
                max_days_per_year: Number(policy.max_days_per_year),
                payout_formula: 'BASIC_PER_DAY',
            });
            await fetchPolicy();
            alert('Leave encashment policy updated');
        } catch (error) {
            console.error('Failed to save policy', error);
            alert(error.message || 'Failed to save policy');
        } finally {
            setSavingPolicy(false);
        }
    };

    const reviewRequest = async (id, status) => {
        try {
            await api.patch(`/leave-encashment/requests/${id}`, {
                status,
                reviewer_comment: comments[id] || '',
            });
            await fetchRequests(filter);
        } catch (error) {
            console.error('Failed to review request', error);
            alert(error.message || 'Failed to review request');
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
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Leave Encashment Policy & Requests</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Configure yearly encashment rules and review employee requests.
                </p>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Policy Settings</h3>

                <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Encashable Leave Types</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {leaveTypes.map((leaveType) => {
                            const active = policy.encashable_leave_types.includes(leaveType);
                            return (
                                <button
                                    key={leaveType}
                                    type="button"
                                    onClick={() => toggleLeaveType(leaveType)}
                                    style={{
                                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                                        background: active ? 'rgba(37,99,235,0.08)' : 'var(--card-bg)',
                                        color: active ? 'var(--primary)' : 'var(--text-main)',
                                        borderRadius: '999px',
                                        padding: '7px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                    }}
                                >
                                    {leaveType}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Max Encashable Days per Year</label>
                        <input
                            className="input-field"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={policy.max_days_per_year}
                            onChange={(e) => setPolicy((prev) => ({ ...prev, max_days_per_year: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payout Formula</label>
                        <input className="input-field" value="One day basic salary per leave day" readOnly />
                    </div>

                    <button className="btn-primary" onClick={savePolicy} disabled={savingPolicy}>
                        {savingPolicy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                    <h3 style={{ fontSize: '17px' }}>Encashment Requests</h3>
                    <select className="input-field" style={{ width: '160px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="All">All</option>
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Employee</th>
                                <th style={{ padding: '8px' }}>Leave Type</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Days</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '8px' }}>Status</th>
                                <th style={{ padding: '8px' }}>Comment</th>
                                <th style={{ padding: '8px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '12px', color: 'var(--text-muted)' }}>No requests found.</td>
                                </tr>
                            ) : requests.map((row) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ fontWeight: 600 }}>{row.full_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.department || '-'}</div>
                                    </td>
                                    <td style={{ padding: '8px' }}>{row.leave_type}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{row.days_requested}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.encashment_amount)}</td>
                                    <td style={{ padding: '8px' }}>{row.status}</td>
                                    <td style={{ padding: '8px' }}>
                                        <input
                                            className="input-field"
                                            placeholder="Reviewer comment"
                                            value={comments[row.id] ?? row.reviewer_comment ?? ''}
                                            onChange={(e) => setComments((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        {row.status === 'Pending' ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn-primary" style={{ background: '#0f766e', borderColor: '#0f766e' }} onClick={() => reviewRequest(row.id, 'Approved')}>Approve</button>
                                                <button className="btn-primary" style={{ background: '#b91c1c', borderColor: '#b91c1c' }} onClick={() => reviewRequest(row.id, 'Rejected')}>Reject</button>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>{row.reviewer_name || '-'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default HRLeaveEncashmentPage;
