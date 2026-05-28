import React from 'react';
import { Database, Info } from 'lucide-react';

const EmptyState = ({
    title = 'No information found',
    message = "There's nothing to display here yet.",
    icon = <Database size={48} />,
    action = null
}) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 40px',
            textAlign: 'center',
            color: 'var(--text-muted)'
        }}>
            <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                color: 'var(--primary)',
                opacity: 0.5
            }}>
                {icon}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>{title}</h3>
            <p style={{ fontSize: '14px', maxWidth: '300px', lineHeight: '1.6' }}>{message}</p>
            {action && <div style={{ marginTop: '24px' }}>{action}</div>}
        </div>
    );
};

export default EmptyState;
