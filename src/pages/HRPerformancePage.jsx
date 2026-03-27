import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';

const statusColors = {
    draft: '#64748B',
    active: '#16A34A',
    closed: '#DC2626'
};

const HRPerformancePage = () => {
    const [cycles, setCycles] = useState([]);
    const [dashboard, setDashboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', start_date: '', end_date: '', status: 'draft' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cyclesData, dashboardData] = await Promise.all([
                api.get('/performance/cycles'),
                api.get('/performance/dashboard')
            ]);
            setCycles(cyclesData || []);
            setDashboard(dashboardData || []);
        } catch (error) {
            console.error('Failed to load performance data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const createCycle = async (e) => {
        e.preventDefault();
        try {
            setCreating(true);
            await api.post('/performance/cycles', form);
            setForm({ name: '', start_date: '', end_date: '', status: 'draft' });
            await fetchData();
        } catch (error) {
            console.error('Create cycle failed', error);
            alert('Failed to create appraisal cycle');
        } finally {
            setCreating(false);
        }
    };

    const updateStatus = async (cycleId, status) => {
        try {
            await api.patch(`/performance/cycles/${cycleId}/status`, { status });
            await fetchData();
        } catch (error) {
            console.error('Status update failed', error);
            alert('Failed to update cycle status');
        }
    };

    const dashboardByCycle = useMemo(() => {
        const map = new Map();
        (dashboard || []).forEach((c) => map.set(c.id, c));
        return map;
    }, [dashboard]);

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-main)' }}>Performance</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Create appraisal cycles, track completions, and review scores.</p>
                </div>
                <button onClick={fetchData} className="btn-primary" style={{ borderRadius: '10px' }}>
                    <RefreshCw size={18} /> Refresh
                </button>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Create Appraisal Cycle</h3>
                <form onSubmit={createCycle} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>CYCLE NAME</label>
                        <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. FY26 Q2 Review" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>START DATE</label>
                        <input type="date" className="input-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>END DATE</label>
                        <input type="date" className="input-field" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>STATUS</label>
                        <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={creating} style={{ borderRadius: '8px', height: '42px' }}>
                        {creating ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={16} />} Create
                    </button>
                </form>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px' }}>
                    <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {cycles.map((cycle) => {
                        const cycleData = dashboardByCycle.get(cycle.id);
                        const employees = cycleData?.employees || [];
                        return (
                            <div key={cycle.id} className="card" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{cycle.name}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                                            {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: statusColors[cycle.status] || '#64748B' }}>
                                            {cycle.status.toUpperCase()}
                                        </span>
                                        <select className="input-field" value={cycle.status} onChange={(e) => updateStatus(cycle.id, e.target.value)} style={{ width: '130px' }}>
                                            <option value="draft">Draft</option>
                                            <option value="active">Active</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px' }}>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Employees in Cycle</p>
                                        <p style={{ fontSize: '18px', fontWeight: '700' }}>{employees.length}</p>
                                    </div>
                                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px' }}>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Self Completed</p>
                                        <p style={{ fontSize: '18px', fontWeight: '700' }}>{employees.filter((e) => e.self_submitted).length}</p>
                                    </div>
                                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px' }}>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manager Completed</p>
                                        <p style={{ fontSize: '18px', fontWeight: '700' }}>{employees.filter((e) => e.manager_submitted).length}</p>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Employee</th>
                                                <th style={{ textAlign: 'center', padding: '8px 6px' }}>Goals</th>
                                                <th style={{ textAlign: 'center', padding: '8px 6px' }}>Self</th>
                                                <th style={{ textAlign: 'center', padding: '8px 6px' }}>Manager</th>
                                                <th style={{ textAlign: 'center', padding: '8px 6px' }}>Avg Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.length === 0 ? (
                                                <tr><td colSpan={5} style={{ padding: '12px', color: 'var(--text-muted)' }}>No appraisal data yet.</td></tr>
                                            ) : employees.map((emp) => (
                                                <tr key={emp.employee_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                    <td style={{ padding: '8px 6px', fontWeight: '600' }}>{emp.full_name}</td>
                                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>{emp.goals_count}</td>
                                                    <td style={{ padding: '8px 6px', textAlign: 'center', color: emp.self_submitted ? '#16A34A' : '#DC2626' }}>{emp.self_submitted ? 'Done' : 'Pending'}</td>
                                                    <td style={{ padding: '8px 6px', textAlign: 'center', color: emp.manager_submitted ? '#16A34A' : '#DC2626' }}>{emp.manager_submitted ? 'Done' : 'Pending'}</td>
                                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>{emp.avg_score ?? '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    {cycles.length === 0 && (
                        <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No appraisal cycles created yet.
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default HRPerformancePage;
