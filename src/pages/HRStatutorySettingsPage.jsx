import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const emptySlab = () => ({ name: '', income_from: 0, income_to: '', rate: 0 });

const formatInr = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return Math.round(num).toLocaleString('en-IN');
};

const HRStatutorySettingsPage = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        pf_employee_rate: '',
        pf_employer_rate: '',
        esi_employee_rate: '',
        esi_employer_rate: '',
        basic_ratio: 0.5555,
        hra_ratio: 0.5,
        conveyance_amount: 1500,
        fixed_pf_deduction: 1500,
        fixed_insurance_deduction: 334,
        fixed_ptax_deduction: 200,
        tds_slabs: [emptySlab()]
    });

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await api.get('/payroll/statutory-settings');
            if (!data?.settings || !Array.isArray(data?.tds_slabs) || data.tds_slabs.length === 0) {
                // No settings saved yet — just show empty form, no error
                return;
            }
            setForm({
                pf_employee_rate: Number(data.settings.pf_employee_rate),
                pf_employer_rate: Number(data.settings.pf_employer_rate),
                esi_employee_rate: Number(data.settings.esi_employee_rate),
                esi_employer_rate: Number(data.settings.esi_employer_rate),
                basic_ratio: Number(data.settings.basic_ratio) || 0.5555,
                hra_ratio: Number(data.settings.hra_ratio) || 0.5,
                conveyance_amount: Number(data.settings.conveyance_amount) || 0,
                fixed_pf_deduction: Number(data.settings.fixed_pf_deduction) || 0,
                fixed_insurance_deduction: Number(data.settings.fixed_insurance_deduction) || 0,
                fixed_ptax_deduction: Number(data.settings.fixed_ptax_deduction) || 0,
                tds_slabs: (data?.tds_slabs || []).length
                    ? data.tds_slabs.map((slab) => ({
                        name: slab.name || '',
                        income_from: Number(slab.income_from) || 0,
                        income_to: slab.income_to == null ? '' : Number(slab.income_to),
                        rate: Number(slab.rate) || 0
                    }))
                    : [emptySlab()]
            });
        } catch (error) {
            // Only show toast for actual server errors, not "not configured" errors
            const msg = error?.message || '';
            if (!msg.includes('not configured')) {
                toast.error(msg || 'Failed to fetch statutory settings');
            }
            console.error('Failed to fetch statutory settings', error);
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
        toast.success('New slab added. Fill in the details and click Save Settings.');
    };

    const removeSlab = (index) => {
        setForm((prev) => ({
            ...prev,
            tds_slabs: prev.tds_slabs.filter((_, idx) => idx !== index)
        }));
        toast.success('Slab removed. Click Save Settings to apply.');
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
                basic_ratio: Number(form.basic_ratio) || 0,
                hra_ratio: Number(form.hra_ratio) || 0,
                conveyance_amount: Number(form.conveyance_amount) || 0,
                fixed_pf_deduction: Number(form.fixed_pf_deduction) || 0,
                fixed_insurance_deduction: Number(form.fixed_insurance_deduction) || 0,
                fixed_ptax_deduction: Number(form.fixed_ptax_deduction) || 0,
                tds_slabs: form.tds_slabs
                    .map((slab) => ({
                        name: (slab.name || '').trim(),
                        income_from: Number(slab.income_from) || 0,
                        income_to: slab.income_to === '' ? null : Number(slab.income_to),
                        rate: Number(slab.rate) || 0
                    }))
                    .sort((a, b) => a.income_from - b.income_from)
            };

            await api.put('/payroll/statutory-settings', payload);
            await fetchSettings();
            toast.success('Statutory settings saved successfully!');
        } catch (error) {
            console.error('Failed to save statutory settings', error);
            toast.error(error.message || 'Failed to save statutory settings');
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
                {isAdmin && (
                    <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '17px', marginBottom: '16px' }}>Salary Breakdown Settings</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Basic Salary Ratio (of Gross)</label>
                                <input className="input-field" type="number" step="0.0001" value={form.basic_ratio} onChange={(e) => setForm((prev) => ({ ...prev, basic_ratio: e.target.value }))} placeholder="e.g. 0.5555 for 5/9" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HRA Ratio (of Basic)</label>
                                <input className="input-field" type="number" step="0.01" value={form.hra_ratio} onChange={(e) => setForm((prev) => ({ ...prev, hra_ratio: e.target.value }))} placeholder="e.g. 0.5 for 50%" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fixed Conveyance (Monthly)</label>
                                <input className="input-field" type="number" value={form.conveyance_amount} onChange={(e) => setForm((prev) => ({ ...prev, conveyance_amount: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fixed PF Deduction (Monthly)</label>
                                <input className="input-field" type="number" value={form.fixed_pf_deduction} onChange={(e) => setForm((prev) => ({ ...prev, fixed_pf_deduction: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fixed Insurance (Monthly)</label>
                                <input className="input-field" type="number" value={form.fixed_insurance_deduction} onChange={(e) => setForm((prev) => ({ ...prev, fixed_insurance_deduction: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fixed P Tax (Monthly)</label>
                                <input className="input-field" type="number" value={form.fixed_ptax_deduction} onChange={(e) => setForm((prev) => ({ ...prev, fixed_ptax_deduction: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                )}

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
                                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>{slab.name ? slab.name : `Slab ${index + 1}`}</p>
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

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Slab Name</label>
                                    <input className="input-field" type="text" placeholder="e.g. 0% Slab" value={slab.name || ''} onChange={(e) => updateSlab(index, { name: e.target.value })} />
                                </div>
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
