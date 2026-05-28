import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    MessageSquare,
    Plus,
    Send,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Paperclip
} from 'lucide-react';

const EmployeeComplaintsPage = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        category: '',
        description: '',
        attachment_url: ''
    });
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchComplaints();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await api.get('/lookups?category=COMPLAINT_CATEGORY').catch(() => []);
            setCategories(data || []);
            if (data?.[0]) {
                setFormData(prev => ({ ...prev, category: data[0].value }));
            }
        } catch (e) { }
    };

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await api.get('/complaints');
            setComplaints(data || []);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/complaints', formData);
            alert('Your concern has been submitted successfully.');
            setFormData({ category: categories?.[0]?.value || '', description: '', attachment_url: '' });
            fetchComplaints();
        } catch (error) {
            alert(error.message || 'Failed to submit complaint');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Resolved': return <CheckCircle2 size={16} color="#10B981" />;
            case 'In-Review': return <Clock size={16} color="#F59E0B" />;
            default: return <AlertCircle size={16} color="#3B82F6" />;
        }
    };

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)', fontWeight: '700' }}>Complaint Box</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Raise your concerns securely and track their resolution status.</p>
            </div>

            <div className="responsive-grid-2-1" style={{ alignItems: 'start' }}>
                {/* Form Section */}
                <div className="card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '8px', background: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}>
                            <Plus size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Submit New Concern</h3>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>CATEGORY</label>
                            <select
                                className="input-field"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.value}>{cat.value}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>DESCRIPTION</label>
                            <textarea
                                className="input-field"
                                rows="5"
                                placeholder="Describe your concern in detail..."
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#64748B' }}>ATTACHMENT (OPTIONAL LINK)</label>
                            <div style={{ position: 'relative' }}>
                                <Paperclip size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Paste URL to document or screenshot..."
                                    style={{ paddingLeft: '40px' }}
                                    value={formData.attachment_url}
                                    onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary"
                            style={{ padding: '14px', borderRadius: '12px', fontWeight: '700' }}
                        >
                            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            {submitting ? 'Submitting Signal...' : 'Submit Complaint'}
                        </button>
                    </form>
                </div>

                {/* History Section */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Submission History</h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: '#F1F5F9', padding: '4px 8px', borderRadius: '4px' }}>
                            {complaints.length} Records
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" color="var(--primary)" /></div>
                        ) : complaints.length === 0 ? (
                            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <MessageSquare size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                <p>No complaints submitted yet.</p>
                            </div>
                        ) : complaints.map(c => (
                            <div key={c.id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${c.status === 'Resolved' ? '#10B981' : c.status === 'In-Review' ? '#F59E0B' : '#3B82F6'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: '#F1F5F9',
                                        color: '#475569',
                                        textTransform: 'uppercase'
                                    }}>
                                        {c.category}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700' }}>
                                        {getStatusIcon(c.status)}
                                        {c.status}
                                    </div>
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '12px', lineHeight: '1.5' }}>
                                    {c.description.length > 100 ? `${c.description.substring(0, 100)}...` : c.description}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default EmployeeComplaintsPage;
