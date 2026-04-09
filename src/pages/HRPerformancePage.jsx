import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, PlusCircle, RefreshCw, Star, X, CheckCircle, UserPlus, Search } from 'lucide-react';

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

    // Review Modal States
    const [reviewModal, setReviewModal] = useState(null); // { employee_id, cycle_id, full_name }
    const [reviewGoals, setReviewGoals] = useState([]);
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [reviewRatings, setReviewRatings] = useState([]); // [{ goal_id, rating, comment }]
    const [submittingReview, setSubmittingReview] = useState(false);
    const [goalsLoading, setGoalsLoading] = useState(false);
    const [goalModal, setGoalModal] = useState(null); // { employee_id, cycle_id, full_name }
    const [goalForm, setGoalForm] = useState({ title: '', description: '', target: '' });
    const [submittingGoal, setSubmittingGoal] = useState(false);
    const [goalList, setGoalList] = useState([]);
    const [editingGoalId, setEditingGoalId] = useState(null);

    // Add Employee States
    const [addEmployeeModal, setAddEmployeeModal] = useState(null); // cycle_id
    const [allEmployees, setAllEmployees] = useState([]);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [addingEmployee, setAddingEmployee] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cyclesData, dashboardResponse] = await Promise.all([
                api.get('/performance/cycles'),
                api.get('/performance/dashboard')
            ]);
            setCycles(cyclesData || []);
            setDashboard(dashboardResponse?.dashboard || []);
            setAllEmployees(dashboardResponse?.all_employees || []);
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

    const startReview = async (employeeId, fullName, cycleId) => {
        try {
            setReviewModal({ employee_id: employeeId, full_name: fullName, cycle_id: cycleId });
            setGoalsLoading(true);
            const goals = await api.get(`/performance/goals?employee_id=${employeeId}&cycle_id=${cycleId}`);
            setReviewGoals(goals || []);
            setReviewRatings((goals || []).map(g => ({ goal_id: g.id, rating: 5, comment: '' })));
        } catch (error) {
            console.error('Failed to fetch goals', error);
            alert('Failed to load employee goals');
        } finally {
            setGoalsLoading(false);
        }
    };

    const submitReview = async () => {
        if (!reviewModal) return;
        try {
            setSubmittingReview(true);
            await api.post('/performance/manager-appraisal', {
                cycle_id: reviewModal.cycle_id,
                employee_id: reviewModal.employee_id,
                feedback: reviewFeedback,
                items: reviewRatings
            });
            setReviewModal(null);
            setReviewFeedback('');
            await fetchData();
            alert('Appraisal submitted successfully');
        } catch (error) {
            console.error('Submit review failed', error);
            alert('Failed to submit appraisal');
        } finally {
            setSubmittingReview(false);
        }
    };

    const addParticipant = async (employeeId) => {
        if (!addEmployeeModal) return;
        try {
            setAddingEmployee(true);
            await api.post(`/performance/cycles/${addEmployeeModal}/participants`, { employee_id: employeeId });
            await fetchData();
            setAddEmployeeModal(null);
            setEmployeeSearch('');
        } catch (error) {
            console.error('Add participant failed', error);
            alert('Failed to add employee to cycle');
        } finally {
            setAddingEmployee(false);
        }
    };

    const openGoalModal = (employeeId, fullName, cycleId, cycleStatus) => {
        setGoalModal({ employee_id: employeeId, full_name: fullName, cycle_id: cycleId, cycle_status: cycleStatus });
        setGoalForm({ title: '', description: '', target: '' });
        setEditingGoalId(null);
        setGoalList([]);
        loadEmployeeGoals(employeeId, cycleId);
    };

    const loadEmployeeGoals = async (employeeId, cycleId) => {
        try {
            const goals = await api.get(`/performance/goals?employee_id=${employeeId}&cycle_id=${cycleId}`);
            setGoalList(goals || []);
        } catch (error) {
            console.error('Failed to load assigned goals', error);
            alert(error?.response?.data?.error || 'Failed to load assigned goals');
        }
    };

    const startEditGoal = (goal) => {
        setEditingGoalId(goal.id);
        setGoalForm({
            title: goal.title || '',
            description: goal.description || '',
            target: goal.target || ''
        });
    };

    const resetGoalEditor = () => {
        setEditingGoalId(null);
        setGoalForm({ title: '', description: '', target: '' });
    };

    const submitAssignedGoal = async (e) => {
        e.preventDefault();
        if (!goalModal) return;

        try {
            setSubmittingGoal(true);
            if (editingGoalId) {
                await api.patch(`/performance/goals/${editingGoalId}`, {
                    title: goalForm.title,
                    description: goalForm.description,
                    target: goalForm.target
                });
            } else {
                await api.post('/performance/goals', {
                    cycle_id: goalModal.cycle_id,
                    employee_id: goalModal.employee_id,
                    title: goalForm.title,
                    description: goalForm.description,
                    target: goalForm.target
                });
            }
            setGoalForm({ title: '', description: '', target: '' });
            setEditingGoalId(null);
            await loadEmployeeGoals(goalModal.employee_id, goalModal.cycle_id);
            await fetchData();
            alert(editingGoalId ? 'Goal updated successfully' : 'Goal assigned successfully');
        } catch (error) {
            console.error('Assign goal failed', error);
            alert(error?.response?.data?.error || 'Failed to save goal');
        } finally {
            setSubmittingGoal(false);
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
                                         {cycle.status !== 'closed' && (
                                             <button 
                                                 onClick={() => setAddEmployeeModal(cycle.id)}
                                                 className="btn-primary" 
                                                 style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                             >
                                                 <UserPlus size={16} /> Add Employee
                                             </button>
                                         )}
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
                                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                            <span>{emp.goals_count}</span>
                                                            <button
                                                                onClick={() => openGoalModal(emp.employee_id, emp.full_name, cycle.id, cycle.status)}
                                                                style={{ padding: '4px 8px', fontSize: '11px', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: '4px', cursor: 'pointer' }}
                                                            >
                                                                Goals
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 6px', textAlign: 'center', color: emp.self_submitted ? '#16A34A' : '#DC2626' }}>{emp.self_submitted ? 'Done' : 'Pending'}</td>
                                                     <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                             <span style={{ color: emp.manager_submitted ? '#16A34A' : '#DC2626' }}>{emp.manager_submitted ? 'Done' : 'Pending'}</span>
                                                             {cycle.status === 'active' && (
                                                                 <button 
                                                                     onClick={() => startReview(emp.employee_id, emp.full_name, cycle.id)}
                                                                     style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                 >
                                                                     {emp.manager_submitted ? 'Edit' : 'Review'}
                                                                 </button>
                                                             )}
                                                         </div>
                                                     </td>
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
            {/* Review Modal */}
            {reviewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '16px' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Review for {reviewModal.full_name}</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Provide ratings and feedback for the current cycle</p>
                            </div>
                            <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {goalsLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} className="animate-spin" color="var(--primary)" /></div>
                            ) : (
                                <div style={{ display: 'grid', gap: '24px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>Overall Review Feedback</label>
                                        <textarea 
                                            className="input-field" 
                                            rows="4" 
                                            placeholder="Write your overall assessment of the employee's performance..."
                                            value={reviewFeedback}
                                            onChange={(e) => setReviewFeedback(e.target.value)}
                                            style={{ fontSize: '14px', lineHeight: '1.5' }}
                                        />
                                    </div>

                                    {reviewGoals.length > 0 && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '16px', textTransform: 'uppercase' }}>Goal Performance Ratings</label>
                                            <div style={{ display: 'grid', gap: '16px' }}>
                                                {reviewGoals.map((goal, idx) => (
                                                    <div key={goal.id} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '20px', alignItems: 'start' }}>
                                                            <div>
                                                                <p style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>{goal.title}</p>
                                                                <p style={{ fontSize: '12px', color: '#64748B' }}>Progress: <strong>{goal.progress}%</strong> | Target: {goal.target}</p>
                                                            </div>
                                                            <select 
                                                                className="input-field" 
                                                                value={reviewRatings[idx]?.rating || 5} 
                                                                onChange={(e) => {
                                                                    const next = [...reviewRatings];
                                                                    next[idx] = { ...next[idx], rating: Number(e.target.value) };
                                                                    setReviewRatings(next);
                                                                }}
                                                                style={{ height: '38px', borderRadius: '8px', fontWeight: '600' }}
                                                            >
                                                                <option value="5">5 - Exceptional</option>
                                                                <option value="4">4 - Exceeds</option>
                                                                <option value="3">3 - Meets</option>
                                                                <option value="2">2 - Below</option>
                                                                <option value="1">1 - Unsatisfactory</option>
                                                            </select>
                                                        </div>
                                                        <input 
                                                            className="input-field" 
                                                            placeholder="Specific comment for this goal..."
                                                            value={reviewRatings[idx]?.comment || ''}
                                                            onChange={(e) => {
                                                                const next = [...reviewRatings];
                                                                next[idx] = { ...next[idx], comment: e.target.value };
                                                                setReviewRatings(next);
                                                            }}
                                                            style={{ marginTop: '12px', background: 'white', height: '38px' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {reviewGoals.length === 0 && (
                                        <div style={{ padding: '14px', borderRadius: '10px', background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontSize: '13px' }}>
                                            No goals assigned for this employee in this cycle. You can still submit overall feedback, or use + Goal from the cycle table to assign goals first.
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                        <button 
                                            className="btn-primary" 
                                            onClick={submitReview} 
                                            disabled={submittingReview || !reviewFeedback.trim()}
                                            style={{ flex: 1, height: '46px', borderRadius: '10px', fontSize: '15px', fontWeight: '700' }}
                                        >
                                            {submittingReview ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Finalize Review</>}
                                        </button>
                                        <button 
                                            className="btn-secondary" 
                                            onClick={() => setReviewModal(null)} 
                                            disabled={submittingReview}
                                            style={{ flex: 1, height: '46px', borderRadius: '10px', fontSize: '15px', fontWeight: '700' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Goal Modal */}
            {goalModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '0', borderRadius: '16px' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Assign Goal</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Assigning to {goalModal.full_name}</p>
                            </div>
                            <button onClick={() => setGoalModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={submitAssignedGoal} style={{ padding: '20px', display: 'grid', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Assigned Goals</label>
                                {goalModal?.cycle_status !== 'active' && (
                                    <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '13px' }}>
                                        This cycle is not active, so goals are view-only.
                                    </div>
                                )}
                                <div style={{ display: 'grid', gap: '10px', marginBottom: '8px' }}>
                                    {goalList.length === 0 ? (
                                        <div style={{ padding: '12px', borderRadius: '10px', background: '#F8FAFC', border: '1px dashed #CBD5E1', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            No goals assigned yet for this employee in this cycle.
                                        </div>
                                    ) : goalList.map((goal) => (
                                        <div key={goal.id} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: editingGoalId === goal.id ? '#EEF2FF' : 'white' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>{goal.title}</p>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{goal.description || goal.target}</p>
                                                    <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>Progress: {goal.progress ?? 0}%</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditGoal(goal)}
                                                    disabled={goalModal?.cycle_status !== 'active'}
                                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {editingGoalId && goalModal?.cycle_status === 'active' && (
                                    <button type="button" className="btn-secondary" onClick={resetGoalEditor} style={{ height: '36px', borderRadius: '8px', fontSize: '12px' }}>
                                        Create New Goal Instead
                                    </button>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>GOAL TITLE</label>
                                <input className="input-field" value={goalForm.title} onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))} required placeholder="e.g. Improve API response time" disabled={goalModal?.cycle_status !== 'active'} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>DESCRIPTION</label>
                                <input className="input-field" value={goalForm.description} onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional details" disabled={goalModal?.cycle_status !== 'active'} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>TARGET</label>
                                <input className="input-field" value={goalForm.target} onChange={(e) => setGoalForm((prev) => ({ ...prev, target: e.target.value }))} required placeholder="e.g. P95 under 200ms" disabled={goalModal?.cycle_status !== 'active'} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button type="submit" className="btn-primary" disabled={submittingGoal || goalModal?.cycle_status !== 'active'} style={{ flex: 1, borderRadius: '8px', height: '42px' }}>
                                    {submittingGoal ? <Loader2 className="animate-spin" size={16} /> : (editingGoalId ? 'Save Goal Changes' : 'Assign Goal')}
                                </button>
                                <button type="button" className="btn-secondary" onClick={() => setGoalModal(null)} disabled={submittingGoal} style={{ flex: 1, borderRadius: '8px', height: '42px' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {addEmployeeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '0', borderRadius: '16px' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Add Employee to Cycle</h2>
                            <button onClick={() => setAddEmployeeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ position: 'relative' }}>
                                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                <input 
                                    className="input-field" 
                                    placeholder="Search employees..." 
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    style={{ paddingLeft: '36px' }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                            {allEmployees
                                .filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                .filter(emp => !dashboardByCycle.get(addEmployeeModal)?.employees?.some(e => e.employee_id === emp.id))
                                .map((emp) => (
                                    <div key={emp.id} style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px', cursor: 'pointer' }} className="hover-item">
                                        <div>
                                            <p style={{ fontWeight: '600', fontSize: '14px' }}>{emp.full_name}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.role} • {emp.email}</p>
                                        </div>
                                        <button 
                                            onClick={() => addParticipant(emp.id)}
                                            style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))
                            }
                            {allEmployees.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No employees found.</p>}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HRPerformancePage;
