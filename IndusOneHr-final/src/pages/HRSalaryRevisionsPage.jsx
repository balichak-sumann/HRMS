import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, RefreshCw } from 'lucide-react';

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const HRSalaryRevisionsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [pending, setPending] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [historyData, setHistoryData] = useState(null);
    const [reviewDraft, setReviewDraft] = useState({});
    const [newRevision, setNewRevision] = useState({
        effective_date: '',
        basic_salary: '',
        hra: '',
        allowances: '',
        total_ctc: '',
    });

    const loadMeta = async () => {
        const [employeeRows, pendingRows] = await Promise.all([
            api.get('/employees'),
            api.get('/salary-revisions/pending'),
        ]);

        const emps = Array.isArray(employeeRows) ? employeeRows : [];
        setEmployees(emps);
        setPending(Array.isArray(pendingRows) ? pendingRows : []);

        if (!selectedEmployeeId && emps[0]) {
            setSelectedEmployeeId(emps[0].id);
        }
    };

    const loadHistory = async (employeeId) => {
        if (!employeeId) {
            setHistoryData(null);
            return;
        }

        const data = await api.get(`/salary-revisions/employee/${employeeId}/history`);
        setHistoryData(data || null);
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            await loadMeta();
        } catch (error) {
            console.error('Failed to load salary revision data', error);
            alert(error.message || 'Failed to load salary revision data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        if (!selectedEmployeeId) return;
        loadHistory(selectedEmployeeId).catch((error) => {
            console.error('Failed to load revision history', error);
        });
    }, [selectedEmployeeId]);

    const currentStructure = useMemo(() => historyData?.current_structure || null, [historyData]);

    const initiateRevision = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) return;

        try {
            setSaving(true);
            await api.post('/salary-revisions', {
                employee_id: selectedEmployeeId,
                effective_date: newRevision.effective_date,
                basic_salary: Number(newRevision.basic_salary || 0),
                hra: Number(newRevision.hra || 0),
                allowances: Number(newRevision.allowances || 0),
                total_ctc: Number(newRevision.total_ctc || 0),
            });

            setNewRevision({
                effective_date: '',
                basic_salary: '',
                hra: '',
                allowances: '',
                total_ctc: '',
            });

            await Promise.all([loadMeta(), loadHistory(selectedEmployeeId)]);
            alert('Salary revision initiated for approval');
        } catch (error) {
            console.error('Failed to initiate revision', error);
            alert(error.message || 'Failed to initiate revision');
        } finally {
            setSaving(false);
        }
    };

    const decideRevision = async (revisionId, decision) => {
        try {
            const draft = reviewDraft[revisionId] || {};
            await api.patch(`/salary-revisions/${revisionId}/decision`, {
                decision,
                comment: draft.comment || '',
            });
            await Promise.all([loadMeta(), loadHistory(selectedEmployeeId)]);
        } catch (error) {
            console.error('Failed to review revision', error);
            alert(error.message || 'Failed to review revision');
        }
    };

    const toggleHistoryVisibility = async (enabled) => {
        if (!selectedEmployeeId) return;

        try {
            await api.patch(`/salary-revisions/employee/${selectedEmployeeId}/history-visibility`, { enabled });
            await loadHistory(selectedEmployeeId);
        } catch (error) {
            console.error('Failed to update history visibility', error);
            alert(error.message || 'Failed to update history visibility');
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
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '22px', color: 'var(--text-main)', fontWeight: 700 }}>Salary Revision Workflow</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Initiate revisions, route for second-level HR approval, and track timeline.</p>
                </div>
                <button className="btn-primary" onClick={loadAll}><RefreshCw size={16} /> Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="card" style={{ padding: '14px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select Employee</label>
                    <select className="input-field" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                        ))}
                    </select>

                    {currentStructure && (
                        <div style={{ marginTop: '10px', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                            <p style={{ fontWeight: 700, marginBottom: '6px' }}>Current Salary Structure</p>
                            <p style={{ fontSize: '13px' }}>Basic: {money(currentStructure.basic_salary)}</p>
                            <p style={{ fontSize: '13px' }}>HRA: {money(currentStructure.hra)}</p>
                            <p style={{ fontSize: '13px' }}>Allowances: {money(currentStructure.allowances)}</p>
                            <p style={{ fontSize: '13px' }}>Monthly Gross: {money(currentStructure.monthly_gross)}</p>
                            <p style={{ fontSize: '13px' }}>Total CTC: {money(currentStructure.total_ctc)}</p>
                            <label style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={!!historyData?.history_enabled}
                                    onChange={(e) => toggleHistoryVisibility(e.target.checked)}
                                />
                                Allow employee to view revision history
                            </label>
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ fontWeight: 700, marginBottom: '6px' }}>Initiate Revision</p>
                    <form onSubmit={initiateRevision} style={{ display: 'grid', gap: '8px' }}>
                        <input className="input-field" type="date" required value={newRevision.effective_date} onChange={(e) => setNewRevision((prev) => ({ ...prev, effective_date: e.target.value }))} />
                        <input className="input-field" type="number" min="0" step="0.01" placeholder="Basic" required value={newRevision.basic_salary} onChange={(e) => setNewRevision((prev) => ({ ...prev, basic_salary: e.target.value }))} />
                        <input className="input-field" type="number" min="0" step="0.01" placeholder="HRA" required value={newRevision.hra} onChange={(e) => setNewRevision((prev) => ({ ...prev, hra: e.target.value }))} />
                        <input className="input-field" type="number" min="0" step="0.01" placeholder="Allowances" required value={newRevision.allowances} onChange={(e) => setNewRevision((prev) => ({ ...prev, allowances: e.target.value }))} />
                        <input className="input-field" type="number" min="0" step="0.01" placeholder="Total CTC" required value={newRevision.total_ctc} onChange={(e) => setNewRevision((prev) => ({ ...prev, total_ctc: e.target.value }))} />
                        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Initiate Revision'}</button>
                    </form>
                </div>
            </div>

            <div className="card" style={{ padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontWeight: 700, marginBottom: '8px' }}>Pending Approvals (Second HR step)</p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Employee</th>
                                <th style={{ padding: '8px' }}>Effective Date</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Basic</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>HRA</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Allowances</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>CTC</th>
                                <th style={{ padding: '8px' }}>Review</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pending.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '10px', color: 'var(--text-muted)' }}>No pending approvals.</td>
                                </tr>
                            ) : pending.map((row) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px' }}>{row.employee_name}</td>
                                    <td style={{ padding: '8px' }}>{new Date(row.effective_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.proposed_basic_salary)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.proposed_hra)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.proposed_allowances)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{money(row.proposed_total_ctc)}</td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <input
                                                className="input-field"
                                                placeholder="Comment"
                                                value={reviewDraft[row.id]?.comment || ''}
                                                onChange={(e) => setReviewDraft((prev) => ({
                                                    ...prev,
                                                    [row.id]: {
                                                        ...(prev[row.id] || {}),
                                                        comment: e.target.value,
                                                    },
                                                }))}
                                            />
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="btn-primary" style={{ background: '#0f766e', borderColor: '#0f766e' }} onClick={() => decideRevision(row.id, 'approved')}>Approve</button>
                                                <button className="btn-primary" style={{ background: '#b91c1c', borderColor: '#b91c1c' }} onClick={() => decideRevision(row.id, 'rejected')}>Reject</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ padding: '14px' }}>
                <p style={{ fontWeight: 700, marginBottom: '8px' }}>Revision Timeline</p>
                {(historyData?.revisions || []).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No revisions found for selected employee.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {historyData.revisions.map((revision) => (
                            <div key={revision.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                                <p style={{ fontWeight: 700 }}>{revision.status.toUpperCase()} | Effective {new Date(revision.effective_date).toLocaleDateString()}</p>
                                <p style={{ fontSize: '13px' }}>
                                    Basic {money(revision.proposed_basic_salary)} | HRA {money(revision.proposed_hra)} | Allowances {money(revision.proposed_allowances)} | CTC {money(revision.proposed_total_ctc)}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Initiated by: {revision.initiated_by_name || '-'} on {new Date(revision.initiated_at || revision.created_at).toLocaleString()}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Approved by: {revision.approved_by_name || '-'} {revision.approved_at ? `on ${new Date(revision.approved_at).toLocaleString()}` : ''}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Comment: {revision.approver_comment || '-'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default HRSalaryRevisionsPage;
