import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, Wallet, Settings, FileText } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const HRPayrollPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isHr = location.pathname.startsWith('/hr');
    const basePath = isHr ? '/hr' : '/admin';

    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoading(true);
                const data = await api.get('/employees?scope=all');
                setEmployees(data || []);
            } catch (error) {
                console.error(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wallet size={24} color="var(--primary)" /> Payroll Management
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                    Select an employee to open full payroll details on a dedicated page.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button className="btn-primary" style={{ borderRadius: '8px' }} onClick={() => navigate(`${basePath}/payroll/statutory-settings`)}>
                        <Settings size={16} /> Statutory Settings
                    </button>
                    <button className="btn-primary" style={{ borderRadius: '8px' }} onClick={() => navigate(`${basePath}/payroll/statutory-compliance`)}>
                        <FileText size={16} /> Compliance Report
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            className="input-field"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '36px', width: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading employees...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No employees found.</div>
                    ) : (
                        filteredEmployees.map(emp => (
                            <div
                                key={emp.id}
                                onClick={() => navigate(`${basePath}/payroll/${emp.id}`)}
                                style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <img
                                    src={emp.avatar_url || '/avatar-placeholder.svg'}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/avatar-placeholder.svg';
                                    }}
                                    className="avatar"
                                    style={{ width: '36px', height: '36px' }}
                                />
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '600' }}>{emp.full_name}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.role}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default HRPayrollPage;
