import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, Save, Trash2 } from 'lucide-react';

const emptySlab = () => ({ income_from: 0, income_to: '', rate: 0 });

const formatInr = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return Math.round(num).toLocaleString('en-IN');
};

const HRStatutorySettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        pf_employee_rate: '',
        pf_employer_rate: '',
        esi_employee_rate: '',
        esi_employer_rate: '',
        tds_slabs: [emptySlab()]
    });

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await api.get('/payroll/statutory-settings');
            if (!data?.settings || !Array.isArray(data?.tds_slabs) || data.tds_slabs.length === 0) {
                throw new Error('Statutory settings are not configured yet. Configure them before payroll generation.');
            }
            setForm({
                pf_employee_rate: Number(data.settings.pf_employee_rate),
                pf_employer_rate: Number(data.settings.pf_employer_rate),
                esi_employee_rate: Number(data.settings.esi_employee_rate),
                esi_employer_rate: Number(data.settings.esi_employer_rate),
                tds_slabs: (data?.tds_slabs || []).length
                    ? data.tds_slabs.map((slab) => ({
                        income_from: Number(slab.income_from) || 0,
                        income_to: slab.income_to == null ? '' : Number(slab.income_to),
                        rate: Number(slab.rate) || 0
                    }))
                    : [emptySlab()]
            });
        } catch (error) {
            console.error('Failed to fetch statutory settings', error);
            alert(error.message || 'Failed to fetch statutory settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSlab = (index, patch) => {
        setForm((prev) => ({
            ...prev,
            tds_slabs: prev.tds_slabs.map((slab, idx) => idx === index ? { ...slab, ...patch } : slab)
        }));
    };

    const addSlab = () => {
        setForm((prev) => ({ ...prev, tds_slabs: [...prev.tds_slabs, emptySlab()] }));
    };

    const removeSlab = (index) => {
        setForm((prev) => ({
            ...prev,
            tds_slabs: prev.tds_slabs.filter((_, idx) => idx !== index)
        }));
    };

    const getSlabSummary = (slab) => {
        const from = Number(slab.income_from) || 0;
        const to = slab.income_to === '' || slab.income_to == null ? null : Number(slab.income_to);
        const rate = Number(slab.rate) || 0;
        const rangeLabel = to === null
            ? `INR ${formatInr(from)} and above`
            : `INR ${formatInr(from)} - INR ${formatInr(to)}`;
        return `${rangeLabel} at ${rate}%`;
    };

    const saveSettings = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            const payload = {
                pf_employee_rate: Number(form.pf_employee_rate) || 0,
                pf_employer_rate: Number(form.pf_employer_rate) || 0,
                esi_employee_rate: Number(form.esi_employee_rate) || 0,
                esi_employer_rate: Number(form.esi_employer_rate) || 0,
                tds_slabs: form.tds_slabs
                    .map((slab) => ({
                        income_from: Number(slab.income_from) || 0,
                        income_to: slab.income_to === '' ? null : Number(slab.income_to),
                        rate: Number(slab.rate) || 0
                    }))
                    .sort((a, b) => a.income_from - b.income_from)
            };

            await api.put('/payroll/statutory-settings', payload);
            await fetchSettings();
            alert('Statutory settings saved successfully');
        } catch (error) {
            console.error('Failed to save statutory settings', error);
            alert(error.message || 'Failed to save statutory settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 size={36} className="animate-spin" color="var(--primary)" />
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Statutory Settings</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Configure PF, ESI, and TDS slab rules used for payroll generation.
                </p>
            </div>

            <form className="card" style={{ padding: '20px', display: 'grid', gap: '16px' }} onSubmit={saveSettings}>
                <div>
                    <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Contribution Rates (%)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PF Employee Contribution</label>
                            <input className="input-field" type="number" step="0.01" value={form.pf_employee_rate} onChange={(e) => setForm((prev) => ({ ...prev, pf_employee_rate: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PF Employer Contribution</label>
                            <input className="input-field" type="number" step="0.01" value={form.pf_employer_rate} onChange={(e) => setForm((prev) => ({ ...prev, pf_employer_rate: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ESI Employee Contribution</label>
                            <input className="input-field" type="number" step="0.01" value={form.esi_employee_rate} onChange={(e) => setForm((prev) => ({ ...prev, esi_employee_rate: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ESI Employer Contribution</label>
                            <input className="input-field" type="number" step="0.01" value={form.esi_employer_rate} onChange={(e) => setForm((prev) => ({ ...prev, esi_employer_rate: e.target.value }))} />
                        </div>
                    </div>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '17px' }}>TDS Slabs (Annual Income)</h3>
                        <button type="button" className="btn-primary" style={{ borderRadius: '8px' }} onClick={addSlab}>
                            <PlusCircle size={16} /> Add Slab
                        </button>
                    </div>

                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Each slab is editable directly. Update values and click Save Settings to apply.
                    </p>

                    <div style={{ display: 'grid', gap: '8px' }}>
                        {form.tds_slabs.map((slab, index) => (
                            <div key={index} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>Slab {index + 1}</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{getSlabSummary(slab)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSlab(index)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        title="Remove slab"
                                    >
                                        <Trash2 size={16} /> Remove
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Income From (INR)</label>
                                    <input className="input-field" type="number" min="0" value={slab.income_from} onChange={(e) => updateSlab(index, { income_from: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Income To (INR, blank = no upper cap)</label>
                                    <input className="input-field" type="number" value={slab.income_to} onChange={(e) => updateSlab(index, { income_to: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rate (%)</label>
                                    <input className="input-field" type="number" min="0" step="0.01" value={slab.rate} onChange={(e) => updateSlab(index, { rate: e.target.value })} />
                                </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-primary" type="submit" style={{ borderRadius: '8px' }} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Settings
                    </button>
                </div>
            </form>
        </>
    );
};

export default HRStatutorySettingsPage;
