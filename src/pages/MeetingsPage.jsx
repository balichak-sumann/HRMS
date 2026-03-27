import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Video,
    Plus,
    Calendar,
    Clock,
    Users,
    ArrowRight,
    Loader2,
    X,
    CheckCircle2,
    Info
} from 'lucide-react';

const getRoleBasePath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'hr') return '/hr';
    return '/employee';
};

const MeetingsPage = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const roleBasePath = getRoleBasePath(profile?.role);
    const [meetings, setMeetings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        agenda: '',
        date_time: '',
        duration: 60,
        participants: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [meetingsData, employeesData] = await Promise.all([
                api.get('/meetings'),
                api.get('/employees')
            ]);
            setMeetings(meetingsData || []);
            setEmployees(employeesData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        try {
            await api.post('/meetings', formData);
            setIsModalOpen(false);
            setFormData({ title: '', agenda: '', date_time: '', duration: 60, participants: [] });
            fetchData();
        } catch (error) {
            alert('Failed to schedule meeting');
        }
    };

    const toggleParticipant = (id) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.includes(id)
                ? prev.participants.filter(pId => pId !== id)
                : [...prev.participants, id]
        }));
    };

    return (
        <>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Meetings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Collaborate in real-time with high-definition video conferencing.</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                    style={{ borderRadius: '10px' }}
                >
                    <Plus size={20} />
                    Schedule Meeting
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {loading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px' }}>
                        <Loader2 size={40} className="animate-spin" color="var(--primary)" />
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="card" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '50%', width: 'fit-content', margin: '0 auto 20px' }}>
                            <Video size={48} color="var(--primary)" style={{ opacity: 0.3 }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>No meetings scheduled</h3>
                        <p style={{ marginTop: '8px' }}>Launch a new meeting to start collaborating with your team.</p>
                    </div>
                ) : meetings.map(meeting => (
                    <div key={meeting.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--primary)' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{meeting.title}</h3>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '800',
                                background: '#EEF2FF',
                                color: 'var(--primary)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                marginRight: '4px'
                            }}>{meeting.duration} MIN</span>
                        </div>

                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} /> {new Date(meeting.date_time).toLocaleDateString()} at {new Date(meeting.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        <p style={{ fontSize: '14px', color: 'var(--text-main)', fontStyle: 'italic' }}>&quot;{meeting.agenda}&quot;</p>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                                    <Users size={14} color="var(--primary)" />
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', lineHeight: '1' }}>Host: {meeting.creator_name}</span>
                            </div>

                            <button
                                onClick={() => navigate(`${roleBasePath}/meetings/${meeting.id}`)}
                                className="btn-primary"
                                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', opacity: meeting.status === 'completed' || meeting.status === 'ended' ? 0.5 : 1, pointerEvents: meeting.status === 'completed' || meeting.status === 'ended' ? 'none' : 'auto' }}
                                disabled={meeting.status === 'completed' || meeting.status === 'ended'}
                            >
                                {meeting.status === 'completed' || meeting.status === 'ended' ? 'Meeting Ended' : 'Join Room'}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Schedule Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: '600px', padding: '32px', position: 'relative', border: '1px solid var(--border)' }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', right: '16px', top: '16px', border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={24} />
                        </button>

                        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Schedule Group Meeting</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Organize a virtual session with your teammates.</p>

                        <form onSubmit={handleSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>MEETING TITLE</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-field"
                                        placeholder="e.g. Weekly Sync"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>DATE & TIME</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="input-field"
                                        value={formData.date_time}
                                        onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>MEETING AGENDA</label>
                                <textarea
                                    className="input-field"
                                    rows="3"
                                    placeholder="Briefly describe what will be discussed..."
                                    style={{ resize: 'none' }}
                                    value={formData.agenda}
                                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PARTICIPANTS ({formData.participants.length} SELECT)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', rowGap: '12px', maxHeight: '120px', overflowY: 'auto', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--input-bg)' }}>
                                    {employees.map(emp => (
                                        <div
                                            key={emp.id}
                                            onClick={() => toggleParticipant(emp.id)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                background: formData.participants.includes(emp.id) ? 'var(--primary)' : 'var(--card-bg)',
                                                color: formData.participants.includes(emp.id) ? 'white' : 'var(--text-main)',
                                                border: formData.participants.includes(emp.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {emp.full_name}
                                            {formData.participants.includes(emp.id) && <CheckCircle2 size={12} />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', marginTop: '8px' }}>
                                <Calendar size={20} />
                                Confirm Schedule
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default MeetingsPage;
