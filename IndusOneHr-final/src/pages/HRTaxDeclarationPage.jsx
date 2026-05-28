import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';

const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

const getFinancialYearOptions = (count = 6) => {
    const currentFy = getCurrentFinancialYear();
    const currentStartYear = Number(currentFy.split('-')[0]);
    return Array.from({ length: count }, (_, index) => {
        const start = currentStartYear - index;
        return `${start}-${start + 1}`;
    });
};

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRTaxDeclarationPage = () => {
    const [loading, setLoading] = useState(true);
    const [declarations, setDeclarations] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [selectedDeclaration, setSelectedDeclaration] = useState(null);
    const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
    const [statusFilter, setStatusFilter] = useState('All');
    const [reviewDraft, setReviewDraft] = useState({});
    const financialYearOptions = useMemo(() => getFinancialYearOptions(6), []);

    const fetchDeclarations = async (fy = financialYear, status = statusFilter) => {
        try {
            setLoading(true);
            const data = await api.get(`/income-tax/hr/declarations?financial_year=${encodeURIComponent(fy)}&status=${encodeURIComponent(status)}`);
            const rows = Array.isArray(data) ? data : [];
            setDeclarations(rows);
            if (!selectedId && rows[0]) setSelectedId(rows[0].id);
            if (selectedId && !rows.find((row) => row.id === selectedId)) {
                setSelectedId(rows[0]?.id || '');
                setSelectedDeclaration(null);
            }
        } catch (error) {
            console.error('Failed to load declarations', error);
            alert(error.message || 'Failed to load declarations');
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async (id) => {
        if (!id) {
            setSelectedDeclaration(null);
            return;
        }

        try {
            const data = await api.get(`/income-tax/hr/declarations/${id}`);
            setSelectedDeclaration(data || null);
        } catch (error) {
            console.error('Failed to load declaration details', error);
        }
    };

    useEffect(() => {
        fetchDeclarations();
    }, []);

    useEffect(() => {
        if (!loading) fetchDeclarations(financialYear, statusFilter);
    }, [financialYear, statusFilter]);

    useEffect(() => {
        fetchDetails(selectedId);
    }, [selectedId]);

    const approvedTotal = useMemo(() => {
        const items = selectedDeclaration?.items || [];
        return items.reduce((sum, item) => sum + Number(item.approved_amount || 0), 0);
    }, [selectedDeclaration]);

    const reviewItem = async (itemId, status) => {
        try {
            const draft = reviewDraft[itemId] || {};
            const data = await api.patch(`/income-tax/hr/items/${itemId}/review`, {
                status,
                approved_amount: draft.approved_amount,
                comment: draft.comment,
            });
            setSelectedDeclaration(data || null);
            await fetchDeclarations(financialYear, statusFilter);
        } catch (error) {
            console.error('Failed to review item', error);
            alert(error.message || 'Failed to review item');
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
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>IT Declarations</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Review employee declarations and approve/reject line items with comments.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                        <select className="input-field" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
                            {financialYearOptions.map((fy) => (
                                <option key={fy} value={fy}>{fy}</option>
                            ))}
                        </select>
                        <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="All">All</option>
                            <option value="draft">draft</option>
                            <option value="submitted">submitted</option>
                            <option value="reviewed">reviewed</option>
                        </select>
                    </div>

                    <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                        {declarations.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No declarations found.</p>
                        ) : declarations.map((row) => (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() => setSelectedId(row.id)}
                                style={{
                                    border: row.id === selectedId ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: '10px',
                                    background: row.id === selectedId ? 'rgba(37,99,235,0.08)' : 'var(--card-bg)',
                                    textAlign: 'left',
                                    padding: '10px',
                                    cursor: 'pointer',
                                }}
                            >
                                <p style={{ fontWeight: 700 }}>{row.full_name}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.department || '-'}</p>
                                <p style={{ fontSize: '12px' }}>Status: {row.status} | v{row.version || 1}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Items: {row.total_items} | Pending: {row.pending_items}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                    {!selectedDeclaration ? (
                        <p style={{ color: 'var(--text-muted)' }}>Select a declaration to review.</p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '10px' }}>
                                <h3 style={{ fontSize: '18px' }}>{selectedDeclaration.employee_name}</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    FY {selectedDeclaration.financial_year} | Version v{selectedDeclaration.version || 1} | Status: {selectedDeclaration.status} | Approved Total: {money(approvedTotal)}
                                </p>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Section</th>
                                            <th style={{ padding: '8px' }}>Item</th>
                                            <th style={{ padding: '8px', textAlign: 'right' }}>Declared</th>
                                            <th style={{ padding: '8px', textAlign: 'right' }}>Approved</th>
                                            <th style={{ padding: '8px' }}>Proofs</th>
                                            <th style={{ padding: '8px' }}>Review</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedDeclaration.items || []).map((item) => (
                                            (() => {
                                                const isReviewed = item.status === 'approved' || item.status === 'rejected';
                                                return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px' }}>{item.section_code}</td>
                                                <td style={{ padding: '8px' }}>
                                                    <div>{item.item_label}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.hr_comment || '-'}</div>
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>{money(item.declared_amount)}</td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>{money(item.approved_amount)}</td>
                                                <td style={{ padding: '8px' }}>
                                                    {(item.proofs || []).length === 0 ? '-' : (
                                                        <div style={{ display: 'grid', gap: '4px' }}>
                                                            {item.proofs.map((proof) => (
                                                                <a key={proof.id} href={proof.file_path} target="_blank" rel="noreferrer">
                                                                    {proof.file_name}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    {isReviewed ? (
                                                        <div style={{ display: 'grid', gap: '4px' }}>
                                                            <span
                                                                style={{
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    color: item.status === 'approved' ? '#0f766e' : '#b91c1c',
                                                                }}
                                                            >
                                                                {item.status.toUpperCase()}
                                                            </span>
                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                Final amount: {money(item.approved_amount)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'grid', gap: '6px' }}>
                                                            <input
                                                                className="input-field"
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="Approved amount"
                                                                value={reviewDraft[item.id]?.approved_amount ?? item.declared_amount}
                                                                onChange={(e) => setReviewDraft((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: {
                                                                        ...(prev[item.id] || {}),
                                                                        approved_amount: e.target.value,
                                                                    },
                                                                }))}
                                                            />
                                                            <input
                                                                className="input-field"
                                                                placeholder="Comment"
                                                                value={reviewDraft[item.id]?.comment || ''}
                                                                onChange={(e) => setReviewDraft((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: {
                                                                        ...(prev[item.id] || {}),
                                                                        comment: e.target.value,
                                                                    },
                                                                }))}
                                                            />
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button className="btn-primary" style={{ background: '#0f766e', borderColor: '#0f766e' }} onClick={() => reviewItem(item.id, 'approved')}>Approve</button>
                                                                <button className="btn-primary" style={{ background: '#b91c1c', borderColor: '#b91c1c' }} onClick={() => reviewItem(item.id, 'rejected')}>Reject</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                                );
                                            })()
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default HRTaxDeclarationPage;
