import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const EmployeeTable = ({ onAddClick, onEditClick, onDataLoaded }) => {
    const { profile } = useAuth();
    const isAdminUser = profile?.role === 'admin';
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
    const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get('department') || 'All');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'All');
    const [managerFilter, setManagerFilter] = useState(() => searchParams.get('manager_id') || 'All');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const employeeDetailBase = profile?.role === 'admin' ? '/admin/employees' : '/hr/employees';

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Keep local state in sync if URL changes via browser navigation.
    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
        setDepartmentFilter(searchParams.get('department') || 'All');
        setStatusFilter(searchParams.get('status') || 'All');
        setManagerFilter(searchParams.get('manager_id') || 'All');
    }, [searchParams]);

    // Persist filters in URL for refresh/share/back-forward support.
    useEffect(() => {
        const next = new URLSearchParams();
        if (searchTerm.trim()) next.set('q', searchTerm.trim());
        if (departmentFilter !== 'All') next.set('department', departmentFilter);
        if (statusFilter !== 'All') next.set('status', statusFilter);
        if (managerFilter !== 'All') next.set('manager_id', managerFilter);

        const nextString = next.toString();
        const currentString = searchParams.toString();
        if (nextString !== currentString) {
            setSearchParams(next, { replace: true });
        }
    }, [searchTerm, departmentFilter, statusFilter, managerFilter, searchParams, setSearchParams]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const data = await api.get('/employees');
            setEmployees(data || []);
            if (onDataLoaded) onDataLoaded(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (employee) => {
        const isInactive = (employee.status || '').toLowerCase() === 'inactive';
        const confirmed = isInactive
            ? window.confirm(`Reactivate ${employee.full_name}? Their account access will be restored.`)
            : window.confirm(`Mark ${employee.full_name} as inactive? They will no longer be active in the system.`);

        if (!confirmed) return;

        try {
            if (isInactive) {
                await api.patch(`/employees/${employee.id}/reactivate`);
                toast.success('Employee reactivated successfully');
            } else {
                await api.delete(`/employees/${employee.id}`);
                toast.success('Employee marked inactive successfully');
            }
            fetchEmployees();
        } catch (error) {
            toast.error(error.message || 'Failed to update employee status');
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
        const normalizedStatus = (emp.status || 'Active').toLowerCase();
        const matchesStatus = statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase();
        const matchesManager = managerFilter === 'All' || emp.manager_id === managerFilter;

        return matchesSearch && matchesDept && matchesStatus && matchesManager;
    });

    const departmentOptions = Array.from(
        new Set((employees || []).map((emp) => emp.department).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const hrManagerOptions = Array.from(
        new Map(
            (employees || [])
                .filter((emp) => (emp.account_role || '').toLowerCase() === 'hr')
                .map((emp) => [emp.id, { id: emp.id, full_name: emp.full_name }])
        ).values()
    ).sort((a, b) => a.full_name.localeCompare(b.full_name));

    return (
        <div className="card" style={{ padding: '0' }}>
            <div className="responsive-flex-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)', gap: '24px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            outline: 'none',
                            fontSize: 'var(--font-md)'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontWeight: '500',
                            cursor: 'pointer',
                            fontSize: 'var(--font-md)',
                            outline: 'none'
                        }}
                    >
                        <option value="All">All Departments</option>
                        {departmentOptions.map((dep) => (
                            <option key={dep} value={dep}>{dep}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontWeight: '500',
                            cursor: 'pointer',
                            fontSize: 'var(--font-md)',
                            outline: 'none'
                        }}
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    {isAdminUser && (
                        <select
                            value={managerFilter}
                            onChange={(e) => setManagerFilter(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--card-bg)',
                                color: 'var(--text-main)',
                                fontWeight: '500',
                                cursor: 'pointer',
                                fontSize: 'var(--font-md)',
                                outline: 'none'
                            }}
                        >
                            <option value="All">All Managers</option>
                            {hrManagerOptions.map((manager) => (
                                <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={onAddClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: 'var(--font-md)'
                        }}
                    >
                        <Plus size={18} />
                        Add Employee
                    </button>
                </div>
            </div>

            <div className="table-scroll-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontSize: 'var(--font-xs)', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee</th>
                            <th style={{ padding: '16px 24px', fontSize: 'var(--font-xs)', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role & Department</th>
                            <th style={{ padding: '16px 24px', fontSize: 'var(--font-xs)', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '16px 24px', fontSize: 'var(--font-xs)', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined Date</th>
                            <th style={{ padding: '16px 24px', fontSize: 'var(--font-xs)', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading employees...</td>
                            </tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</td>
                            </tr>
                        ) : filteredEmployees.map((emp) => (
                            <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img
                                            src={emp.avatar_url ? (emp.avatar_url.startsWith('http') ? emp.avatar_url : `${emp.avatar_url}`) : '/avatar-placeholder.svg'}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '/avatar-placeholder.svg';
                                            }}
                                            alt={emp.full_name}
                                            className="avatar"
                                        />
                                        <span style={{ fontWeight: '600', fontSize: 'var(--font-md)', color: 'var(--text-main)' }}>{emp.full_name}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    <p style={{ fontSize: 'var(--font-md)', fontWeight: '500' }}>{emp.role}</p>
                                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{emp.department}</p>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    <span className={`status-badge ${(emp.status || 'Active').toLowerCase().replace(' ', '-')}`}>
                                        {emp.status || 'Active'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 24px', fontSize: 'var(--font-md)', color: 'var(--text-muted)' }}>
                                    {new Date(emp.joining_date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                            onClick={() => navigate(`${employeeDetailBase}/${emp.id}`)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => onEditClick(emp)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(emp)}
                                            style={{
                                                width: '44px',
                                                height: '24px',
                                                borderRadius: '999px',
                                                border: '1px solid var(--border)',
                                                background: (emp.status || '').toLowerCase() === 'inactive' ? '#CBD5E1' : '#16A34A',
                                                padding: '2px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: (emp.status || '').toLowerCase() === 'inactive' ? 'flex-start' : 'flex-end'
                                            }}
                                            title={(emp.status || '').toLowerCase() === 'inactive' ? 'Reactivate employee' : 'Mark employee inactive'}
                                            aria-label={(emp.status || '').toLowerCase() === 'inactive' ? 'Reactivate employee' : 'Mark employee inactive'}
                                        >
                                            <span
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '999px',
                                                    background: '#FFFFFF',
                                                    display: 'inline-block'
                                                }}
                                            />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style>{`
        .status-badge.on-leave { background: var(--status-pending-bg); color: var(--status-pending-text); }
        .status-badge.active { background: var(--status-approved-bg); color: var(--status-approved-text); }
      `}</style>
        </div>
    );
};

export default EmployeeTable;
