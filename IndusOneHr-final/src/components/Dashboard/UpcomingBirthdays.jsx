import React from 'react';
import { Cake } from 'lucide-react';

const UpcomingBirthdays = ({ birthdays = [] }) => {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px' }}>Upcoming Birthdays</h3>
                <Cake size={18} style={{ color: 'var(--text-muted)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {birthdays.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px', padding: '20px' }}>No birthdays this month</p>
                ) : (
                    birthdays.map((person, index) => (
                        <div key={person.id || `${person.name || 'employee'}-${person.date || 'unknown'}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={person.avatar || '/avatar-placeholder.svg'}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/avatar-placeholder.svg';
                                    }}
                                    alt={person.name}
                                    className="avatar"
                                />
                                <div>
                                    <p style={{ fontWeight: '600', fontSize: '14px' }}>{person.name}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{person.role}</p>
                                </div>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{person.date}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UpcomingBirthdays;
