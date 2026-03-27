import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, Upload } from 'lucide-react';

const sectionOptions = [
    { value: '80C', label: '80C Investments' },
    { value: 'HRA', label: 'HRA Exemption' },
    { value: 'HOME_LOAN_INTEREST', label: 'Home Loan Interest' },
    { value: 'STANDARD_DEDUCTION', label: 'Standard Deduction' },
    { value: 'OTHER', label: 'Other Deductions' },
];

const normalizeAmountInput = (value) => {
    const raw = String(value ?? '').trim();
    if (raw === '') return '';

    // Keep only digits and a single decimal dot.
    const cleaned = raw
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');

    if (cleaned === '') return '';

    const [intPartRaw = '', decimalPart] = cleaned.split('.');
    const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
    const safeInt = intPart === '' ? '0' : intPart;

    return decimalPart !== undefined ? `${safeInt}.${decimalPart}` : safeInt;
};

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

const EmployeeTaxDeclarationPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingFy, setLoadingFy] = useState(false);
    const [creatingVersion, setCreatingVersion] = useState(false);
    const [declaration, setDeclaration] = useState(null);
    const [declarationOptions, setDeclarationOptions] = useState([]);
    const [selectedDeclarationId, setSelectedDeclarationId] = useState('');
    const [items, setItems] = useState([]);
    const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
    const financialYearOptions = useMemo(() => getFinancialYearOptions(6), []);
    const isReviewed = declaration?.status === 'reviewed';

    const fetchDeclarationOptions = async (fy = financialYear) => {
        const rows = await api.get(`/income-tax/my/list?financial_year=${encodeURIComponent(fy)}`);
        const nextOptions = Array.isArray(rows) ? rows : [];
        setDeclarationOptions(nextOptions);
        return nextOptions;
    };

    const fetchDeclaration = async ({ fy = financialYear, declarationId = '' } = {}) => {
        try {
            setLoading(true);
            const query = declarationId
                ? `/income-tax/my?financial_year=${encodeURIComponent(fy)}&declaration_id=${encodeURIComponent(declarationId)}`
                : `/income-tax/my?financial_year=${encodeURIComponent(fy)}`;
            const data = await api.get(query);
            setDeclaration(data);
            setSelectedDeclarationId(data?.id || '');
            setItems(
                Array.isArray(data?.items)
                    ? data.items.map((row) => ({
                        ...row,
                        declared_amount: normalizeAmountInput(row.declared_amount),
                    }))
                    : []
            );

            await fetchDeclarationOptions(fy);
        } catch (error) {
            console.error('Failed to load declaration', error);
            alert(error.message || 'Failed to load declaration');
        } finally {
            setLoading(false);
        }
    };

    const loadFinancialYear = async () => {
        try {
            setLoadingFy(true);
            await fetchDeclaration({ fy: financialYear });
        } finally {
            setLoadingFy(false);
        }
    };

    const loadDeclarationById = async (declarationId) => {
        if (!declarationId) return;
        await fetchDeclaration({ fy: financialYear, declarationId });
    };

    const createNewVersion = async () => {
        try {
            setCreatingVersion(true);
            const data = await api.post('/income-tax/my/versions', { financial_year: financialYear });
            setDeclaration(data);
            setSelectedDeclarationId(data?.id || '');
            setItems(
                Array.isArray(data?.items)
                    ? data.items.map((row) => ({
                        ...row,
                        declared_amount: normalizeAmountInput(row.declared_amount),
                    }))
                    : []
            );
            await fetchDeclarationOptions(financialYear);
            alert('New declaration version created');
        } catch (error) {
            console.error('Failed to create declaration version', error);
            alert(error.message || 'Failed to create declaration version');
        } finally {
            setCreatingVersion(false);
        }
    };

    useEffect(() => {
        loadFinancialYear();
    }, []);

    const totalDeclared = useMemo(
        () => items.reduce((sum, row) => sum + Number(row.declared_amount || 0), 0),
        [items]
    );

    const addItem = () => {
        if (isReviewed) {
            alert('Reviewed declaration cannot be edited');
            return;
        }

        setItems((prev) => [
            ...prev,
            {
                section_code: '80C',
                item_label: '',
                declared_amount: 0,
                status: 'pending',
                proofs: [],
            },
        ]);
    };

    const updateItem = (index, patch) => {
        if (isReviewed) return;
        setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
    };

    const saveDeclaration = async () => {
        try {
            setSaving(true);
            const payload = {
                financial_year: financialYear,
                declaration_id: selectedDeclarationId || undefined,
                items: items.map((row) => ({
                    id: row.id,
                    section_code: row.section_code,
                    item_label: row.item_label,
                    declared_amount: Number(row.declared_amount || 0),
                })),
            };
            const data = await api.put('/income-tax/my', payload);
            setDeclaration(data);
            setItems(
                Array.isArray(data?.items)
                    ? data.items.map((row) => ({
                        ...row,
                        declared_amount: normalizeAmountInput(row.declared_amount),
                    }))
                    : []
            );
            alert('Declaration saved');
        } catch (error) {
            console.error('Failed to save declaration', error);
            alert(error.message || 'Failed to save declaration');
        } finally {
            setSaving(false);
        }
    };

    const submitDeclaration = async () => {
        try {
            setSubmitting(true);
            const data = await api.post('/income-tax/my/submit', {
                financial_year: financialYear,
                declaration_id: selectedDeclarationId || undefined,
            });
            setDeclaration(data);
            setItems(
                Array.isArray(data?.items)
                    ? data.items.map((row) => ({
                        ...row,
                        declared_amount: normalizeAmountInput(row.declared_amount),
                    }))
                    : []
            );
            alert('Declaration submitted for HR review');
        } catch (error) {
            console.error('Failed to submit declaration', error);
            alert(error.message || 'Failed to submit declaration');
        } finally {
            setSubmitting(false);
        }
    };

    const uploadProof = async (itemId, file) => {
        if (!itemId) {
            alert('Save declaration once before uploading proofs');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('proof', file);
            await api.post(`/income-tax/my/items/${itemId}/proofs`, formData);
            await fetchDeclaration(financialYear);
        } catch (error) {
            console.error('Failed to upload proof', error);
            alert(error.message || 'Failed to upload proof');
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
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Income Tax Declaration</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Declare planned deductions and upload supporting proofs for FY.
                </p>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Financial Year</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                className="input-field"
                                value={financialYear}
                                onChange={(e) => setFinancialYear(e.target.value)}
                                style={{ width: '160px' }}
                                disabled={loadingFy}
                            >
                                {financialYearOptions.map((fy) => (
                                    <option key={fy} value={fy}>{fy}</option>
                                ))}
                            </select>
                            <button className="btn-secondary" onClick={loadFinancialYear} disabled={loadingFy}>
                                {loadingFy ? <Loader2 size={14} className="animate-spin" /> : 'Load'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Status</p>
                        <p style={{ fontWeight: 700 }}>
                            {declaration?.status || 'draft'}
                            {declaration?.version ? ` | v${declaration.version}` : ''}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Declared</p>
                        <p style={{ fontWeight: 700 }}>Rs {totalDeclared.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '17px' }}>Declaration Items</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                            className="input-field"
                            value={selectedDeclarationId}
                            onChange={(e) => loadDeclarationById(e.target.value)}
                            style={{ minWidth: '190px' }}
                        >
                            {(declarationOptions || []).map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {`v${opt.version} | ${opt.status} | ${opt.total_items} items`}
                                </option>
                            ))}
                        </select>
                        <button className="btn-secondary" onClick={createNewVersion} disabled={creatingVersion}>
                            {creatingVersion ? <Loader2 size={14} className="animate-spin" /> : null}
                            New Version
                        </button>
                        <button className="btn-primary" onClick={addItem} disabled={isReviewed}><PlusCircle size={16} /> Add Item</button>
                    </div>
                </div>

                {isReviewed && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '10px' }}>
                        This declaration is reviewed and read-only. Ask HR/Admin to reopen it if edits are needed, or change financial year and click Load.
                    </p>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Section</th>
                                <th style={{ padding: '8px' }}>Item</th>
                                <th style={{ padding: '8px' }}>Declared Amount</th>
                                <th style={{ padding: '8px' }}>Approved Amount</th>
                                <th style={{ padding: '8px' }}>Status</th>
                                <th style={{ padding: '8px' }}>HR Comment</th>
                                <th style={{ padding: '8px' }}>Proofs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '10px', color: 'var(--text-muted)' }}>No declaration items added.</td>
                                </tr>
                            ) : items.map((row, index) => (
                                <tr key={row.id || `new-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px' }}>
                                        <select
                                            className="input-field"
                                            value={row.section_code}
                                            onChange={(e) => updateItem(index, { section_code: e.target.value })}
                                            disabled={isReviewed}
                                        >
                                            {sectionOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input
                                            className="input-field"
                                            value={row.item_label || ''}
                                            onChange={(e) => updateItem(index, { item_label: e.target.value })}
                                            disabled={isReviewed}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input
                                            className="input-field"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={normalizeAmountInput(row.declared_amount)}
                                            onChange={(e) => updateItem(index, { declared_amount: normalizeAmountInput(e.target.value) })}
                                            disabled={isReviewed}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', fontWeight: '600', color: row.status === 'approved' ? 'var(--status-approved-text)' : 'inherit' }}>
                                        {row.status === 'approved' && row.approved_amount != null
                                            ? `₹${Number(row.approved_amount).toLocaleString('en-IN')}`
                                            : row.status === 'rejected' ? '₹0' : '-'}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <span className={`status-badge ${row.status || 'pending'}`}>
                                            {(row.status || 'pending').charAt(0).toUpperCase() + (row.status || 'pending').slice(1)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px' }}>{row.hr_comment || '-'}</td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            {(row.proofs || []).map((proof) => (
                                                <a key={proof.id} href={proof.file_path} target="_blank" rel="noreferrer">
                                                    {proof.file_name}
                                                </a>
                                            ))}
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <Upload size={14} /> Upload
                                                <input
                                                    type="file"
                                                    style={{ display: 'none' }}
                                                    disabled={isReviewed}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) uploadProof(row.id, file);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button className="btn-primary" onClick={saveDeclaration} disabled={saving || isReviewed}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                        Save
                    </button>
                    <button className="btn-primary" onClick={submitDeclaration} disabled={submitting || isReviewed}>
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                        Submit For Review
                    </button>
                </div>
            </div>
        </>
    );
};

export default EmployeeTaxDeclarationPage;
