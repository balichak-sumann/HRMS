import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, Network, Save } from 'lucide-react';

const AvatarBadge = ({ employee }) => {
    if (employee?.avatar_url) {
        return (
            <img
                src={employee.avatar_url}
                alt={employee.full_name}
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }}
            />
        );
    }

    const initials = (employee?.full_name || '?')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0EA5E9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
            {initials}
        </div>
    );
};

const HROrgChartPage = () => {
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [quickEdit, setQuickEdit] = useState({ department_id: '', manager_id: '' });

    const fetchBaseData = async () => {
        try {
            const [depData, empData] = await Promise.all([
                api.get('/departments'),
                api.get('/employees')
            ]);
            setDepartments(depData || []);
            setAllEmployees(empData || []);
        } catch (error) {
            console.error('Failed to fetch base org chart data', error);
        }
    };

    const fetchOrgChart = async () => {
        try {
            setLoading(true);
            const query = departmentFilter ? `?department_id=${departmentFilter}` : '';
            const data = await api.get(`/departments/org-chart/tree${query}`);
            setEmployees(data?.employees || []);
        } catch (error) {
            console.error('Failed to fetch org chart', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const load = async () => {
            await fetchBaseData();
            await fetchOrgChart();
        };
        load();
    }, []);

    useEffect(() => {
        fetchOrgChart();
    }, [departmentFilter]);

    const employeeMap = useMemo(() => {
        const map = new Map();
        (employees || []).forEach((e) => map.set(e.id, e));
        return map;
    }, [employees]);

    const childrenMap = useMemo(() => {
        const map = new Map();
        (employees || []).forEach((employee) => {
            const parentId = employee.manager_id;
            if (!parentId || !employeeMap.has(parentId)) return;
            if (!map.has(parentId)) map.set(parentId, []);
            map.get(parentId).push(employee);
        });
        return map;
    }, [employees, employeeMap]);

    const roots = useMemo(() => {
        return (employees || []).filter((employee) => !employee.manager_id || !employeeMap.has(employee.manager_id));
    }, [employees, employeeMap]);

    const onNodeClick = (employee) => {
        setSelectedEmployee(employee);
        setQuickEdit({
            department_id: employee.department_id || '',
            manager_id: employee.manager_id || ''
        });
    };

    const saveQuickEdit = async () => {
        if (!selectedEmployee) return;
        try {
            await api.patch(`/departments/org-chart/employee/${selectedEmployee.id}`, {
                department_id: quickEdit.department_id || null,
                manager_id: quickEdit.manager_id || null
            });
            await fetchBaseData();
            await fetchOrgChart();
            setSelectedEmployee(null);
        } catch (error) {
            console.error('Failed to update org assignment', error);
            alert(error.message || 'Failed to update employee org info');
        }
    };

    const Node = ({ employee }) => {
        const children = childrenMap.get(employee.id) || [];
        return (
            <li style={{ listStyle: 'none', textAlign: 'center', position: 'relative', padding: '10px' }}>
                <button
                    onClick={() => onNodeClick(employee)}
                    style={{
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        borderRadius: '12px',
                        padding: '10px',
                        width: '220px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                    }}
                >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <AvatarBadge employee={employee} />
                        <div>
                            <p style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{employee.full_name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{employee.designation || employee.role || 'Employee'}</p>
                            <p style={{ fontSize: '11px', color: '#0EA5E9', marginTop: '2px' }}>{employee.department_name || 'Unassigned'}</p>
                        </div>
                    </div>
                </button>

                {children.length > 0 && (
                    <>
                        <div style={{ width: '2px', height: '18px', background: '#CBD5E1', margin: '0 auto' }} />
                        <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', padding: 0, margin: 0, flexWrap: 'wrap' }}>
                            {children.map((child) => <Node key={child.id} employee={child} />)}
                        </ul>
                    </>
                )}
            </li>
        );
    };

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Network size={24} /> Org Chart
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        Explore hierarchy and update reporting manager or department from the chart.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Department</label>
                    <select className="input-field" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={{ width: '220px' }}>
                        <option value="">All departments</option>
                        {departments.map((dep) => (
                            <option key={dep.id} value={dep.id}>{dep.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: '18px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '70px' }}>
                        <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                    </div>
                ) : roots.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No employees found for this filter.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                        {/* Company Root */}
                        <div style={{
                            padding: '14px 28px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                            borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px',
                            boxShadow: '0 4px 16px rgba(59,130,246,0.3)', textAlign: 'center'
                        }}>
                            IndusInnovate Technologies
                        </div>
                        <div style={{ width: '2px', height: '30px', background: '#94A3B8' }} />

                        {/* Department Branches */}
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
                            {/* Horizontal connector line */}
                            {departments.filter(d => !departmentFilter || d.id === departmentFilter).length > 1 && (
                                <div style={{ position: 'absolute', top: '0', left: '15%', right: '15%', height: '2px', background: '#94A3B8' }} />
                            )}

                            {departments
                                .filter(d => !departmentFilter || d.id === departmentFilter)
                                .map(dept => {
                                    const deptEmployees = (employees || []).filter(e =>
                                        e.department_name === dept.name || e.department_id === dept.id
                                    );
                                    if (deptEmployees.length === 0 && departmentFilter) return null;

                                    // Find department head (manager with no manager in same dept, or first employee)
                                    const deptRoots = deptEmployees.filter(e => !e.manager_id || !deptEmployees.some(de => de.id === e.manager_id));

                                    return (
                                        <div key={dept.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ width: '2px', height: '20px', background: '#94A3B8' }} />
                                            {/* Department Node */}
                                            <div style={{
                                                padding: '10px 20px', background: 'var(--input-bg)',
                                                border: '2px solid var(--primary)', borderRadius: '10px',
                                                fontWeight: '700', fontSize: '13px', color: 'var(--primary)',
                                                textAlign: 'center', minWidth: '140px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                            }}>
                                                {dept.name}
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>
                                                    {deptEmployees.length} member{deptEmployees.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>

                                            {deptRoots.length > 0 && (
                                                <>
                                                    <div style={{ width: '2px', height: '16px', background: '#CBD5E1' }} />
                                                    <ul style={{ padding: 0, margin: 0, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                        {deptRoots.map(emp => <Node key={emp.id} employee={emp} />)}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}
            </div>

            {selectedEmployee && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px' }}>Quick Profile Summary</h3>
                            <button onClick={() => setSelectedEmployee(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>
                                x
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Name</p>
                                <p style={{ fontWeight: '700' }}>{selectedEmployee.full_name}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Designation</p>
                                <p style={{ fontWeight: '700' }}>{selectedEmployee.designation || selectedEmployee.role || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Department</p>
                                <p style={{ fontWeight: '700' }}>{selectedEmployee.department_name || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reporting Manager</p>
                                <p style={{ fontWeight: '700' }}>{selectedEmployee.manager_name || 'None'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</p>
                                <p style={{ fontWeight: '700' }}>{selectedEmployee.email || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone</p>
                                <p style={{ fontWeight: '700' }}>{selectedEmployee.phone || '-'}</p>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Update Org Assignment</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <select
                                    className="input-field"
                                    value={quickEdit.department_id}
                                    onChange={(e) => setQuickEdit((prev) => ({ ...prev, department_id: e.target.value }))}
                                >
                                    <option value="">Unassigned</option>
                                    {departments.map((dep) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                                </select>

                                <select
                                    className="input-field"
                                    value={quickEdit.manager_id}
                                    onChange={(e) => setQuickEdit((prev) => ({ ...prev, manager_id: e.target.value }))}
                                >
                                    <option value="">No manager</option>
                                    {allEmployees
                                        .filter((emp) => emp.id !== selectedEmployee.id)
                                        .map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                </select>
                            </div>

                            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    onClick={() => setSelectedEmployee(null)}
                                    style={{ border: '1px solid var(--border)', background: 'var(--card-bg)', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button className="btn-primary" onClick={saveQuickEdit} style={{ borderRadius: '8px' }}>
                                    <Save size={15} /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HROrgChartPage;
