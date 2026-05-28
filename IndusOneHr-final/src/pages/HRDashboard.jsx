import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import KPICard from '../components/Dashboard/KPICard';
import AttendanceChart from '../components/Dashboard/AttendanceChart';
import LeaveRequests from '../components/Dashboard/LeaveRequests';
import UpcomingBirthdays from '../components/Dashboard/UpcomingBirthdays';
import Announcements from '../components/Dashboard/Announcements';
import TodaysCelebrations from '../components/Dashboard/TodaysCelebrations';
import { Users, UserPlus, FileText, Gift, Loader2 } from 'lucide-react';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const HRDashboard = () => {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        newEmployees: 0,
        activeLeaves: 0,
        upcomingBirthdaysCount: 0
    });
    const [deptData, setDeptData] = useState([]);
    const [birthdays, setBirthdays] = useState([]);
    const [todaysCelebrations, setTodaysCelebrations] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleAnnouncementDeleted = (id) => {
        setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [analyticsData, announceData] = await Promise.all([
                    api.get('/analytics'),
                    api.get('/announcements')
                ]);
                setStats({
                    totalEmployees: analyticsData.headcount || 0,
                    newEmployees: analyticsData.newEmployeesCount || 0,
                    activeLeaves: analyticsData.activeLeaves || 0,
                    upcomingBirthdaysCount: (analyticsData.upcomingBirthdays || []).length
                });
                setDeptData(analyticsData.deptData || []);
                setBirthdays(analyticsData.upcomingBirthdays || []);
                setTodaysCelebrations(analyticsData.todaysCelebrations || []);
                setLeaves(analyticsData.recentLeaves || []);
                setAnnouncements(announceData || []);
            } catch (error) {
                console.error('Dashboard fetch failed:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '24px', color: 'var(--text-main)' }}>HR Dashboard</h1>
                </div>
                <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="dashboard-grid">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </>
        );
    }
    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)' }}>HR Dashboard</h1>
            </div>

            <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
                <KPICard
                    title="Total Employees"
                    value={stats.totalEmployees.toString()}
                    icon={<Users size={24} />}
                    color="#3B82F6"
                />
                <KPICard
                    title="New Employees"
                    value={stats.newEmployees.toString()}
                    icon={<UserPlus size={24} />}
                    color="#F59E0B"
                />
                <KPICard
                    title="Active Leave Requests"
                    value={stats.activeLeaves.toString()}
                    icon={<FileText size={24} />}
                    color="#3B82F6"
                />
                <KPICard
                    title="Upcoming Birthdays"
                    value={stats.upcomingBirthdaysCount.toString()}
                    icon={<Gift size={24} />}
                    color="#F59E0B"
                />
            </div>

            <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <AttendanceChart data={deptData} />
                    <div className="responsive-grid-2">
                        <UpcomingBirthdays birthdays={birthdays} />
                        <Announcements announcements={announcements} onDeleted={handleAnnouncementDeleted} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <LeaveRequests requests={leaves} />
                    <TodaysCelebrations
                        items={todaysCelebrations}
                        onSent={() => {
                            // keep UX simple; no extra state for now
                        }}
                    />
                </div>
            </div>
        </>
    );
};

export default HRDashboard;
