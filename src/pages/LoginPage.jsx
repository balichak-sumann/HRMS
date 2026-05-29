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
    const [otpStep, setOtpStep] = useState(false);
    const [otp, setOtp] = useState('');
    const [preAuthToken, setPreAuthToken] = useState('');
    const [otpHint, setOtpHint] = useState('');
    const navigate = useNavigate();
    const { login, verifyLoginOtp, user, profile } = useAuth();

    const navigateAfterLogin = (loggedInUser) => {
        if (loggedInUser?.is_first_login) {
            if (loggedInUser.role === 'admin') {
                navigate('/admin/settings');
            } else if (loggedInUser.role === 'hr') {
                navigate('/hr/settings');
            } else {
                navigate('/employee/settings');
            }
            return;
        }

        if (loggedInUser.role === 'admin') {
            navigate('/admin/dashboard');
        } else if (loggedInUser.role === 'hr') {
            navigate('/hr/dashboard');
        } else {
            navigate('/employee/dashboard');
        }
    };

    React.useEffect(() => {
        if (user && profile) {
            navigateAfterLogin(profile);
        }
    }, [user, profile]);

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
            const expectedRole = role === 'admin' ? ['admin', 'hr'] : ['employee'];

            if (!otpStep) {
                const data = await login(email, password, {
                    allowedRoles: expectedRole,
                    selectedRole: role,
                });

                if (data?.requiresOtp) {
                    setPreAuthToken(data.pre_auth_token || '');
                    setOtpStep(true);
                    setOtp('');
                    setOtpHint(data.message || 'OTP sent to your email');
                    return;
                }

                navigateAfterLogin(data.user);
                return;
            }

            const data = await verifyLoginOtp({
                otp,
                preAuthToken,
                selectedRole: role,
                allowedRoles: expectedRole,
            });

            navigateAfterLogin(data.user);
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
                    height: '84px',
                    overflow: 'hidden',
                    marginBottom: '10px'
                }}>
                    <img
                        src="/login.png"
                        alt="Company Logo"
                        style={{
                            height: '150px',
                            width: 'auto',
                            objectFit: 'contain',
                            transform: 'scale(1.18)',
                            display: 'block'
                        }}
                    />
                </div>

                <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    textAlign: 'center',
                    color: 'var(--text-main)',
                    marginTop: '0',
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
                                disabled={otpStep}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    paddingLeft: '42px',
                                    paddingRight: '12px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    outline: 'none',
                                    fontSize: '14px',
                                    background: otpStep ? '#f8fafc' : 'white'
                                }}
                            />
                        </div>
                    </div>

                    {!otpStep && (
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
                                    className="login-password-input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        paddingLeft: '42px',
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
                    )}

                    {otpStep && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Enter OTP</label>
                            <input
                                type="text"
                                placeholder="6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                maxLength={6}
                                inputMode="numeric"
                                style={{
                                    width: '100%',
                                    paddingLeft: '12px',
                                    paddingRight: '12px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    outline: 'none',
                                    fontSize: '16px',
                                    letterSpacing: '4px',
                                    textAlign: 'center'
                                }}
                            />
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                {otpHint || 'We sent a one-time password to your email.'}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setOtpStep(false);
                                    setOtp('');
                                    setPreAuthToken('');
                                    setOtpHint('');
                                    setError(null);
                                }}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Back to password login
                            </button>
                        </div>
                    )}

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
                        {loading ? (otpStep ? 'Verifying OTP...' : 'Signing in...') : (otpStep ? 'Verify OTP' : 'Sign In')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
