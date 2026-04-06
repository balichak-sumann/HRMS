import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';

// Asset Statuses map dynamically from lookup table

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRAssetsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assetTypes, setAssetTypes] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);

    const [employees, setEmployees] = useState([]);
    const [assets, setAssets] = useState([]);
    const [filters, setFilters] = useState({ type: '', status: '' });

    const [assetForm, setAssetForm] = useState({
        name: '',
        type: 'Laptop',
        serial_number: '',
        purchase_date: '',
        value: '',
        status: 'available'
    });

    const [assignmentDraft, setAssignmentDraft] = useState({});
    const [returnDraft, setReturnDraft] = useState({});

    const fetchAssets = async (nextFilters = filters) => {
        const query = new URLSearchParams();
        if (nextFilters.type) query.set('type', nextFilters.type);
        if (nextFilters.status) query.set('status', nextFilters.status);

        const rows = await api.get(`/assets${query.toString() ? `?${query.toString()}` : ''}`);
        setAssets(Array.isArray(rows) ? rows : []);
    };

    const fetchBaseData = async () => {
        const [employeeRows, typesData, statusData] = await Promise.all([
            api.get('/employees').catch(() => []),
            api.get('/lookups?category=ASSET_TYPE').catch(() => []),
            api.get('/lookups?category=ASSET_STATUS').catch(() => [])
        ]);
        setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
        setAssetTypes(typesData?.map(t => t.value) || []);
        const statuses = statusData?.map(s => s.value) || [];
        setAssetStatuses(statuses);
        
        if (typesData && typesData.length > 0) {
            setAssetForm(prev => ({ ...prev, type: typesData[0].value }));
        }
        if (statuses.length > 0) {
            setAssetForm(prev => ({ ...prev, status: statuses[0] }));
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchBaseData(), fetchAssets(filters)]);
        } catch (error) {
            console.error('Failed to load assets data', error);
            alert(error.message || 'Failed to load assets data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!loading) {
            fetchAssets(filters).catch((error) => {
                console.error('Failed to refresh asset list', error);
            });
        }
    }, [filters]);

    const inventoryStats = useMemo(() => {
        return (assets || []).reduce((acc, row) => {
            acc.total += 1;
            if (row.status === 'available') acc.available += 1;
            if (row.status === 'assigned') acc.assigned += 1;
            return acc;
        }, { total: 0, available: 0, assigned: 0 });
    }, [assets]);

    const createAsset = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.post('/assets', {
                ...assetForm,
                value: assetForm.value === '' ? null : Number(assetForm.value)
            });
            setAssetForm({
                name: '',
                type: 'Laptop',
                serial_number: '',
                purchase_date: '',
                value: '',
                status: assetStatuses?.[0] || 'available'
            });
            await fetchAssets(filters);
        } catch (error) {
            console.error('Failed to create asset', error);
            alert(error.message || 'Failed to create asset');
        } finally {
            setSaving(false);
        }
    };

    const assignAsset = async (assetId) => {
        const employeeId = assignmentDraft[assetId]?.employee_id;
        if (!employeeId) {
            alert('Select an employee first');
            return;
        }

        try {
            setSaving(true);
            await api.post(`/assets/${assetId}/assign`, {
                employee_id: employeeId,
                assignment_date: assignmentDraft[assetId]?.assignment_date || new Date().toISOString().slice(0, 10)
            });
            await fetchAssets(filters);
        } catch (error) {
            console.error('Failed to assign asset', error);
            alert(error.message || 'Failed to assign asset');
        } finally {
            setSaving(false);
        }
    };

    const returnAsset = async (assetId) => {
        try {
            setSaving(true);
            await api.post(`/assets/${assetId}/return`, {
                return_date: returnDraft[assetId]?.return_date || new Date().toISOString().slice(0, 10),
                condition_notes: returnDraft[assetId]?.condition_notes || null,
                return_status: returnDraft[assetId]?.return_status || 'available'
            });
            await fetchAssets(filters);
        } catch (error) {
            console.error('Failed to return asset', error);
            alert(error.message || 'Failed to return asset');
        } finally {
            setSaving(false);
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
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Assets</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        Add assets, assign to employees, and track returns from a single inventory view.
                    </p>
                </div>
                <button className="btn-primary" onClick={loadData}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total Assets</p>
                    <p style={{ fontSize: '24px', fontWeight: '700' }}>{inventoryStats.total}</p>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Available</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#0f766e' }}>{inventoryStats.available}</p>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Assigned</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>{inventoryStats.assigned}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '16px' }}>
                <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Add Asset</h3>
                    <form onSubmit={createAsset} style={{ display: 'grid', gap: '10px' }}>
                        <input className="input-field" placeholder="Asset name" value={assetForm.name} onChange={(e) => setAssetForm((prev) => ({ ...prev, name: e.target.value }))} required />

                        <select className="input-field" value={assetForm.type} onChange={(e) => setAssetForm((prev) => ({ ...prev, type: e.target.value }))}>
                            {assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>

                        <input className="input-field" placeholder="Serial number" value={assetForm.serial_number} onChange={(e) => setAssetForm((prev) => ({ ...prev, serial_number: e.target.value }))} required />

                        <input className="input-field" type="date" value={assetForm.purchase_date} onChange={(e) => setAssetForm((prev) => ({ ...prev, purchase_date: e.target.value }))} max={new Date().toISOString().split('T')[0]} />

                        <input className="input-field" type="number" min="0" step="0.01" placeholder="Value (Rs)" value={assetForm.value} onChange={(e) => setAssetForm((prev) => ({ ...prev, value: e.target.value }))} />

                        <select className="input-field" value={assetForm.status} onChange={(e) => setAssetForm((prev) => ({ ...prev, status: e.target.value }))}>
                            {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>

                        <button className="btn-primary" type="submit" disabled={saving}>
                            <PlusCircle size={16} /> Add Asset
                        </button>
                    </form>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                        <h3 style={{ fontSize: '17px' }}>Inventory</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select className="input-field" style={{ width: '150px' }} value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}>
                                <option value="">All Types</option>
                                {assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <select className="input-field" style={{ width: '150px' }} value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                                <option value="">All Status</option>
                                {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Asset</th>
                                    <th style={{ padding: '8px' }}>Type</th>
                                    <th style={{ padding: '8px' }}>Serial</th>
                                    <th style={{ padding: '8px' }}>Value</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                    <th style={{ padding: '8px' }}>Assigned To</th>
                                    <th style={{ padding: '8px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '12px', color: 'var(--text-muted)' }}>No assets found.</td>
                                    </tr>
                                ) : assets.map((asset) => (
                                    <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{asset.name}</td>
                                        <td style={{ padding: '8px' }}>{asset.asset_type}</td>
                                        <td style={{ padding: '8px' }}>{asset.serial_number}</td>
                                        <td style={{ padding: '8px' }}>{asset.asset_value != null ? money(asset.asset_value) : '-'}</td>
                                        <td style={{ padding: '8px' }}>{asset.status}</td>
                                        <td style={{ padding: '8px' }}>{asset.assigned_employee_name || '-'}</td>
                                        <td style={{ padding: '8px' }}>
                                            {asset.status === 'assigned' && asset.active_assignment_id ? (
                                                <div style={{ display: 'grid', gap: '6px' }}>
                                                    <input
                                                        className="input-field"
                                                        type="date"
                                                        value={returnDraft[asset.id]?.return_date || ''}
                                                        onChange={(e) => setReturnDraft((prev) => ({
                                                            ...prev,
                                                            [asset.id]: {
                                                                ...(prev[asset.id] || {}),
                                                                return_date: e.target.value
                                                            }
                                                        }))}
                                                        max={new Date().toISOString().split('T')[0]}
                                                    />
                                                    <select
                                                        className="input-field"
                                                        value={returnDraft[asset.id]?.return_status || 'available'}
                                                        onChange={(e) => setReturnDraft((prev) => ({
                                                            ...prev,
                                                            [asset.id]: {
                                                                ...(prev[asset.id] || {}),
                                                                return_status: e.target.value
                                                            }
                                                        }))}
                                                    >
                                                        <option value="available">available</option>
                                                        <option value="damaged">damaged</option>
                                                        <option value="retired">retired</option>
                                                    </select>
                                                    <input
                                                        className="input-field"
                                                        placeholder="Condition notes"
                                                        value={returnDraft[asset.id]?.condition_notes || ''}
                                                        onChange={(e) => setReturnDraft((prev) => ({
                                                            ...prev,
                                                            [asset.id]: {
                                                                ...(prev[asset.id] || {}),
                                                                condition_notes: e.target.value
                                                            }
                                                        }))}
                                                    />
                                                    <button className="btn-primary" onClick={() => returnAsset(asset.id)} disabled={saving}>Mark Returned</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gap: '6px' }}>
                                                    <select
                                                        className="input-field"
                                                        value={assignmentDraft[asset.id]?.employee_id || ''}
                                                        onChange={(e) => setAssignmentDraft((prev) => ({
                                                            ...prev,
                                                            [asset.id]: {
                                                                ...(prev[asset.id] || {}),
                                                                employee_id: e.target.value
                                                            }
                                                        }))}
                                                    >
                                                        <option value="">Select employee</option>
                                                        {employees.map((employee) => (
                                                            <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        className="input-field"
                                                        type="date"
                                                        value={assignmentDraft[asset.id]?.assignment_date || ''}
                                                        onChange={(e) => setAssignmentDraft((prev) => ({
                                                            ...prev,
                                                            [asset.id]: {
                                                                ...(prev[asset.id] || {}),
                                                                assignment_date: e.target.value
                                                            }
                                                        }))}
                                                        max={new Date().toISOString().split('T')[0]}
                                                    />
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => assignAsset(asset.id)}
                                                        disabled={saving || asset.status === 'retired' || asset.status === 'damaged'}
                                                    >
                                                        Assign
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HRAssetsPage;