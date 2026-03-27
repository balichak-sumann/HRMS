import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    Filter,
    MoreVertical,
    Shield,
    User,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Loader2
} from 'lucide-react';

const HRComplaintsPage = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchComplaints();
    }, [statusFilter, categoryFilter]);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/complaints?status=${statusFilter}&category=${categoryFilter}`);
            setComplaints(data || []);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await api.patch(`/complaints/${id}`, { status: newStatus });
            fetchComplaints();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const filteredComplaints = complaints.filter(c =>
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.submitted_by.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '28px', color: 'var(--text-main)', fontWeight: '700' }}>Complaints</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>Review and resolve employee concerns and ethical reports.</p>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>STATUS</span>
                        <select
                            className="select-field"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Open">Open</option>
                            <option value="In-Review">In-Review</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>CATEGORY</span>
                        <select
                            className="select-field"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="All">All Categories</option>
                            <option value="HR">HR</option>
                            <option value="Harassment">Harassment</option>
                            <option value="Workload">Workload</option>
                            <option value="Technical">Technical</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by description or applicant..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                outline: 'none',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applicant</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Concern & Category</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '48px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : filteredComplaints.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No reports found.</td></tr>
                            ) : filteredComplaints.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {c.is_anonymous ? (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Shield size={16} color="#64748B" />
                                                </div>
                                            ) : (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={16} color="var(--primary)" />
                                                </div>
                                            )}
                                            <div>
                                                <p style={{ fontWeight: '700', fontSize: '14px', color: c.is_anonymous ? '#64748B' : 'var(--text-main)' }}>
                                                    {c.submitted_by}
                                                </p>
                                                {!c.is_anonymous && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.department}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', maxWidth: '400px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 6px', background: '#F1F5F9', borderRadius: '4px', color: '#475569' }}>
                                                {c.category}
                                            </span>
                                            {c.attachment_url && (
                                                <a href={c.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.4' }}>{c.description}</p>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            color: c.status === 'Resolved' ? '#10B981' : c.status === 'In-Review' ? '#F59E0B' : '#3B82F6'
                                        }}>
                                            {c.status === 'Resolved' ? <CheckCircle2 size={14} /> : c.status === 'In-Review' ? <Clock size={14} /> : <Clock size={14} />}
                                            {c.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            {c.status !== 'In-Review' && c.status !== 'Resolved' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(c.id, 'In-Review')}
                                                    style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FFEDD5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Investigate
                                                </button>
                                            )}
                                            {c.status !== 'Resolved' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(c.id, 'Resolved')}
                                                    style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #D1FAE5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default HRComplaintsPage;
