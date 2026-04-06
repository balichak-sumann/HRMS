import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, UploadCloud } from 'lucide-react';

// Dynamic categories state handled inside component

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const statusStyle = {
    Pending: { color: '#9a6f00', background: '#fff8e1' },
    Approved: { color: '#0f766e', background: '#e6fffa' },
    Rejected: { color: '#b91c1c', background: '#fee2e2' },
};

const getReceiptUrl = (receiptUrl) => {
    if (!receiptUrl) return null;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const origin = apiUrl.replace(/\/?api\/?$/, '');
    return `${origin}${receiptUrl}`;
};

const EmployeeExpensesPage = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        category: 'Travel',
        amount: '',
        expense_date: new Date().toISOString().slice(0, 10),
        description: '',
    });
    const [receipt, setReceipt] = useState(null);

    const totals = useMemo(() => claims.reduce((acc, claim) => {
        acc.total += Number(claim.amount || 0);
        if (claim.status === 'Pending') acc.pending += Number(claim.amount || 0);
        if (claim.status === 'Approved') acc.approved += Number(claim.amount || 0);
        return acc;
    }, { total: 0, pending: 0, approved: 0 }), [claims]);

    const fetchClaims = async () => {
        try {
            setLoading(true);
            const data = await api.get('/expenses/mine');
            setClaims(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch expense claims', error);
            alert(error.message || 'Failed to fetch expense claims');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            await fetchClaims();
            const cats = await api.get('/lookups?category=EXPENSE_CATEGORY').catch(() => []);
            setCategories(cats?.map(c => c.value) || []);
            if (cats?.[0]) {
                setForm(prev => ({ ...prev, category: cats[0].value }));
            }
        };
        loadInitialData();
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('category', form.category);
            formData.append('amount', form.amount);
            formData.append('expense_date', form.expense_date);
            formData.append('description', form.description);
            if (receipt) formData.append('receipt', receipt);

            await api.post('/expenses/submit', formData);
            setForm({
                category: categories?.[0] || '',
                amount: '',
                expense_date: new Date().toISOString().slice(0, 10),
                description: '',
            });
            setReceipt(null);
            await fetchClaims();
        } catch (error) {
            console.error('Failed to submit expense claim', error);
            alert(error.message || 'Failed to submit expense claim');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Expense & Reimbursement</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Submit claims, upload receipts and track approval status.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total Claimed</p>
                    <p style={{ fontSize: '22px', fontWeight: '700' }}>{money(totals.total)}</p>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#9a6f00' }}>{money(totals.pending)}</p>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Approved</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#0f766e' }}>{money(totals.approved)}</p>
                </div>
            </div>

            <div className="card" style={{ padding: '18px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '14px' }}>Submit New Claim</h3>
                <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Category</label>
                        <select
                            className="input-field"
                            value={form.category}
                            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                            required
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Amount (Rs)</label>
                        <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Expense Date</label>
                        <input
                            className="input-field"
                            type="date"
                            value={form.expense_date}
                            onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
                            required
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Receipt (Optional)</label>
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '11px 12px',
                                border: '1px dashed var(--border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <UploadCloud size={16} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {receipt ? receipt.name : 'Upload image or PDF'}
                            </span>
                            <input
                                type="file"
                                style={{ display: 'none' }}
                                accept="image/png,image/jpeg,image/webp,application/pdf"
                                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                            />
                        </label>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Description</label>
                        <textarea
                            className="input-field"
                            style={{ minHeight: '90px', resize: 'vertical' }}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Trip details, vendor name, purpose, etc."
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
                            {submitting ? 'Submitting...' : 'Submit Claim'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>My Claims</h3>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Date</th>
                                    <th style={{ padding: '8px' }}>Category</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: '8px' }}>Description</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                    <th style={{ padding: '8px' }}>Reviewer Comment</th>
                                    <th style={{ padding: '8px' }}>Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '10px', color: 'var(--text-muted)' }}>
                                            No claims submitted yet.
                                        </td>
                                    </tr>
                                ) : claims.map((claim) => (
                                    <tr key={claim.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{claim.expense_date?.slice(0, 10)}</td>
                                        <td style={{ padding: '8px' }}>{claim.category}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{money(claim.amount)}</td>
                                        <td style={{ padding: '8px' }}>{claim.description || '-'}</td>
                                        <td style={{ padding: '8px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '999px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                ...(statusStyle[claim.status] || statusStyle.Pending),
                                            }}>
                                                {claim.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px' }}>{claim.reviewer_comment || '-'}</td>
                                        <td style={{ padding: '8px' }}>
                                            {claim.receipt_url ? (
                                                <a href={getReceiptUrl(claim.receipt_url)} target="_blank" rel="noreferrer">View</a>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default EmployeeExpensesPage;
