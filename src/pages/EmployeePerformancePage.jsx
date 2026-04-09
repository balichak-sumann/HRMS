import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, Save } from 'lucide-react';

const EmployeePerformancePage = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selfItems, setSelfItems] = useState([]);
    const [selfComment, setSelfComment] = useState('');


    const [managerTarget, setManagerTarget] = useState('');
    const [managerFeedback, setManagerFeedback] = useState('');
    const [managerItems, setManagerItems] = useState([]);
    const [responseComment, setResponseComment] = useState('');
    const [submittingResponse, setSubmittingResponse] = useState(false);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const data = await api.get('/performance/my-overview');
            setOverview(data);
            setSelfItems((data?.goals || []).map((g) => ({ goal_id: g.id, rating: 3, comment: '' })));
            setManagerTarget(data?.team?.[0]?.id || '');
        } catch (error) {
            console.error('Failed to fetch performance overview', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const updateProgress = async (goalId, progress) => {
        try {
            await api.patch(`/performance/goals/${goalId}/progress`, { progress });
            setOverview((prev) => ({
                ...prev,
                goals: prev.goals.map((g) => g.id === goalId ? { ...g, progress } : g)
            }));
        } catch (error) {
            console.error('Progress update failed', error);
        }
    };

    const submitResponse = async () => {
        if (!overview?.manager_appraisal?.id || !responseComment) return;
        try {
            setSubmittingResponse(true);
            await api.post('/performance/respond', {
                appraisal_id: overview.manager_appraisal.id,
                comment: responseComment
            });
            await fetchOverview();
            setResponseComment('');
        } catch (error) {
            console.error('Failed to submit response', error);
            alert('Failed to submit response');
        } finally {
            setSubmittingResponse(false);
        }
    };


    const managerGoals = useMemo(() => {
        if (!managerTarget || !overview?.current_cycle?.id) return [];
        return overview?.team_goals?.[managerTarget] || [];
    }, [managerTarget, overview]);

    useEffect(() => {
        setManagerItems(managerGoals.map((g) => ({ goal_id: g.id, rating: 3, comment: '' })));
    }, [managerGoals]);

    const submitSelf = async () => {
        if (!overview?.current_cycle?.id) return;
        try {
            await api.post('/performance/self-appraisal', {
                cycle_id: overview.current_cycle.id,
                overall_comment: selfComment,
                items: selfItems
            });
            setSelfComment('');
            await fetchOverview();
        } catch (error) {
            console.error('Self appraisal failed', error);
            alert('Failed to submit self appraisal');
        }
    };

    const submitManager = async () => {
        if (!managerTarget) return;
        try {
            await api.post('/performance/manager-appraisal', {
                cycle_id: overview.current_cycle.id,
                employee_id: managerTarget,
                feedback: managerFeedback,
                items: managerItems
            });
            setManagerFeedback('');
            await fetchOverview();
        } catch (error) {
            console.error('Manager appraisal failed', error);
            alert('Failed to submit manager appraisal');
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '80px' }}><Loader2 size={36} className="animate-spin" color="var(--primary)" /></div>;
    }

    if (!overview?.current_cycle) {
        return (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active appraisal cycle right now.
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-main)' }}>Performance</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Current cycle: <strong>{overview.current_cycle.name}</strong> ({new Date(overview.current_cycle.start_date).toLocaleDateString()} - {new Date(overview.current_cycle.end_date).toLocaleDateString()})
                </p>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>My Goals</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '13px' }}>
                    Goals are assigned by HR/Admin for this cycle. You can update progress and submit self-appraisal.
                </p>

                {(overview.goals || []).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No goals added yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {overview.goals.map((goal) => (
                            <div key={goal.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                    <div>
                                        <p style={{ fontWeight: '700', color: 'var(--text-main)' }}>{goal.title}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goal.description || goal.target}</p>
                                    </div>
                                    <div style={{ minWidth: '160px' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progress: {goal.progress}%</p>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={goal.progress}
                                            onChange={(e) => updateProgress(goal.id, Number(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlusCircle size={18} color="var(--primary)" /> Self-Appraisal
                </h3>
                
                {overview.self_appraisal ? (
                    <div style={{ padding: '16px', background: 'rgba(22, 163, 74, 0.05)', borderRadius: '12px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                        <p style={{ fontSize: '14px', color: '#16A349', fontWeight: '700', marginBottom: '8px' }}>✓ SELF-APPRAISAL SUBMITTED</p>
                        <p style={{ fontSize: '14px', color: 'var(--text-main)', fontStyle: 'italic' }}>"{overview.self_appraisal.overall_comment || 'No comment provided.'}"</p>
                        {overview.self_appraisal.items?.length > 0 && (
                            <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                                {overview.self_appraisal.items.map((item, idx) => {
                                    const goal = overview.goals?.find(g => g.id === item.goal_id);
                                    return (
                                        <div key={idx} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                            <span>{goal?.title || 'Goal'}</span>
                                            <span style={{ fontWeight: '700' }}>{item.rating} / 5</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Rate your own performance on your goals and provide overall feedback for this cycle.</p>
                        
                        {(overview.goals || []).map((goal, idx) => (
                            <div key={goal.id} style={{ padding: '12px', border: '1px solid #F1F5F9', borderRadius: '8px' }}>
                                <p style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>{goal.title}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                                    <select 
                                        className="input-field" 
                                        value={selfItems[idx]?.rating || 3} 
                                        onChange={(e) => {
                                            const next = [...selfItems];
                                            next[idx] = { ...next[idx], goal_id: goal.id, rating: Number(e.target.value) };
                                            setSelfItems(next);
                                        }}
                                    >
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}
                                    </select>
                                    <input 
                                        className="input-field" 
                                        placeholder="Self-comment on this goal" 
                                        value={selfItems[idx]?.comment || ''}
                                        onChange={(e) => {
                                            const next = [...selfItems];
                                            next[idx] = { ...next[idx], goal_id: goal.id, comment: e.target.value };
                                            setSelfItems(next);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '6px' }}>OVERALL SELF-COMMENT</label>
                            <textarea 
                                className="input-field" 
                                rows="3" 
                                placeholder="Summarize your performance during this cycle..."
                                value={selfComment}
                                onChange={(e) => setSelfComment(e.target.value)}
                            />
                        </div>

                        <button 
                            className="btn-primary" 
                            onClick={submitSelf}
                            style={{ borderRadius: '8px', alignSelf: 'flex-start' }}
                            disabled={(overview.goals || []).length === 0 && !selfComment.trim()}
                        >
                            <Save size={16} /> Submit Self-Appraisal
                        </button>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={18} /> Review & Appraisal from Organization
                </h3>
                {overview.manager_appraisal ? (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Feedback</p>
                            <p style={{ color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                {overview.manager_appraisal.feedback || 'No overall feedback provided.'}
                            </p>
                            <p style={{ marginTop: '12px', fontSize: '12px', color: '#94A3B8' }}>
                                Reviewed by: <strong>{overview.manager_appraisal.manager_name}</strong> on {new Date(overview.manager_appraisal.submitted_at).toLocaleDateString()}
                            </p>
                        </div>

                        {overview.manager_appraisal.items?.length > 0 && (
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '12px' }}>GOAL-WISE RATINGS</p>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {overview.manager_appraisal.items.map((item, idx) => {
                                        const goal = overview.goals?.find(g => g.id === item.goal_id);
                                        return (
                                            <div key={idx} style={{ padding: '12px', border: '1px solid #F1F5F9', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <p style={{ fontWeight: '600', fontSize: '14px' }}>{goal?.title || 'Unknown Goal'}</p>
                                                    <span style={{ padding: '2px 8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                                                        {item.rating} / 5
                                                    </span>
                                                </div>
                                                {item.comment && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.comment}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '10px', padding: '16px', border: '1px solid var(--primary-light)', borderRadius: '12px', background: 'rgba(54, 84, 255, 0.02)' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '10px' }}>YOUR COMMENTS / ACKNOWLEDGEMENT</p>
                            {overview.manager_appraisal.employee_comment ? (
                                <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>{overview.manager_appraisal.employee_comment}</p>
                                    <p style={{ marginTop: '8px', fontSize: '11px', color: '#94A3B8' }}>Submitted on {new Date(overview.manager_appraisal.employee_comment_at).toLocaleString()}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <textarea 
                                        className="input-field" 
                                        rows="3" 
                                        placeholder="Add your comments or acknowledge the review here..."
                                        value={responseComment}
                                        onChange={(e) => setResponseComment(e.target.value)}
                                        style={{ resize: 'none' }}
                                    />
                                    <button 
                                        className="btn-primary" 
                                        onClick={submitResponse} 
                                        disabled={submittingResponse || !responseComment.trim()}
                                        style={{ borderRadius: '8px', alignSelf: 'flex-start' }}
                                    >
                                        {submittingResponse ? 'Submitting...' : 'Submit Response'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <Loader2 size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p>Appraisal review is currently pending from the organization.</p>
                        <p style={{ fontSize: '12px' }}>Once HR or your Manager completes the review, it will appear here for your comments.</p>
                    </div>
                )}
            </div>


            {overview.is_manager && (
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Manager Panel: Team Appraisals</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px', marginBottom: '12px' }}>
                        <select className="input-field" value={managerTarget} onChange={(e) => setManagerTarget(e.target.value)}>
                            {(overview.team || []).map((member) => (
                                <option key={member.id} value={member.id}>{member.full_name}</option>
                            ))}
                        </select>
                        <input className="input-field" placeholder="Manager feedback" value={managerFeedback} onChange={(e) => setManagerFeedback(e.target.value)} />
                    </div>

                    {(managerGoals || []).map((goal, idx) => (
                        <div key={goal.id} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', marginBottom: '8px' }}>
                            <p style={{ fontWeight: '600' }}>{goal.title}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                                <select className="input-field" value={managerItems[idx]?.rating || 3} onChange={(e) => {
                                    const next = [...managerItems];
                                    next[idx] = { ...next[idx], goal_id: goal.id, rating: Number(e.target.value) };
                                    setManagerItems(next);
                                }}>
                                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
                                </select>
                                <input className="input-field" placeholder="Comment" value={managerItems[idx]?.comment || ''} onChange={(e) => {
                                    const next = [...managerItems];
                                    next[idx] = { ...next[idx], goal_id: goal.id, comment: e.target.value };
                                    setManagerItems(next);
                                }} />
                            </div>
                        </div>
                    ))}

                    <button className="btn-primary" onClick={submitManager} style={{ borderRadius: '8px' }}><Save size={16} /> Submit Manager Appraisal</button>
                </div>
            )}
        </>
    );
};

export default EmployeePerformancePage;
