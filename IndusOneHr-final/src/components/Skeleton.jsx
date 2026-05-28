import React from 'react';

const Skeleton = ({ width, height, borderRadius = '8px', marginBottom = '0', className = '' }) => {
    return (
        <div
            className={`skeleton-loader ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius,
                marginBottom,
                background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-loading 1.5s infinite'
            }}
        />
    );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array(rows).fill(0).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px' }}>
                {Array(cols).fill(0).map((_, j) => (
                    <Skeleton key={j} height="24px" width={j === 0 ? '40px' : '1fr'} />
                ))}
            </div>
        ))}
    </div>
);

export const CardSkeleton = () => (
    <div className="card" style={{ padding: '24px' }}>
        <Skeleton width="40px" height="40px" borderRadius="12px" marginBottom="16px" />
        <Skeleton width="60%" height="20px" marginBottom="12px" />
        <Skeleton width="40%" height="16px" />
    </div>
);

export default Skeleton;
