import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkToken = async () => {
            if (!token) {
                setError('Invalid or missing reset token.');
                return;
            }
            try {
                await api.get(`/auth/verify-reset-token/${token}`);
            } catch (err) {
                setError(err.message || 'Reset link is invalid or has expired.');
            }
        };
        checkToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/reset-password', { token, new_password: password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main-bg)', padding: '24px' }}>
                <div style={{ width: '100%', maxWidth: '440px', background: 'var(--card-bg)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '40px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--status-approved-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--status-approved-text)' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>Password Reset!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                        Your password has been successfully updated. Redirecting to login...
                    </p>
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                        Click here if not redirected
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main-bg)', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '440px', background: 'var(--card-bg)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                        <img src="/logo.png" alt="Company Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                        <div className="brand-lockup" style={{ textAlign: 'left' }}>
                            <span className="brand-name-animated" style={{ fontSize: '26px', fontWeight: '800' }}>IndusInnovate</span>
                            <span className="brand-name-animated-subline" style={{ fontSize: '13px', fontWeight: '500' }}>Technologies Pvt. Ltd.</span>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>Set New Password</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                        Please enter your new secure password below.
                    </p>
                </div>

                {error && !token && (
                    <div style={{ textAlign: 'center', color: 'var(--status-rejected-text)', background: 'var(--status-rejected-bg)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                        <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
                        <p>{error}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            <Link to="/login" style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '600' }}>Back to Login</Link>
                            <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '600' }}>Request New Reset Link</Link>
                        </div>
                    </div>
                )}

                {(!error || token) && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Confirm New Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ fontSize: '13px', color: 'var(--status-rejected-text)', background: 'var(--status-rejected-bg)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 8px 0' }}>{error}</p>
                                {error.includes('expired') && (
                                    <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '600', display: 'block' }}>Request a new reset link</Link>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !token}
                            style={{ width: '100%', background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: (loading || !token) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                        >
                            {loading && <Loader2 size={20} className="animate-spin" />}
                            {loading ? 'Updating...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ResetPasswordPage;
