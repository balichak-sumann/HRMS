import React from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const Announcements = ({ announcements = [], onDeleted }) => {
    const { profile } = useAuth();
    const canDelete = ['admin', 'hr'].includes(profile?.role);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/announcements/${id}`);
            toast.success('Announcement deleted');
            if (onDeleted) onDeleted(id);
        } catch (error) {
            toast.error(`Failed to delete announcement: ${error.message}`);
        }
    };

    return (
        <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Announcements</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {announcements.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px', padding: '20px' }}>No new announcements</p>
                ) : (
                    announcements.map((ann) => (
                        <div key={ann.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: '4px', background: 'var(--primary)', borderRadius: '4px' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <img
                                    src={ann.author_avatar || '/avatar-placeholder.svg'}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/avatar-placeholder.svg';
                                    }}
                                    className="avatar"
                                    style={{ width: '32px', height: '32px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: '600', fontSize: '14px' }}>{ann.title}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                                        {ann.content}
                                    </p>
                                </div>
                                {canDelete && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(ann.id)}
                                        title="Delete announcement"
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Announcements;
