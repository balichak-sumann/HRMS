import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
};

const EmployeeExitInterviewPage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [myCase, setMyCase] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [form, setForm] = useState({
        reason_for_leaving: '',
        experience_rating: 4,
        feedback: ''
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await api.get('/offboarding/my/case');
            setMyCase(data?.case || null);
            setChecklist(Array.isArray(data?.checklist) ? data.checklist : []);
            setAssignments(Array.isArray(data?.assignments) ? data.assignments : []);

            if (data?.case?.interview_id) {
                setForm({
                    reason_for_leaving: data.case.reason_for_leaving || '',
                    experience_rating: Number(data.case.experience_rating || 4),
                    feedback: data.case.feedback || ''
                });
            }
        } catch (error) {
            console.error('Failed to load offboarding details', error);
            alert(error.message || 'Failed to load offboarding details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const completion = useMemo(() => {
        if (!myCase) return 0;
        return Number(myCase.progress_percentage || 0);
    }, [myCase]);

    const submitExitInterview = async (event) => {
        event.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/offboarding/my/exit-interview', {
                reason_for_leaving: form.reason_for_leaving,
                experience_rating: Number(form.experience_rating),
                feedback: form.feedback
            });
            await loadData();
            alert('Offboarding details submitted successfully');
        } catch (error) {
            console.error('Failed to submit offboarding details', error);
            alert(error.message || 'Failed to submit offboarding details');
        } finally {
            setSubmitting(false);
        }
    };

    const markAssignmentCleared = async (item) => {
        try {
            await api.patch(`/offboarding/checklist/${item.id}/clear`, {
                is_cleared: !item.is_cleared
            });
            await loadData();
        } catch (error) {
            console.error('Failed to update assignment', error);
            alert(error.message || 'Failed to update assignment');
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
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Offboarding</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Share your feedback and track offboarding completion.
                </p>
            </div>

            {!myCase ? (
                <div className="card" style={{ padding: '22px', color: 'var(--text-muted)' }}>
                    No offboarding case has been started for you yet.
                </div>
            ) : (
                <>
                    <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600 }}>Checklist Progress</span>
                            <span style={{ fontWeight: 700 }}>{completion}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${completion}%`, height: '100%', background: '#2563EB' }} />
                        </div>
                        <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Last Working Date: {formatDate(myCase.last_working_date)}
                        </p>
                    </div>

                    <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Offboarding Form</h3>
                        <form onSubmit={submitExitInterview} style={{ display: 'grid', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reason For Leaving</label>
                                <textarea
                                    className="input-field"
                                    rows="3"
                                    required
                                    value={form.reason_for_leaving}
                                    onChange={(e) => setForm((prev) => ({ ...prev, reason_for_leaving: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Experience Rating (1-5)</label>
                                <select
                                    className="input-field"
                                    value={form.experience_rating}
                                    onChange={(e) => setForm((prev) => ({ ...prev, experience_rating: e.target.value }))}
                                >
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <option key={rating} value={rating}>{rating}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Additional Feedback</label>
                                <textarea
                                    className="input-field"
                                    rows="4"
                                    value={form.feedback}
                                    onChange={(e) => setForm((prev) => ({ ...prev, feedback: e.target.value }))}
                                />
                            </div>
                            <button className="btn-primary" type="submit" disabled={submitting || myCase.status === 'completed'}>
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                {submitting ? 'Submitting...' : 'Submit Offboarding Details'}
                            </button>
                        </form>
                    </div>

                    <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>My Offboarding Checklist</h3>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {checklist.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No checklist items available.</p>
                            ) : checklist.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 700 }}>{item.task_title}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            Assigned: {item.assigned_role}{item.assigned_to_name ? ` (${item.assigned_to_name})` : ''}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.is_cleared ? '#0f766e' : '#b45309' }}>
                                        {item.is_cleared ? 'Cleared' : 'Pending'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Assigned To Me (Role-wise)</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                    {assignments.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No active offboarding tasks are assigned to your role.</p>
                    ) : assignments.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                padding: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            <div>
                                <p style={{ fontWeight: 700 }}>{item.task_title}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Offboarding Employee: {item.offboarding_employee_name} | Role: {item.assigned_role}
                                </p>
                            </div>
                            <button
                                className="btn-primary"
                                style={{
                                    background: item.is_cleared ? '#b91c1c' : '#0f766e',
                                    borderColor: item.is_cleared ? '#b91c1c' : '#0f766e'
                                }}
                                onClick={() => markAssignmentCleared(item)}
                            >
                                {item.is_cleared ? 'Mark Pending' : 'Mark Cleared'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default EmployeeExitInterviewPage;
