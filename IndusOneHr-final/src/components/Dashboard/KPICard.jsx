import React from 'react';

const KPICard = ({ title, value, icon, color }) => {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color
            }}>
                {icon}
            </div>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>{title}</p>
                <h3 style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>{value}</h3>
            </div>
        </div>
    );
};

export default KPICard;
