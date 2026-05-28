import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Calendar, UserCheck, Briefcase, Loader2, ClipboardList, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import Announcements from '../components/Dashboard/Announcements';

const EmployeeDashboard = () => {
    const { profile } = useAuth();
    const [stats, setStats] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [onboardingSummary, setOnboardingSummary] = useState(null);
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(true);

    const isBirthday = Boolean(stats?.hasBirthdayToday);
    const isAnniversary = Boolean(stats?.hasWorkAnniversaryToday);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsData, announceData] = await Promise.all([
                    api.get('/employees/dashboard-stats'),
                    api.get('/announcements')
                ]);
                setStats(statsData);
                setAnnouncements(announceData || []);

                try {
                    const shift = await api.get('/shifts/my-current');
                    setCurrentShift(shift || null);
                } catch (shiftErr) {
                    setCurrentShift(null);
                    console.warn('Current shift unavailable', shiftErr);
                }

                try {
                    const summary = await api.get('/onboarding/my-summary');
                    setOnboardingSummary(summary || null);
                } catch (onboardingErr) {
                    // Onboarding may not be assigned yet.
                    setOnboardingSummary(null);
                    console.warn('Onboarding summary unavailable', onboardingErr);
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)' }}>IndusInnovate Employee Portal</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                    Welcome back, {profile?.full_name || profile?.email || 'Employee'}
                </p>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px' }}>
                    Current Shift: {currentShift?.name ? `${currentShift.name} (${String(currentShift.start_time).slice(0, 5)} - ${String(currentShift.end_time).slice(0, 5)})` : 'Not assigned'}
                </p>
            </div>

            {(isBirthday || isAnniversary) && (
                <div
                    className="card"
                    style={{
                        marginBottom: '24px',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(16, 185, 129, 0.08))'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Sparkles size={24} color="#f59e0b" />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>
                                {isBirthday && isAnniversary ? 'Double Celebration Day!' : 'Celebration Day!'}
                            </h3>
                            <p style={{ marginTop: '6px', color: 'var(--text-muted)' }}>
                                {isBirthday && isAnniversary && 'Happy Birthday and Happy Work Anniversary! Wishing you continued success.'}
                                {isBirthday && !isAnniversary && 'Happy Birthday! Wishing you a joyful year ahead.'}
                                {!isBirthday && isAnniversary && 'Happy Work Anniversary! Thank you for your contribution to IndusInnovate.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Attendance Card */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                        <UserCheck size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Monthly Attendance</p>
                        <h2 style={{ fontSize: '24px' }}>{stats?.attendanceCount || 0} Days</h2>
                    </div>
                </div>

                {/* Leaves Card */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px' }}>
                        <Calendar size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Leaves Taken (This Month)</p>
                        <h2 style={{ fontSize: '24px' }}>{stats?.leavesCount || 0} Approved</h2>
                    </div>
                </div>

                {/* Projects Card */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px' }}>
                        <Briefcase size={28} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Active Projects</p>
                        <h2 style={{ fontSize: '24px' }}>{stats?.projects?.length || 0} Assigned</h2>
                    </div>
                </div>

                {/* Onboarding Card */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9', borderRadius: '12px' }}>
                            <ClipboardList size={28} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Onboarding Progress</p>
                            <h2 style={{ fontSize: '24px' }}>{onboardingSummary?.completion_percentage ?? 0}%</h2>
                        </div>
                    </div>
                    <Link to="/employee/onboarding" className="btn-primary" style={{ borderRadius: '8px', textDecoration: 'none' }}>
                        View
                    </Link>
                </div>
            </div>

            <div className="responsive-grid-2-1">
                {/* Current Projects List */}
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Your Current Projects</h3>
                    {stats?.projects?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {stats.projects.map((project, idx) => (
                                <div key={idx} style={{
                                    padding: '16px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>{project.name}</h4>
                                        <span style={{
                                            padding: '4px 8px',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#10b981',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '500'
                                        }}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '14px', fontWeight: '500' }}>{project.progress}%</p>
                                        <div style={{ width: '120px', height: '6px', background: 'var(--border)', borderRadius: '3px', marginTop: '8px' }}>
                                            <div style={{ width: `${project.progress}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No active projects assigned at the moment.</p>
                    )}
                </div>

                {/* Announcements Section */}
                <Announcements announcements={announcements} />
            </div>

            <style>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default EmployeeDashboard;
