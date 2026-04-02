import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader2, Eye, EyeOff, Shield, User } from 'lucide-react';

const LoginPage = () => {
    const [role, setRole] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { login, user, profile } = useAuth();

    React.useEffect(() => {
        if (user && profile) {
            if (profile.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (profile.role === 'hr') {
                navigate('/hr/dashboard');
            } else {
                navigate('/employee/dashboard');
            }
        }
    }, [user, profile, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Invalid email address');
            setLoading(false);
            return;
        }

        try {
            const expectedRole = role === 'admin'
                ? ['admin', 'hr']
                : ['employee'];

            const data = await login(email, password, {
                allowedRoles: expectedRole,
                selectedRole: role,
            });

            if (data.user.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (data.user.role === 'hr') {
                navigate('/hr/dashboard');
            } else {
                navigate('/employee/dashboard');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--main-bg)',
            padding: '24px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: 'var(--card-bg)',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                padding: '40px'
            }}>
                {/* Logo Section */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '32px'
                }}>
                    <img src="/logo.png" alt="Company Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
                    <div className="brand-lockup" style={{ textAlign: 'left' }}>
                        <span className="brand-name-animated" style={{ fontSize: '26px', fontWeight: '800' }}>IndusInnovate</span>
                        <span className="brand-name-animated-subline" style={{ fontSize: '13px', fontWeight: '500' }}>Technologies Pvt. Ltd.</span>
                    </div>
                </div>

                <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    textAlign: 'center',
                    color: 'var(--text-main)',
                    marginBottom: '24px'
                }}>Welcome Back</h2>

                {/* Tab Selector */}
                <div style={{
                    display: 'flex',
                    background: 'var(--input-bg)',
                    padding: '4px',
                    borderRadius: '8px',
                    marginBottom: '24px'
                }}>
                    <button
                        onClick={() => setRole('admin')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: role === 'admin' ? '700' : '500',
                            cursor: 'pointer',
                            background: role === 'admin' ? 'var(--card-bg)' : 'transparent',
                            color: role === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
                            boxShadow: role === 'admin' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            borderBottom: role === 'admin' ? '2px solid var(--primary)' : '2px solid transparent'
                        }}
                    >
                        <Shield size={16} />
                        Admin Login
                    </button>
                    <button
                        onClick={() => setRole('employee')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: role === 'employee' ? '700' : '500',
                            cursor: 'pointer',
                            background: role === 'employee' ? 'var(--card-bg)' : 'transparent',
                            color: role === 'employee' ? 'var(--primary)' : 'var(--text-muted)',
                            boxShadow: role === 'employee' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            borderBottom: role === 'employee' ? '2px solid var(--primary)' : '2px solid transparent'
                        }}
                    >
                        <User size={16} />
                        Employee Login
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    paddingRight: '12px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    outline: 'none',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Password</label>
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    padding: '0'
                                }}
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    paddingRight: '44px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    outline: 'none',
                                    fontSize: '14px'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                title={showPassword ? 'Hide password' : 'Show password'}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--status-rejected-text)',
                            background: 'var(--status-rejected-bg)',
                            padding: '10px',
                            borderRadius: '6px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'opacity 0.2s',
                            marginTop: '8px'
                        }}
                    >
                        {loading && <Loader2 size={20} className="animate-spin" />}
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
