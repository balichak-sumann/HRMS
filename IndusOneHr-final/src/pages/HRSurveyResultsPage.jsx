import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const renderStars = (avg) => {
    if (avg == null) return 'No responses';
    const rounded = Math.round(avg);
    return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)} (${avg})`;
};

const HRSurveyResultsPage = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const result = await api.get(`/surveys/${id}/results`);
                setData(result);
            } catch (err) {
                toast.error(err.message || 'Failed to load results');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading survey results...</p>;
    if (!data) return <p style={{ color: 'var(--text-muted)' }}>No data available.</p>;

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>{data.survey.title}</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>{data.survey.description || 'No description'}</p>
            </div>

            <div className="grid-cols-3" style={{ marginBottom: '16px' }}>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>Target employees</p>
                    <h3 style={{ margin: '6px 0 0 0', color: 'var(--text-main)' }}>{data.stats.target_count}</h3>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>Responses</p>
                    <h3 style={{ margin: '6px 0 0 0', color: 'var(--text-main)' }}>{data.stats.response_count}</h3>
                </div>
                <div className="card" style={{ padding: '14px' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>Response rate</p>
                    <h3 style={{ margin: '6px 0 0 0', color: 'var(--text-main)' }}>{data.stats.response_rate}%</h3>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {data.questions.map((question) => (
                    <div key={question.id} className="card" style={{ padding: '14px' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: '16px' }}>{question.question_text}</h3>

                        {question.question_type === 'rating' && (
                            <p style={{ color: 'var(--text-main)', marginBottom: 0 }}>
                                Average Rating: {renderStars(question.average_rating)}
                            </p>
                        )}

                        {question.question_type === 'mcq' && (
                            <div style={{ width: '100%', height: '260px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={question.option_counts} margin={{ left: 4, right: 4, top: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="option" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {question.question_type === 'text' && (
                            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}>
                                {question.text_answers.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No text answers yet.</p>
                                ) : (
                                    question.text_answers.map((item, idx) => (
                                        <div key={idx} style={{ borderBottom: idx === question.text_answers.length - 1 ? 'none' : '1px solid var(--border)', padding: '8px 2px' }}>
                                            <p style={{ margin: 0, color: 'var(--text-main)' }}>{item.answer_text}</p>
                                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                                                {data.survey.is_anonymous ? 'Anonymous' : (item.employee_name || 'Employee')}
                                                {' · '}
                                                {new Date(item.submitted_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HRSurveyResultsPage;
