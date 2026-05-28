import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err) {
            setError(err.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main-bg)', padding: '24px' }}>
                <div style={{ width: '100%', maxWidth: '440px', background: 'var(--card-bg)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '40px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--status-approved-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--status-approved-text)' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>Check your email</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.5' }}>
                        We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
                    </p>
                    <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                        <ArrowLeft size={18} /> Back to Login
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
                        <img src="/logo.png" alt="Company Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
                        <div className="brand-lockup" style={{ textAlign: 'left' }}>
                            <span className="brand-name-animated" style={{ fontSize: '26px', fontWeight: '800' }}>IndusInnovate</span>
                            <span className="brand-name-animated-subline" style={{ fontSize: '13px', fontWeight: '500' }}>Technologies Pvt. Ltd.</span>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>Reset Password</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ fontSize: '13px', color: 'var(--status-rejected-text)', background: 'var(--status-rejected-bg)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                    >
                        {loading && <Loader2 size={20} className="animate-spin" />}
                        {loading ? 'Sending link...' : 'Send Reset Link'}
                    </button>

                    <Link to="/login" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </form>
            </div>
            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ForgotPasswordPage;
