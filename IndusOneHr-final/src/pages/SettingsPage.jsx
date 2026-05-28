import React, { useState } from 'react';
import { Bell, Moon, Sun, Monitor, Type, Save, Globe, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Notification State
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        updates: false,
        reminders: true
    });

    // Appearance State
    const [appearance, setAppearance] = useState({
        theme: localStorage.getItem('theme') || 'light',
        fontSize: localStorage.getItem('fontSize') || 'medium',
        highContrast: false
    });

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', appearance.theme);
        localStorage.setItem('theme', appearance.theme);
    }, [appearance.theme]);

    React.useEffect(() => {
        document.documentElement.setAttribute('data-font-size', appearance.fontSize);
        localStorage.setItem('fontSize', appearance.fontSize);
    }, [appearance.fontSize]);

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        // Simulate API call for generic settings
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Settings saved successfully!');
        setLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error('New passwords do not match');
            return;
        }
        if (passwords.new.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }

        setPasswordLoading(true);
        try {
            await api.post('/auth/change-password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            toast.success('Password changed successfully!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const Toggle = ({ active, onToggle, label }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>{label}</span>
            <button
                onClick={onToggle}
                style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: active ? 'var(--primary)' : 'var(--border)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                }}
            >
                <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--card-bg)',
                    position: 'absolute',
                    top: '3px',
                    left: active ? '23px' : '3px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }} />
            </button>
        </div>
    );

    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Settings</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage your account preferences and application settings.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Security Section */}
                <section className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'var(--input-bg)', borderRadius: '8px', color: 'var(--status-rejected-text)' }}>
                            <Shield size={20} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Security</h2>
                    </div>

                    <form onSubmit={handlePasswordChange} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'grid', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Current Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    required
                                    value={passwords.current}
                                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    required
                                    value={passwords.new}
                                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    required
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={passwordLoading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 24px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                    opacity: passwordLoading ? 0.7 : 1,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Notifications Section */}
                <section className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'var(--input-bg)', borderRadius: '8px', color: '#6366F1' }}>
                            <Bell size={20} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Notifications</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)' }}>
                        <Toggle
                            label="Email Notifications"
                            active={notifications.email}
                            onToggle={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                        />
                        <Toggle
                            label="Push Notifications"
                            active={notifications.push}
                            onToggle={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
                        />
                        <Toggle
                            label="Platform Updates"
                            active={notifications.updates}
                            onToggle={() => setNotifications(prev => ({ ...prev, updates: !prev.updates }))}
                        />
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'var(--input-bg)', borderRadius: '8px', color: '#F97316' }}>
                            <Sun size={20} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Appearance</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                        {/* Theme Selection */}
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Interface Theme</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {[
                                    { id: 'light', icon: <Sun size={16} />, label: 'Light' },
                                    { id: 'dark', icon: <Moon size={16} />, label: 'Dark' },
                                    { id: 'system', icon: <Monitor size={16} />, label: 'System' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setAppearance(prev => ({ ...prev, theme: t.id }))}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: appearance.theme === t.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: appearance.theme === t.id ? 'var(--input-bg)' : 'var(--card-bg)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ color: appearance.theme === t.id ? 'var(--primary)' : 'var(--text-muted)' }}>{t.icon}</div>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: appearance.theme === t.id ? 'var(--primary)' : 'var(--text-main)' }}>{t.label}</span>
                                        {t.id === 'system' && appearance.theme === 'system' && (
                                            <span style={{
                                                fontSize: '10px',
                                                marginTop: '-4px',
                                                color: 'var(--text-muted)',
                                                fontWeight: '500'
                                            }}>
                                                Currently: {isSystemDark ? 'Dark' : 'Light'}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font Size Selection */}
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Font Size</p>
                            <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '10px' }}>
                                {['Small', 'Medium', 'Large'].map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setAppearance(prev => ({ ...prev, fontSize: size.toLowerCase() }))}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: appearance.fontSize === size.toLowerCase() ? 'var(--card-bg)' : 'transparent',
                                            color: appearance.fontSize === size.toLowerCase() ? 'var(--text-main)' : 'var(--text-muted)',
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            boxShadow: appearance.fontSize === size.toLowerCase() ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 32px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '15px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                        }}
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                .card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
            `}</style>
        </div>
    );
};

export default SettingsPage;
