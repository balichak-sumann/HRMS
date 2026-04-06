import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const defaultQuestion = () => ({
    question_text: '',
    question_type: 'rating',
    options: [''],
});

const HRSurveyCreatePage = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [surveyTypes, setSurveyTypes] = useState([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        survey_type: '',
        deadline: '',
        is_anonymous: false,
        target_type: 'all',
        target_department_id: '',
        questions: [defaultQuestion()],
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [deptData, typeData] = await Promise.all([
                    api.get('/departments').catch(() => []),
                    api.get('/lookups?category=SURVEY_TYPE').catch(() => [])
                ]);
                setDepartments(Array.isArray(deptData) ? deptData : []);
                const types = Array.isArray(typeData) ? typeData : [];
                setSurveyTypes(types);
                if (types.length > 0) {
                    setForm(prev => ({ ...prev, survey_type: types[0].value }));
                }
            } catch (err) {
                console.error('Failed to load survey data:', err.message);
            }
        };
        loadInitialData();
    }, []);

    const canSubmit = useMemo(() => {
        if (!form.title.trim()) return false;
        if (form.target_type === 'department' && !form.target_department_id) return false;
        if (!form.questions.length) return false;
        return form.questions.every((q) => {
            if (!q.question_text.trim()) return false;
            if (q.question_type === 'mcq') {
                return q.options.filter((o) => o.trim()).length >= 2;
            }
            return true;
        });
    }, [form]);

    const updateQuestion = (index, patch) => {
        setForm((prev) => {
            const next = [...prev.questions];
            next[index] = { ...next[index], ...patch };
            return { ...prev, questions: next };
        });
    };

    const moveQuestion = (index, direction) => {
        setForm((prev) => {
            const next = [...prev.questions];
            const target = index + direction;
            if (target < 0 || target >= next.length) return prev;
            const temp = next[index];
            next[index] = next[target];
            next[target] = temp;
            return { ...prev, questions: next };
        });
    };

    const addOption = (index) => {
        const q = form.questions[index];
        updateQuestion(index, { options: [...(q.options || []), ''] });
    };

    const updateOption = (qIndex, optIndex, value) => {
        const q = form.questions[qIndex];
        const nextOptions = [...(q.options || [])];
        nextOptions[optIndex] = value;
        updateQuestion(qIndex, { options: nextOptions });
    };

    const removeOption = (qIndex, optIndex) => {
        const q = form.questions[qIndex];
        const nextOptions = (q.options || []).filter((_, i) => i !== optIndex);
        updateQuestion(qIndex, { options: nextOptions.length ? nextOptions : [''] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) {
            toast.error('Please complete all required fields');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                title: form.title.trim(),
                description: form.description.trim(),
                deadline: form.deadline || null,
                is_anonymous: form.is_anonymous,
                survey_type: form.survey_type,
                target_type: form.target_type,
                target_department_id: form.target_type === 'department' ? form.target_department_id : null,
                questions: form.questions.map((q, idx) => ({
                    question_text: q.question_text.trim(),
                    question_type: q.question_type,
                    options: q.question_type === 'mcq' ? q.options.map((o) => o.trim()).filter(Boolean) : [],
                    order_index: idx + 1,
                })),
            };

            await api.post('/surveys', payload);
            toast.success('Survey draft created');
            navigate('/hr/surveys');
        } catch (err) {
            toast.error(err.message || 'Failed to create survey');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-main)' }}>Create Survey</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Build a draft survey and publish when ready.</p>
            </div>

            <form onSubmit={handleSubmit} className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="responsive-grid-2">
                    <input
                        className="input"
                        placeholder="Survey title"
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    />

                    <select
                        className="input"
                        value={form.survey_type}
                        onChange={(e) => setForm((prev) => ({ ...prev, survey_type: e.target.value }))}
                        required
                    >
                        <option value="">Select Survey Type</option>
                        {surveyTypes.map((t) => (
                            <option key={t.id} value={t.value}>{t.value}</option>
                        ))}
                    </select>
                </div>

                <textarea
                    className="input"
                    rows={3}
                    placeholder="Survey description"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />

                <div className="responsive-grid-2">
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>Deadline</label>
                        <input
                            className="input"
                            type="date"
                            value={form.deadline}
                            onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>Target audience</label>
                        <select
                            className="input"
                            value={form.target_type}
                            onChange={(e) => setForm((prev) => ({ ...prev, target_type: e.target.value }))}
                        >
                            <option value="all">All employees</option>
                            <option value="department">Specific department</option>
                        </select>
                    </div>
                </div>

                {form.target_type === 'department' && (
                    <select
                        className="input"
                        value={form.target_department_id}
                        onChange={(e) => setForm((prev) => ({ ...prev, target_department_id: e.target.value }))}
                    >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <input
                        type="checkbox"
                        checked={form.is_anonymous}
                        onChange={(e) => setForm((prev) => ({ ...prev, is_anonymous: e.target.checked }))}
                    />
                    Anonymous responses
                </label>

                <div style={{ marginTop: '8px' }}>
                    <h3 style={{ marginBottom: '10px', color: 'var(--text-main)' }}>Questions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {form.questions.map((q, index) => (
                            <div key={index} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                    <input
                                        className="input"
                                        placeholder={`Question ${index + 1}`}
                                        value={q.question_text}
                                        onChange={(e) => updateQuestion(index, { question_text: e.target.value })}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        className="input"
                                        value={q.question_type}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            updateQuestion(index, {
                                                question_type: type,
                                                options: type === 'mcq' ? (q.options?.length ? q.options : ['']) : [],
                                            });
                                        }}
                                        style={{ width: '140px' }}
                                    >
                                        <option value="rating">Rating</option>
                                        <option value="mcq">MCQ</option>
                                        <option value="text">Text</option>
                                    </select>
                                    <button type="button" className="btn" onClick={() => moveQuestion(index, -1)} disabled={index === 0}><ArrowUp size={14} /></button>
                                    <button type="button" className="btn" onClick={() => moveQuestion(index, 1)} disabled={index === form.questions.length - 1}><ArrowDown size={14} /></button>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => setForm((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) || [defaultQuestion()] }))}
                                        disabled={form.questions.length === 1}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {q.question_type === 'mcq' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {q.options.map((option, optIndex) => (
                                            <div key={optIndex} style={{ display: 'flex', gap: '6px' }}>
                                                <input
                                                    className="input"
                                                    placeholder={`Option ${optIndex + 1}`}
                                                    value={option}
                                                    onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                                />
                                                <button type="button" className="btn" onClick={() => removeOption(index, optIndex)}><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        <button type="button" className="btn" onClick={() => addOption(index)} style={{ width: 'fit-content' }}>
                                            <Plus size={14} /> Add option
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="btn"
                        onClick={() => setForm((prev) => ({ ...prev, questions: [...prev.questions, defaultQuestion()] }))}
                        style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={14} /> Add Question
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={!canSubmit || saving}>
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button type="button" className="btn" onClick={() => navigate('/hr/surveys')}>Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default HRSurveyCreatePage;
