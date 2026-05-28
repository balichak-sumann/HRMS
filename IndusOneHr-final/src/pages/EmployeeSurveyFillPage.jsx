import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const EmployeeSurveyFillPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [survey, setSurvey] = useState(null);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                setLoading(true);
                const data = await api.get(`/surveys/${id}`);
                setSurvey(data);
            } catch (err) {
                toast.error(err.message || 'Failed to load survey');
                navigate('/employee/surveys');
            } finally {
                setLoading(false);
            }
        };
        loadSurvey();
    }, [id, navigate]);

    const canSubmit = useMemo(() => {
        if (!survey?.questions?.length || survey?.has_responded) return false;
        return survey.questions.every((q) => String(answers[q.id] || '').trim().length > 0);
    }, [survey, answers]);

    const handleSubmit = async () => {
        if (!canSubmit) {
            toast.error('Please answer all questions');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                answers: survey.questions.map((q) => ({
                    question_id: q.id,
                    answer_text: String(answers[q.id] || '').trim(),
                })),
            };
            await api.post(`/surveys/${id}/respond`, payload);
            toast.success('Survey submitted successfully');
            navigate('/employee/surveys');
        } catch (err) {
            toast.error(err.message || 'Failed to submit survey');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading survey...</p>;
    if (!survey) return null;

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>{survey.title}</h1>
                <p style={{ marginTop: '6px', color: 'var(--text-muted)' }}>{survey.description || 'No description'}</p>
            </div>

            <div className="card" style={{ padding: '16px', opacity: survey.has_responded ? 0.65 : 1 }}>
                {survey.has_responded && (
                    <div style={{ marginBottom: '12px', color: '#166534', background: '#DCFCE7', borderRadius: '8px', padding: '10px' }}>
                        You have already submitted this survey.
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {survey.questions.map((q, index) => (
                        <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                            <p style={{ marginTop: 0, color: 'var(--text-main)', fontWeight: '600' }}>{index + 1}. {q.question_text}</p>

                            {q.question_type === 'rating' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <button
                                            key={v}
                                            className="btn"
                                            type="button"
                                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: String(v) }))}
                                            disabled={survey.has_responded}
                                            style={{
                                                minWidth: '42px',
                                                background: answers[q.id] === String(v) ? 'var(--primary)' : undefined,
                                                color: answers[q.id] === String(v) ? '#fff' : undefined,
                                            }}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {q.question_type === 'mcq' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(q.options || []).map((opt) => (
                                        <label key={opt} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="radio"
                                                name={`q_${q.id}`}
                                                value={opt}
                                                checked={answers[q.id] === opt}
                                                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                                disabled={survey.has_responded}
                                            />
                                            <span style={{ color: 'var(--text-main)' }}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.question_type === 'text' && (
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={answers[q.id] || ''}
                                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                    disabled={survey.has_responded}
                                    placeholder="Type your answer"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={!canSubmit || submitting || survey.has_responded}>
                        {submitting ? 'Submitting...' : 'Submit Survey'}
                    </button>
                    <button className="btn" type="button" onClick={() => navigate('/employee/surveys')}>Back</button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSurveyFillPage;
