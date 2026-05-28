import React, { useMemo, useState } from 'react';
import { Gift, Briefcase, Send } from 'lucide-react';
import { api } from '../../lib/api';

const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px'
};

const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(59,130,246,0.08)',
    color: '#2563eb'
};

const typeLabel = (type) => (type === 'birthday' ? 'Birthday' : 'Work Anniversary');

const celebrationIcon = (type) => {
    if (type === 'birthday') return <Gift size={14} />;
    return <Briefcase size={14} />;
};

const defaultMessage = (item) => {
    if (item.celebration_type === 'birthday') {
        return `Happy Birthday, ${item.full_name}! Wishing you a great year ahead.`;
    }
    return `Happy ${item.years_count}${item.years_count === 1 ? 'st' : 'th'} work anniversary, ${item.full_name}! Thank you for your contribution.`;
};

const TodaysCelebrations = ({ items = [], onSent }) => {
    const [sendingFor, setSendingFor] = useState(null);
    const [drafts, setDrafts] = useState({});

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => a.full_name.localeCompare(b.full_name));
    }, [items]);

    const handleSend = async (item) => {
        const draft = (drafts[item.id] || '').trim();
        const payload = draft || defaultMessage(item);

        try {
            setSendingFor(item.id);
            await api.post(`/analytics/celebrations/${item.id}/message`, { message: payload });
            if (onSent) onSent(item.id);
        } catch (err) {
            console.error('Failed to send celebration message:', err);
            alert('Unable to send message right now.');
        } finally {
            setSendingFor(null);
        }
    };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Today's Celebrations</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sorted.length} total</span>
            </div>

            {sorted.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>No birthdays or work anniversaries today.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sorted.map((item) => (
                        <div key={`${item.id}-${item.celebration_type}`} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{item.full_name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.role} • {item.department || 'Team'}</div>
                                </div>
                                <span style={chipStyle}>
                                    {celebrationIcon(item.celebration_type)}
                                    {typeLabel(item.celebration_type)}
                                </span>
                            </div>

                            <textarea
                                rows={2}
                                placeholder="Add a personalized message (optional)"
                                value={drafts[item.id] || ''}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                style={{
                                    width: '100%',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)',
                                    padding: '8px',
                                    resize: 'vertical',
                                    marginBottom: '8px'
                                }}
                            />

                            <button
                                onClick={() => handleSend(item)}
                                disabled={sendingFor === item.id}
                                className="btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                            >
                                <Send size={14} />
                                {sendingFor === item.id ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TodaysCelebrations;
