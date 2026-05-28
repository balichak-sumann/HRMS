import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const IDCard = ({ employee, idRef }) => {
    if (!employee) return null;

    const displayEmployeeId = employee.employee_id || employee.employeeId || employee.EmployeeID || null;

    const qrPayload = [
        `Name: ${employee.full_name || ''}`,
        `Email: ${employee.email || ''}`,
        `ID: ${displayEmployeeId || employee.id || ''}`
    ].join('\n');

    return (
        <div
            ref={idRef}
            id="digital-id-card"
            style={{
                width: '320px',
                height: '500px',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                borderRadius: '20px',
                padding: '24px',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Inter', sans-serif"
            }}
        >
            {/* Background Decorative Elements */}
            <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '150px',
                height: '150px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-30px',
                left: '-30px',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
            }}></div>

            {/* Header: Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', zIndex: 1 }}>
                <img src="/logo.png" alt="Company Logo" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
                <div className="brand-lockup">
                    <span className="brand-name-animated" style={{ fontSize: '15px', fontWeight: '800' }}>IndusInnovate</span>
                    <span className="brand-name-animated-subline" style={{ fontSize: '9px', fontWeight: '500' }}>Technologies Pvt. Ltd.</span>
                </div>
            </div>

            {/* Photo */}
            <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                padding: '4px',
                marginBottom: '20px',
                zIndex: 1
            }}>
                <img
                    src={employee.avatar_url ? (employee.avatar_url.startsWith('http') ? employee.avatar_url : `${employee.avatar_url}`) : '/avatar-placeholder.svg'}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/avatar-placeholder.svg';
                    }}
                    alt={employee.full_name}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)'
                    }}
                />
            </div>

            {/* Details */}
            <div style={{ textAlign: 'center', marginBottom: '24px', zIndex: 1, width: '100%' }}>
                <h2 style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                }}>{employee.full_name}</h2>
                <p style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    {employee.role}
                </p>

                <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '10px', opacity: 0.7, fontWeight: '700' }}>EMPLOYEE ID</p>
                        <p style={{ fontSize: '13px', fontWeight: '600' }}>{displayEmployeeId || `#${employee.id?.slice(0, 8).toUpperCase()}`}</p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '10px', opacity: 0.7, fontWeight: '700' }}>DEPARTMENT</p>
                        <p style={{ fontSize: '13px', fontWeight: '600' }}>{employee.department}</p>
                    </div>
                </div>
            </div>

            {/* Footer: QR Code */}
            <div style={{
                marginTop: 'auto',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                padding: '12px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 1,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <QRCodeSVG
                    value={qrPayload || 'VALIDATION_QR'}
                    size={80}
                    level="H"
                    includeMargin={false}
                />
                <p style={{ color: '#1E3A8A', fontSize: '9px', fontWeight: '700', letterSpacing: '0.5px' }}>IDENTITY VERIFIED</p>
            </div>
        </div>
    );
};

export default IDCard;
