import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const getReceiptUrl = (receiptUrl) => {
    if (!receiptUrl) return null;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const origin = apiUrl.replace(/\/?api\/?$/, '');
    return `${origin}${receiptUrl}`;
};

const HRExpenseApprovalsPage = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState('');
    const [comments, setComments] = useState({});

    const fetchPending = async () => {
        try {
            setLoading(true);
            const data = await api.get('/expenses/review?status=Pending');
            setClaims(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load pending claims', error);
            alert(error.message || 'Failed to load pending claims');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const reviewClaim = async (id, status) => {
        try {
            setSavingId(id);
            await api.patch(`/expenses/review/${id}`, {
                status,
                reviewer_comment: comments[id] || '',
            });
            setClaims((prev) => prev.filter((claim) => claim.id !== id));
        } catch (error) {
            console.error('Failed to review claim', error);
            alert(error.message || 'Failed to review claim');
        } finally {
            setSavingId('');
        }
    };

    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Expense Approvals</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Review pending reimbursement claims and approve or reject with comments.
                </p>
            </div>

            <div className="card" style={{ padding: '18px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Employee</th>
                                    <th style={{ padding: '8px' }}>Date</th>
                                    <th style={{ padding: '8px' }}>Category</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: '8px' }}>Description</th>
                                    <th style={{ padding: '8px' }}>Receipt</th>
                                    <th style={{ padding: '8px', minWidth: '190px' }}>Comment</th>
                                    <th style={{ padding: '8px', minWidth: '160px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: '12px', color: 'var(--text-muted)' }}>
                                            No pending claims found.
                                        </td>
                                    </tr>
                                ) : claims.map((claim) => {
                                    const busy = savingId === claim.id;
                                    return (
                                        <tr key={claim.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px' }}>
                                                <div style={{ fontWeight: 600 }}>{claim.employee_name}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{claim.employee_email}</div>
                                            </td>
                                            <td style={{ padding: '8px' }}>{claim.expense_date?.slice(0, 10)}</td>
                                            <td style={{ padding: '8px' }}>{claim.category}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{money(claim.amount)}</td>
                                            <td style={{ padding: '8px' }}>{claim.description || '-'}</td>
                                            <td style={{ padding: '8px' }}>
                                                {claim.receipt_url ? (
                                                    <a href={getReceiptUrl(claim.receipt_url)} target="_blank" rel="noreferrer">View</a>
                                                ) : '-'}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    className="input-field"
                                                    placeholder="Comment"
                                                    value={comments[claim.id] || ''}
                                                    onChange={(e) => setComments((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ background: '#0f766e', borderColor: '#0f766e', padding: '8px 10px' }}
                                                        onClick={() => reviewClaim(claim.id, 'Approved')}
                                                        disabled={busy}
                                                    >
                                                        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ background: '#b91c1c', borderColor: '#b91c1c', padding: '8px 10px' }}
                                                        onClick={() => reviewClaim(claim.id, 'Rejected')}
                                                        disabled={busy}
                                                    >
                                                        {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default HRExpenseApprovalsPage;
