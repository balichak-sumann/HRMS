import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { CheckCircle2, Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const HROnboardingPage = () => {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [allCases, setAllCases] = useState([]);

    const [templateForm, setTemplateForm] = useState({
        name: '',
        description: '',
        tasks: [{ title: '', description: '', requires_document: false }]
    });

    const [assignForm, setAssignForm] = useState({ employee_id: '', template_id: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [templatesData, employeesData, casesData] = await Promise.all([
                api.get('/onboarding/templates'),
                api.get('/employees'),
                api.get('/onboarding/cases')
            ]);
            setTemplates(templatesData || []);
            setEmployees(employeesData || []);
            setAllCases(casesData || []);
        } catch (error) {
            console.error('Failed to fetch onboarding data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addTaskRow = () => {
        setTemplateForm((prev) => ({
            ...prev,
            tasks: [...prev.tasks, { title: '', description: '', requires_document: false }]
        }));
    };

    const removeTaskRow = (idx) => {
        setTemplateForm((prev) => ({
            ...prev,
            tasks: prev.tasks.filter((_, i) => i !== idx)
        }));
    };

    const updateTask = (idx, patch) => {
        setTemplateForm((prev) => ({
            ...prev,
            tasks: prev.tasks.map((task, i) => (i === idx ? { ...task, ...patch } : task))
        }));
    };

    const createTemplate = async (e) => {
        e.preventDefault();
        if (!templateForm.name.trim()) {
            toast.error('Template name is required');
            return;
        }
        if (!templateForm.description.trim()) {
            toast.error('Template description is required');
            return;
        }
        const cleanedTasks = templateForm.tasks.filter((t) => t.title.trim());
        if (cleanedTasks.length === 0) {
            toast.error('At least one task with a title is required');
            return;
        }
        try {
            await api.post('/onboarding/templates', { ...templateForm, tasks: cleanedTasks });
            setTemplateForm({ name: '', description: '', tasks: [{ title: '', description: '', requires_document: false }] });
            toast.success('Template created successfully');
            await fetchData();
        } catch (error) {
            console.error('Create template failed', error);
            toast.error(error.message || 'Failed to create template');
        }
    };

    const assignTemplate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/onboarding/assign', assignForm);
            setAssignForm({ employee_id: '', template_id: '' });
            await fetchData();
        } catch (error) {
            console.error('Assign template failed', error);
            alert(error.message || 'Failed to assign onboarding template');
        }
    };

    const employeeOptions = useMemo(() => employees.map((e) => ({ id: e.id, name: e.full_name })), [employees]);
    const activeCases = useMemo(() => (allCases || []).filter((c) => c.status === 'active'), [allCases]);
    const completedCases = useMemo(() => (allCases || []).filter((c) => c.status === 'completed'), [allCases]);

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Onboarding</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage templates, assign onboarding, and monitor case completion.</p>
                </div>
                <button className="btn-primary" onClick={fetchData} style={{ borderRadius: '10px' }}>
                    <RefreshCw size={18} /> Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '70px' }}>
                    <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                    <div className="card" style={{ padding: '18px' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Create Onboarding Template</h3>
                        <form onSubmit={createTemplate} style={{ display: 'grid', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Template Name <span style={{ color: '#EF4444' }}>*</span></label>
                                <input className="input-field" placeholder="Template name" value={templateForm.name} onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Description <span style={{ color: '#EF4444' }}>*</span></label>
                                <textarea className="input-field" rows="2" placeholder="Description" value={templateForm.description} onChange={(e) => setTemplateForm((p) => ({ ...p, description: e.target.value }))} required />
                            </div>

                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
                                <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Template Tasks <span style={{ color: '#EF4444' }}>*</span></p>
                                {templateForm.tasks.map((task, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '8px', marginBottom: '8px' }}>
                                        <input className="input-field" placeholder="Task title *" value={task.title} onChange={(e) => updateTask(idx, { title: e.target.value })} required />
                                        <input className="input-field" placeholder="Task description" value={task.description} onChange={(e) => updateTask(idx, { description: e.target.value })} />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                            <input type="checkbox" checked={task.requires_document} onChange={(e) => updateTask(idx, { requires_document: e.target.checked })} /> Requires doc
                                        </label>
                                        <button type="button" onClick={() => removeTaskRow(idx)} style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer' }}>Remove</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addTaskRow} style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>+ Add task</button>
                            </div>

                            <button type="submit" className="btn-primary" style={{ borderRadius: '8px' }}>
                                <PlusCircle size={16} /> Create Template
                            </button>
                        </form>
                    </div>

                    <div className="card" style={{ padding: '18px' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Assign Template to Employee</h3>
                        <form onSubmit={assignTemplate} style={{ display: 'grid', gap: '10px' }}>
                            <select className="input-field" value={assignForm.employee_id} onChange={(e) => setAssignForm((p) => ({ ...p, employee_id: e.target.value }))} required>
                                <option value="">Select employee</option>
                                {employeeOptions.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>

                            <select className="input-field" value={assignForm.template_id} onChange={(e) => setAssignForm((p) => ({ ...p, template_id: e.target.value }))} required>
                                <option value="">Select template</option>
                                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>

                            <button type="submit" className="btn-primary" style={{ borderRadius: '8px' }}>Assign</button>
                        </form>

                        <div style={{ marginTop: '14px' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Available Templates</p>
                            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                                {templates.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No templates yet.</p>
                                ) : templates.map((t) => (
                                    <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}>
                                        <p style={{ fontWeight: '700', fontSize: '13px' }}>{t.name}</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t.task_count || 0} tasks</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '18px', marginTop: '16px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Active Onboarding Cases</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Task completion here is auto-synced from employee actions.
                </p>
                {activeCases.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No active onboarding cases.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {activeCases.map((item) => (
                            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <p style={{ fontWeight: '700' }}>{item.employee_name}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.template_name}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: '700' }}>{item.completion_percentage}%</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.completed_tasks}/{item.total_tasks} tasks</p>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                                    <div style={{ width: `${item.completion_percentage}%`, height: '100%', background: 'var(--primary)' }} />
                                </div>

                                <div style={{ display: 'grid', gap: '6px' }}>
                                    {(item.tasks || []).map((task) => (
                                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', background: '#F8FAFC' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {task.is_completed ? (
                                                        <CheckCircle2 size={15} color="#16A34A" />
                                                    ) : (
                                                        <span style={{ width: '15px', height: '15px', border: '1px solid #94A3B8', borderRadius: '50%', display: 'inline-block' }} />
                                                    )}
                                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{task.title}</span>
                                                </div>
                                                {task.requires_document && <span style={{ fontSize: '11px', color: '#0369A1' }}>Document required</span>}
                                                {task.is_completed && task.completed_by_name && (
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>
                                                        Completed by {task.completed_by_name}
                                                    </span>
                                                )}
                                            </div>
                                            {task.document_url && (
                                                <a href={task.document_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)' }}>View doc</a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '18px', marginTop: '16px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Completed Onboarding Cases</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Completed onboarding history remains visible for audit and review.
                </p>
                {completedCases.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No completed onboarding cases yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {completedCases.map((item) => (
                            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <p style={{ fontWeight: '700' }}>{item.employee_name}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.template_name}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: '700', color: '#16A34A' }}>Completed</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                                    <div style={{ width: `${item.completion_percentage}%`, height: '100%', background: '#16A34A' }} />
                                </div>

                                <div style={{ display: 'grid', gap: '6px' }}>
                                    {(item.tasks || []).map((task) => (
                                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', background: '#F8FAFC' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {task.is_completed ? (
                                                        <CheckCircle2 size={15} color="#16A34A" />
                                                    ) : (
                                                        <span style={{ width: '15px', height: '15px', border: '1px solid #94A3B8', borderRadius: '50%', display: 'inline-block' }} />
                                                    )}
                                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{task.title}</span>
                                                </div>
                                                {task.requires_document && <span style={{ fontSize: '11px', color: '#0369A1' }}>Document required</span>}
                                                {task.is_completed && task.completed_by_name && (
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>
                                                        Completed by {task.completed_by_name}
                                                    </span>
                                                )}
                                            </div>
                                            {task.document_url && (
                                                <a href={task.document_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)' }}>View doc</a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default HROnboardingPage;
