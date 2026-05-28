import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Shield, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const defaultForm = {
    full_name: '',
    email: '',
    role: 'HR Manager',
    phone: '',
    joining_date: '',
    salary: '',
    department_id: '',
    location: ''
};

const AdminManagementPage = () => {
    const { profile } = useAuth();
    const [form, setForm] = useState(defaultForm);
    const [loading, setLoading] = useState(false);
    const [hrUsers, setHrUsers] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [hrRoleOptions, setHrRoleOptions] = useState([]);

    const isAdmin = profile?.role === 'admin';

    const sortedHrUsers = useMemo(
        () => [...hrUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        [hrUsers]
    );

    const fetchData = async () => {
        try {
            setListLoading(true);
            const [hrAccountsData, departmentData, roleData] = await Promise.all([
                api.get('/employees/hr-accounts'),
                api.get('/departments').catch(() => []),
                api.get('/lookups?category=HR_ROLE').catch(() => [])
            ]);

            setHrUsers(hrAccountsData || []);
            setDepartments(departmentData || []);
            setHrRoleOptions(roleData?.map(r => r.value) || []);
        } catch (error) {
            toast.error('Failed to load admin data: ' + error.message);
            setHrUsers([]);
            setDepartments([]);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdmin) return;
        fetchData();
    }, [isAdmin]);

    if (profile && !isAdmin) {
        return <Navigate to="/hr/dashboard" replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateHr = async (e) => {
        e.preventDefault();
        const normalizedEmail = String(form.email || '').trim().toLowerCase();
        if (!emailRegex.test(normalizedEmail)) {
            toast.error('Please enter a valid work email address.');
            return;
        }

        setLoading(true);

        try {
            const payload = new FormData();
            payload.append('full_name', form.full_name);
            payload.append('email', normalizedEmail);
            payload.append('account_role', 'hr');
            payload.append('role', form.role || 'HR Manager');
            payload.append('phone', form.phone);
            payload.append('joining_date', form.joining_date);
            payload.append('salary', form.salary);
            payload.append('location', form.location || '');
            if (form.department_id) payload.append('department_id', form.department_id);

            const created = await api.post('/employees', payload);
            if (created?.credential_email_sent === false) {
                toast.error('HR account created, but credential email failed. Check SMTP settings.');
            } else {
                toast.success('HR account created and credentials email sent.');
            }
            setForm(defaultForm);
            fetchData();
        } catch (error) {
            toast.error('Failed to create HR account: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: 'var(--font-3xl)', color: 'var(--text-main)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={26} color="var(--primary)" /> Admin Management
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                    Create HR accounts separately and monitor all active HR users.
                </p>
            </div>

            <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-xl)', color: 'var(--text-main)' }}>Create HR Account</h3>
                    <form onSubmit={handleCreateHr} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name <span style={{ color: '#DC2626' }}>*</span></label>
                            <input name="full_name" className="input-field" placeholder="Full Name" value={form.full_name} onChange={handleChange} required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Work Email <span style={{ color: '#DC2626' }}>*</span></label>
                            <input name="email" type="email" className="input-field" placeholder="Work Email" value={form.email} onChange={handleChange} required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Role <span style={{ color: '#DC2626' }}>*</span></label>
                            <select name="role" className="input-field" value={form.role} onChange={handleChange} required style={{ width: '100%' }}>
                            {hrRoleOptions.length > 0 ? hrRoleOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            )) : <option value="HR Manager">HR Manager</option>}
                        </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone <span style={{ color: '#DC2626' }}>*</span></label>
                            <input name="phone" className="input-field" placeholder="Phone (10 digits)" value={form.phone} onChange={handleChange} required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Joining Date <span style={{ color: '#DC2626' }}>*</span></label>
                            <input name="joining_date" type="date" className="input-field" value={form.joining_date} onChange={handleChange} required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Annual Salary <span style={{ color: '#DC2626' }}>*</span></label>
                            <input name="salary" type="number" className="input-field" placeholder="Annual Salary" value={form.salary} onChange={handleChange} required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Department</label>
                            <select name="department_id" className="input-field" value={form.department_id} onChange={handleChange} style={{ width: '100%' }}>
                            <option value="">Department (Optional)</option>
                            {departments.map((dep) => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Location</label>
                            <input name="location" className="input-field" placeholder="Location" value={form.location} onChange={handleChange} style={{ width: '100%' }} />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '6px', justifyContent: 'center' }}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                            {loading ? 'Creating...' : 'Create HR'}
                        </button>
                    </form>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-xl)', color: 'var(--text-main)' }}>Existing HR Accounts</h3>
                    {listLoading ? (
                        <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={28} color="var(--primary)" />
                        </div>
                    ) : sortedHrUsers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No HR accounts found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                                        <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</th>
                                        <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedHrUsers.map((hr) => (
                                        <tr key={hr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>{hr.full_name}</td>
                                            <td style={{ padding: '10px 8px' }}>{hr.email}</td>
                                            <td style={{ padding: '10px 8px' }}>{hr.department || 'Unassigned'}</td>
                                            <td style={{ padding: '10px 8px' }}>{hr.joining_date ? new Date(hr.joining_date).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @media (max-width: 1024px) {
                    .admin-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </>
    );
};

export default AdminManagementPage;
