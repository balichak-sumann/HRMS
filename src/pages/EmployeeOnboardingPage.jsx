import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';

const EmployeeOnboardingPage = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ case: null, tasks: [] });
    const [files, setFiles] = useState({});

    const fetchChecklist = async () => {
        try {
            setLoading(true);
            const response = await api.get('/onboarding/my-checklist');
            setData(response || { case: null, tasks: [] });
        } catch (error) {
            console.error('Failed to fetch onboarding checklist', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChecklist();
    }, []);

    const updateTask = async (task, is_completed) => {
        try {
            const file = files[task.id];
            const payload = new FormData();
            payload.append('is_completed', String(is_completed));
            if (file) payload.append('document', file);

            await api.patch(`/onboarding/my/tasks/${task.id}`, payload);
            setFiles((prev) => ({ ...prev, [task.id]: null }));
            await fetchChecklist();
        } catch (error) {
            console.error('Failed to update onboarding task', error);
            alert(error.message || 'Failed to update task');
        }
    };

    const completion = useMemo(() => {
        if (!data?.case) return 0;
        return data.case.completion_percentage || 0;
    }, [data]);

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>My Onboarding</h1>
                {data?.case && <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Template: {data.case.template_name}</p>}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px' }}><Loader2 size={36} className="animate-spin" color="var(--primary)" /></div>
            ) : !data?.case ? (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No onboarding checklist assigned yet.
                </div>
            ) : (
                <>
                    <div className="card" style={{ padding: '18px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <p style={{ fontWeight: '700' }}>Completion Progress</p>
                            <p style={{ fontWeight: '700' }}>{completion}%</p>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${completion}%`, height: '100%', background: 'var(--primary)' }} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>{data.case.completed_tasks}/{data.case.total_tasks} tasks completed</p>
                    </div>

                    <div className="card" style={{ padding: '18px' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Checklist</h3>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {data.tasks.map((task) => (
                                <div key={task.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                        <div>
                                            <p style={{ fontWeight: '700', color: 'var(--text-main)' }}>{task.title}</p>
                                            {task.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{task.description}</p>}
                                            {task.requires_document && <p style={{ fontSize: '12px', color: '#0369A1' }}>Document upload required</p>}
                                        </div>

                                        {task.is_completed ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontSize: '13px', fontWeight: '700' }}>
                                                <CheckCircle2 size={16} /> Done
                                            </span>
                                        ) : (
                                            <button className="btn-primary" onClick={() => updateTask(task, true)} style={{ borderRadius: '8px' }}>
                                                Mark Done
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        {task.requires_document && !task.document_url && (
                                            <>
                                                <input type="file" onChange={(e) => setFiles((prev) => ({ ...prev, [task.id]: e.target.files?.[0] || null }))} />
                                                {files[task.id] && (
                                                    <button className="btn-primary" style={{ borderRadius: '8px' }} onClick={() => updateTask(task, task.is_completed)}>
                                                        <Upload size={14} /> Upload Document
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {task.document_url && (
                                            <a href={task.document_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--primary)' }}>
                                                View uploaded document
                                            </a>
                                        )}

                                        {task.is_completed && (
                                            <button
                                                style={{ border: '1px solid var(--border)', background: 'var(--card-bg)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}
                                                onClick={() => updateTask(task, false)}
                                            >
                                                Mark Pending
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default EmployeeOnboardingPage;
