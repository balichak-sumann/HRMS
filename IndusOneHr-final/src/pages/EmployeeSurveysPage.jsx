import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const EmployeeSurveysPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [surveys, setSurveys] = useState([]);

    useEffect(() => {
        const load = async () => {
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

        load();
    }, []);

    return (
        <div>
            <div style={{ marginBottom: '18px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>My Surveys</h1>
                <p style={{ marginTop: '6px', color: 'var(--text-muted)' }}>Complete active surveys before deadline.</p>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading surveys...</p>
                ) : surveys.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No surveys available right now.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {surveys.map((survey) => (
                            <div
                                key={survey.id}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    opacity: survey.has_responded ? 0.55 : 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>{survey.title}</h3>
                                    <p style={{ margin: '6px 0 4px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        {survey.description || 'No description'}
                                    </p>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
                                        Deadline: {survey.deadline ? new Date(survey.deadline).toLocaleDateString() : 'No deadline'}
                                    </p>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate(`/employee/surveys/${survey.id}`)}
                                    disabled={!!survey.has_responded}
                                >
                                    {survey.has_responded ? 'Completed' : 'Fill Survey'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeSurveysPage;
