import React from 'react';

const LeaveRequests = ({ requests = [] }) => {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px' }}>Leave Requests</h3>
                <a href="/hr/leaves" style={{ fontSize: '14px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>View All</a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px', padding: '20px' }}>No recent requests</p>
                ) : (
                    requests.map((req) => (
                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={req.avatar || '/avatar-placeholder.svg'}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/avatar-placeholder.svg';
                                    }}
                                    alt={req.name}
                                    className="avatar"
                                />
                                <div>
                                    <p style={{ fontWeight: '600', fontSize: '14px' }}>{req.name}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{req.type}</p>
                                </div>
                            </div>
                            <span className={`status-badge ${req.status?.toLowerCase()}`}>
                                {req.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeaveRequests;
