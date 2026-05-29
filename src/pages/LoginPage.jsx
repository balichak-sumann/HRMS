import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader2, Eye, EyeOff, Shield, User } from 'lucide-react';

const SLIDES = Array.from({ length: 9 }, (_, i) => `/login-slides/slide-${i + 1}.png`);

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
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setActiveSlide(s => (s + 1) % SLIDES.length), 3000);
        return () => clearInterval(timer);
    }, []);
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
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#000',
            position: 'relative',
            gap: '0px',
        }}>
            {/* Full-page background image with low opacity */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url(/login-bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3,
                pointerEvents: 'none',
            }} />
            {/* Left — Storytelling Carousel */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: 'transparent',
                zIndex: 1,
            }}>
                {SLIDES.map((src, i) => (
                    <img
                        key={i}
                        src={src}
                        alt=""
                        style={{
                            position: 'absolute',
                            maxWidth: '85%',
                            maxHeight: '85%',
                            objectFit: 'contain',
                            right: '-5%',
                            opacity: activeSlide === i ? 1 : 0,
                            transform: activeSlide === i ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
                            transition: 'opacity 0.8s ease, transform 1s ease',
                        }}
                    />
                ))}
            </div>

            {/* Right — Login Form */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '20px',
                paddingRight: '40px',
                position: 'relative',
                zIndex: 1,
            }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
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
                    color: '#f1f5f9',
                    marginTop: '0',
                    marginBottom: '24px'
                }}>Welcome Back</h2>

                {/* Tab Selector */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(30,41,59,0.5)',
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
                            background: role === 'admin' ? 'rgba(15,23,42,0.8)' : 'transparent',
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
                            background: role === 'employee' ? 'rgba(15,23,42,0.8)' : 'transparent',
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
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                                pointerEvents: 'none',
                                zIndex: 1,
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
                                    paddingLeft: '48px',
                                    paddingRight: '12px',
                                    paddingTop: '12px',
                                    paddingBottom: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(148,163,184,0.3)',
                                    outline: 'none',
                                    fontSize: '14px',
                                    background: 'rgba(30,41,59,0.6)', color: '#f1f5f9'
                                }}
                            />
                        </div>
                    </div>

                    {!otpStep && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>Password</label>
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
                                <Lock size={16} style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9CA3AF',
                                    pointerEvents: 'none',
                                    zIndex: 1,
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
                                        paddingLeft: '48px',
                                        paddingRight: '44px',
                                        paddingTop: '12px',
                                        paddingBottom: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(148,163,184,0.3)',
                                        outline: 'none',
                                        fontSize: '14px',
                                        background: 'rgba(30,41,59,0.6)',
                                        color: '#f1f5f9'
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
                                        color: '#94a3b8',
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
                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>Enter OTP</label>
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
                                    border: '1px solid rgba(148,163,184,0.3)',
                                    outline: 'none',
                                    fontSize: '16px',
                                    letterSpacing: '4px',
                                    textAlign: 'center',
                                    background: 'rgba(30,41,59,0.6)',
                                    color: '#f1f5f9'
                                }}
                            />
                            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
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
        </div>
    );
};

export default LoginPage;
