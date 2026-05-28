import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Settings, LogOut, ChevronDown, CheckCircle2, AlertCircle, MessageSquare, Video, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const getRoleBasePath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'hr') return '/hr';
    return '/employee';
};

const isNotificationRead = (notification) => {
    const value = notification?.is_read;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1';
    }
    if (typeof value === 'number') return value === 1;
    return Boolean(value);
};

const Navbar = ({ onMenuClick, isMobile }) => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const notificationRef = useRef(null);
    const profileRef = useRef(null);
    const socketRef = useRef(null);

    const unreadCount = notifications.filter((n) => !isNotificationRead(n)).length;
    const visibleNotifications = notifications.filter((n) => !isNotificationRead(n));

    const getNotificationIcon = (type) => {
        const normalized = (type || '').toLowerCase();
        if (normalized.includes('leave') || normalized.includes('approved')) {
            return <CheckCircle2 size={16} color="#10B981" />;
        }
        if (normalized.includes('chat') || normalized.includes('message') || normalized.includes('comment')) {
            return <MessageSquare size={16} color="var(--primary)" />;
        }
        if (normalized.includes('meeting') || normalized.includes('video') || normalized.includes('call')) {
            return <Video size={16} color="#6366F1" />;
        }
        return <AlertCircle size={16} color="#F59E0B" />;
    };

    const formatNotificationTime = (value) => {
        if (!value) return 'Just now';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Just now';

        const diffMs = Date.now() - date.getTime();
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    };

    const fetchNotifications = async () => {
        try {
            const data = await api.get('/notifications');
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err.message);
            setNotifications([]);
        }
    };

    const markAllNotificationsAsRead = async () => {
        if (!notifications.some((n) => !isNotificationRead(n))) return;

        setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
        try {
            await api.patch('/notifications/read', {});
            await fetchNotifications();
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err.message);
            fetchNotifications();
        }
    };

    const markOneNotificationAsRead = async (id) => {
        setNotifications((prev) => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
        try {
            await api.patch(`/notifications/${id}/read`, {});
        } catch (err) {
            console.error('Failed to mark notification as read:', err.message);
            fetchNotifications();
        }
    };

    useEffect(() => {
        if (!profile?.id) return;
        fetchNotifications();
    }, [profile?.id]);

    useEffect(() => {
        if (!profile?.id) return;

        socketRef.current = io({
            path: '/socket.io',
            transports: ['polling', 'websocket'],
        });

        socketRef.current.on('connect', () => {
            socketRef.current.emit('identify', profile.id);
            if (profile?.role === 'hr' || profile?.role === 'admin') {
                socketRef.current.emit('join_room', {
                    roomId: 'hr_helpdesk',
                    userId: profile.employee_uuid,
                    name: profile.full_name || profile.email,
                });
            }
            if (profile?.employee_uuid) {
                socketRef.current.emit('join_room', {
                    roomId: `employee_${profile.employee_uuid}`,
                    userId: profile.employee_uuid,
                    name: profile.full_name || profile.email,
                });
            }
        });

        const pushRealtimeNotification = (payload, fallbackType = 'info') => {
            if (payload?.targetUserId && payload.targetUserId !== profile.employee_uuid) return;

            const item = {
                id: payload?.id || `rt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                title: payload?.title || 'New update',
                message: payload?.message || payload?.subject || 'You have a new notification',
                type: payload?.type || fallbackType,
                is_read: false,
                created_at: payload?.created_at || payload?.timestamp || new Date().toISOString(),
            };

            setNotifications((prev) => {
                // Deduplicate by ID
                if (payload?.id && prev.some(n => n.id === payload.id)) return prev;
                // Deduplicate by content within last 5 seconds
                const fiveSecondsAgo = Date.now() - 5000;
                const isDuplicate = prev.some(n => 
                    n.message === item.message && 
                    new Date(n.created_at).getTime() > fiveSecondsAgo
                );
                if (isDuplicate) return prev;
                return [item, ...prev].slice(0, 50);
            });

            toast(item.message || item.title || 'New notification');
        };

        socketRef.current.on('notification_created', (payload) => {
            pushRealtimeNotification(payload, payload?.type || 'info');
        });

        socketRef.current.on('ticket_created', (payload) => {
            pushRealtimeNotification({
                message: payload?.subject || 'A new helpdesk ticket was created.',
                type: 'helpdesk',
                timestamp: payload?.timestamp,
            }, 'helpdesk');
        });

        socketRef.current.on('comment_added', (payload) => {
            pushRealtimeNotification({
                targetUserId: payload?.targetUserId,
                message: 'New comment added on your helpdesk ticket.',
                type: 'helpdesk',
                timestamp: payload?.timestamp,
            }, 'helpdesk');
        });

        socketRef.current.on('status_changed', (payload) => {
            pushRealtimeNotification({
                targetUserId: payload?.targetUserId,
                message: `Ticket status updated to ${payload?.status || 'updated'}.`,
                type: 'helpdesk',
                timestamp: payload?.timestamp,
            }, 'helpdesk');
        });

        socketRef.current.on('meeting_invite', (payload) => {
            if (payload?.targetUserId && payload.targetUserId !== profile.employee_uuid) return;

            if (!payload?.meetingId) return;

            const startTime = new Date(payload.date_time).getTime();
            const now = Date.now();
            const startsInMs = startTime - now;

            const showPopup = () => {
                const accept = window.confirm(`${payload?.message || 'You have a meeting invite.'}\n\nJoin now?`);
                if (accept) {
                    navigate(`${getRoleBasePath(profile?.role)}/meetings/${payload.meetingId}`);
                }
            };

            // If meeting starts within 5 minutes (or was in the past 15 mins), show now
            if (startsInMs <= 5 * 60 * 1000 && startsInMs >= -15 * 60 * 1000) {
                showPopup();
            } 
            // If meeting starts later today (within 12 hours), schedule the popup
            else if (startsInMs > 0 && startsInMs < 12 * 60 * 60 * 1000) {
                console.log(`[Meeting] Scheduling join popup in ${Math.round(startsInMs / 60000)} minutes`);
                setTimeout(showPopup, startsInMs);
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.off('notification_created');
                socketRef.current.off('ticket_created');
                socketRef.current.off('comment_added');
                socketRef.current.off('status_changed');
                socketRef.current.off('meeting_invite');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [profile?.id, profile?.role, profile?.employee_uuid, profile?.full_name, profile?.email]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div style={{
            height: '58px',
            background: 'var(--navbar-bg)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '0 14px' : '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            width: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                    <button
                        onClick={onMenuClick}
                        style={{
                            border: 'none',
                            background: 'white',
                            cursor: 'pointer',
                            color: 'var(--text-main)',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <MoreHorizontal size={24} />
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Notification Bell */}
                <div ref={notificationRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', position: 'relative', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Bell size={19} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-6px',
                                minWidth: '15px',
                                height: '15px',
                                background: '#EF4444',
                                borderRadius: '999px',
                                border: '2px solid var(--navbar-bg)',
                                color: '#FFFFFF',
                                fontSize: '10px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px'
                            }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="card shadow-lg" style={{
                            position: 'absolute',
                            right: '0',
                            top: '100%',
                            marginTop: '8px',
                            width: '340px',
                            padding: '16px',
                            zIndex: 1000,
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            borderRadius: '16px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--text-main)' }}>Notifications</h4>
                                <button
                                    type="button"
                                    style={{
                                        fontSize: 'var(--font-xs)',
                                        color: 'var(--primary)',
                                        fontWeight: '700',
                                        cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 0,
                                        opacity: unreadCount > 0 ? 1 : 0.6
                                    }}
                                    disabled={unreadCount === 0}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        markAllNotificationsAsRead();
                                    }}
                                >
                                    Mark all as read
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {visibleNotifications.length === 0 ? (
                                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', margin: 0 }}>No unread notifications</p>
                                ) : (
                                    visibleNotifications.map(n => (
                                        <div
                                            key={n.id}
                                            style={{
                                                display: 'flex',
                                                gap: '12px',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                cursor: 'default',
                                                transition: 'all 0.2s',
                                                opacity: isNotificationRead(n) ? 0.75 : 1
                                            }}
                                            className="hover-bg"
                                        >
                                            <div style={{ marginTop: '2px' }}>{getNotificationIcon(n.type)}</div>
                                            <div>
                                                <p style={{
                                                    fontSize: 'var(--font-sm)',
                                                    color: 'var(--text-main)',
                                                    lineHeight: '1.4',
                                                    fontWeight: isNotificationRead(n) ? '500' : '700',
                                                    margin: 0
                                                }}>
                                                    {n.message || n.title}
                                                </p>
                                                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                                    {formatNotificationTime(n.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Toggle */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <div
                        onClick={() => setShowProfile(!showProfile)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '3px 6px', borderRadius: '10px' }}
                        className="hover-bg"
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--input-bg)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700'
                        }}>
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div style={{ display: 'none', md: 'block' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '-2px' }}>{profile?.full_name}</p>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>{profile?.role}</p>
                        </div>
                        <ChevronDown size={12} color="var(--text-muted)" />
                    </div>

                    {showProfile && (
                        <div className="card shadow-lg" style={{
                            position: 'absolute',
                            right: 0,
                            top: '50px',
                            width: '200px',
                            padding: '8px',
                            zIndex: 1000,
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)'
                        }}>
                            <button
                                onClick={() => {
                                    setShowProfile(false);
                                    navigate(profile?.role === 'admin' ? '/admin/profile' : profile?.role === 'hr' ? '/hr/profile' : '/employee/profile');
                                }}
                                className="dropdown-item"
                            >
                                <User size={16} />
                                View Profile
                            </button>
                            <button
                                onClick={() => navigate(profile?.role === 'admin' ? '/admin/settings' : profile?.role === 'hr' ? '/hr/settings' : '/employee/settings')}
                                className="dropdown-item"
                            >
                                <Settings size={16} />
                                Settings
                            </button>
                            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                            <button onClick={signOut} className="dropdown-item" style={{ color: '#EF4444' }}>
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .hover-bg:hover { background: var(--input-bg); }
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 10px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: var(--font-md);
                    color: var(--text-main);
                    border-radius: 6px;
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .dropdown-item:hover { background: var(--input-bg); color: var(--primary); }
                .shadow-lg { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }
            `}</style>
        </div>
    );
};

export default Navbar;
