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
    const fullNameRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
    const phoneRegex = /^\d+$/;
    const [hrRoleOptions, setHrRoleOptions] = useState([]);
    const [formErrors, setFormErrors] = useState({ full_name: '', email: '', phone: '' });

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

        if (name === 'full_name') {
            const sanitized = value.replace(/[^A-Za-z\s]/g, '');
            setFormErrors((prev) => ({ ...prev, full_name: '' }));
            setForm((prev) => ({ ...prev, [name]: sanitized }));
            return;
        }

        if (name === 'email') {
            setFormErrors((prev) => ({ ...prev, email: '' }));
            setForm((prev) => ({ ...prev, [name]: value }));
            return;
        }

        if (name === 'phone') {
            const sanitized = value.replace(/\D/g, '');
            setFormErrors((prev) => ({ ...prev, phone: '' }));
            setForm((prev) => ({ ...prev, [name]: sanitized }));
            return;
        }

        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateHr = async (e) => {
        e.preventDefault();
        const normalizedName = String(form.full_name || '').trim().replace(/\s+/g, ' ');
        const normalizedPhone = String(form.phone || '').trim();
        const normalizedEmail = String(form.email || '').trim().toLowerCase();

        const nextErrors = { full_name: '', email: '', phone: '' };
        if (!fullNameRegex.test(normalizedName)) {
            nextErrors.full_name = 'Full Name can contain only letters and spaces.';
        }
        if (!emailRegex.test(normalizedEmail)) {
            nextErrors.email = 'Please enter a valid work email address.';
        }
        if (!phoneRegex.test(normalizedPhone)) {
            nextErrors.phone = 'Phone must contain only digits (0-9).';
        }
        if (nextErrors.full_name || nextErrors.email || nextErrors.phone) {
            setFormErrors(nextErrors);
            toast.error('Please fix the validation errors before submitting.');
            return;
        }

        setLoading(true);

        try {
            const payload = new FormData();
            payload.append('full_name', normalizedName);
            payload.append('email', normalizedEmail);
            payload.append('account_role', 'hr');
            payload.append('role', form.role || 'HR Manager');
            payload.append('phone', normalizedPhone);
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                                name="full_name"
                                className="input-field"
                                placeholder="Full Name"
                                value={form.full_name}
                                onChange={handleChange}
                                required
                                pattern="[A-Za-z ]+"
                                title="Full Name can contain only letters and spaces"
                            />
                            {formErrors.full_name ? <span style={{ color: '#b91c1c', fontSize: '12px' }}>{formErrors.full_name}</span> : null}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Work Email</label>
                            <input
                                name="email"
                                type="email"
                                className="input-field"
                                placeholder="Work Email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                inputMode="email"
                                autoComplete="email"
                                title="Enter a valid email address"
                            />
                            {formErrors.email ? <span style={{ color: '#b91c1c', fontSize: '12px' }}>{formErrors.email}</span> : null}
                        </div>
                        <select name="role" className="input-field" value={form.role} onChange={handleChange} required>
                            {hrRoleOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                                name="phone"
                                className="input-field"
                                placeholder="Phone"
                                value={form.phone}
                                onChange={handleChange}
                                required
                                inputMode="numeric"
                                pattern="[0-9]+"
                                title="Phone must contain only digits (0-9)"
                            />
                            {formErrors.phone ? <span style={{ color: '#b91c1c', fontSize: '12px' }}>{formErrors.phone}</span> : null}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="hr-joining-date" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date of Joining (DOJ)</label>
                            <input
                                id="hr-joining-date"
                                name="joining_date"
                                type="date"
                                className="input-field"
                                value={form.joining_date}
                                onChange={handleChange}
                                required
                                aria-describedby="hr-joining-date-help"
                            />
                            <span id="hr-joining-date-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Select the employee's joining date for the HR account.
                            </span>
                        </div>
                        <input name="salary" type="number" className="input-field" placeholder="Annual Salary" value={form.salary} onChange={handleChange} required />
                        <select name="department_id" className="input-field" value={form.department_id} onChange={handleChange}>
                            <option value="">Department (Optional)</option>
                            {departments.map((dep) => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                        <input name="location" className="input-field" placeholder="Location" value={form.location} onChange={handleChange} />

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
