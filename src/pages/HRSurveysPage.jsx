import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, BarChart3, Send, ClipboardList } from 'lucide-react';

const HRSurveysPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [surveys, setSurveys] = useState([]);

    const loadSurveys = async () => {
        try {
            setLoading(true);
            const data = await api.get('/surveys');
            setSurveys(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err.message || 'Failed to load surveys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSurveys();
    }, []);

    const publishSurvey = async (surveyId) => {
        try {
            await api.patch(`/surveys/${surveyId}/publish`, {});
            toast.success('Survey published');
            loadSurveys();
        } catch (err) {
            toast.error(err.message || 'Failed to publish survey');
        }
    };

    const badgeStyle = (status) => {
        if (status === 'active') return { background: '#DCFCE7', color: '#166534' };
        if (status === 'closed') return { background: '#E5E7EB', color: '#374151' };
        return { background: '#FEF3C7', color: '#92400E' };
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-main)' }}>Surveys</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Create, publish, and monitor survey responses.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/hr/surveys/create')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={16} /> Create Survey
                </button>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading surveys...</p>
                ) : surveys.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No surveys created yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {surveys.map((survey) => (
                            <div
                                key={survey.id}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '16px' }}>{survey.title}</h3>
                                        <span style={{
                                            ...badgeStyle(survey.status),
                                            borderRadius: '999px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            padding: '3px 8px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {survey.status}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 4px 0', fontSize: '13px' }}>
                                        {survey.description || 'No description'}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '12px' }}>
                                        Target: {survey.target_type === 'department' ? survey.target_department_name || 'Department' : 'All employees'}
                                        {' · '}
                                        Responses: {survey.response_count || 0}
                                        {' · '}
                                        Deadline: {survey.deadline ? new Date(survey.deadline).toLocaleDateString() : 'No deadline'}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn"
                                        onClick={() => navigate(`/hr/surveys/${survey.id}/results`)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <BarChart3 size={14} /> Results
                                    </button>
                                    {survey.status !== 'active' && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => publishSurvey(survey.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Send size={14} /> Publish
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={14} />
                Published surveys become visible to employees instantly.
            </div>
        </div>
    );
};

export default HRSurveysPage;
