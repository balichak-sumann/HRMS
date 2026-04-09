import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Calendar, Loader2, PlusCircle, RefreshCw } from 'lucide-react';

const toYmd = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const startOfWeekMonday = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const HRShiftManagementPage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [shifts, setShifts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState('');

    const [weekStart, setWeekStart] = useState(toYmd(startOfWeekMonday(new Date())));
    const [roster, setRoster] = useState([]);

    const [newShift, setNewShift] = useState({ name: '', start_time: '09:00', end_time: '18:00' });
    const [singleAssign, setSingleAssign] = useState({ employee_id: '', shift_id: '', effective_from: toYmd(new Date()), effective_to: '' });
    const [bulkAssign, setBulkAssign] = useState({ department_id: '', shift_id: '', effective_from: toYmd(new Date()), effective_to: '' });

    const days = useMemo(() => {
        const start = new Date(`${weekStart}T00:00:00`);
        return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }, [weekStart]);

    const rosterByEmployee = useMemo(() => {
        const grouped = {};
        for (const row of roster) {
            if (!grouped[row.employee_id]) {
                grouped[row.employee_id] = {
                    employee_id: row.employee_id,
                    full_name: row.full_name,
                    department_name: row.department_name,
                    days: {},
                };
            }
            grouped[row.employee_id].days[row.day?.slice(0, 10)] = row;
        }
        return Object.values(grouped);
    }, [roster]);

    const fetchMeta = async () => {
        const [shiftData, employeeData, departmentData] = await Promise.all([
            api.get('/shifts'),
            api.get('/employees'),
            api.get('/departments'),
        ]);

        setShifts(Array.isArray(shiftData) ? shiftData : []);
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
        setDepartments(Array.isArray(departmentData) ? departmentData : []);

        if (!singleAssign.employee_id && employeeData?.length) {
            setSingleAssign((prev) => ({ ...prev, employee_id: employeeData[0].id }));
        }
        if (!singleAssign.shift_id && shiftData?.length) {
            setSingleAssign((prev) => ({ ...prev, shift_id: shiftData[0].id }));
        }
        if (!bulkAssign.shift_id && shiftData?.length) {
            setBulkAssign((prev) => ({ ...prev, shift_id: shiftData[0].id }));
        }
        if (!bulkAssign.department_id && departmentData?.length) {
            setBulkAssign((prev) => ({ ...prev, department_id: departmentData[0].id }));
            setSelectedDepartment(departmentData[0].id);
        }
    };

    const fetchRoster = async (week = weekStart, departmentId = selectedDepartment) => {
        const query = new URLSearchParams({ week_start: week });
        if (departmentId) query.set('department_id', departmentId);
        const data = await api.get(`/shifts/roster/weekly?${query.toString()}`);
        setRoster(Array.isArray(data?.roster) ? data.roster : []);
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            await fetchMeta();
            await fetchRoster();
        } catch (error) {
            console.error('Failed to load shift data', error);
            alert(error.message || 'Failed to load shift data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        if (!loading) {
            fetchRoster(weekStart, selectedDepartment).catch((error) => {
                console.error('Failed to load weekly roster', error);
            });
        }
    }, [weekStart, selectedDepartment]);

    const createShift = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/shifts', newShift);
            setNewShift({ name: '', start_time: '09:00', end_time: '18:00' });
            await loadAll();
        } catch (error) {
            console.error('Failed to create shift', error);
            alert(error.message || 'Failed to create shift');
        } finally {
            setSubmitting(false);
        }
    };

    const assignEmployee = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/shifts/assign/employee', singleAssign);
            await fetchRoster();
            alert('Shift assigned to employee');
        } catch (error) {
            console.error('Failed to assign shift to employee', error);
            alert(error.message || 'Failed to assign shift to employee');
        } finally {
            setSubmitting(false);
        }
    };

    const assignDepartment = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const response = await api.post('/shifts/assign/department', bulkAssign);
            await fetchRoster();
            alert(`Shift assigned to ${response.assigned_count || 0} employees`);
        } catch (error) {
            console.error('Failed to bulk assign shift', error);
            alert(error.message || 'Failed to bulk assign shift');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 className="animate-spin" size={36} color="var(--primary)" />
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Shift Management</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        Create shifts, assign employees, and manage weekly roster.
                    </p>
                </div>

                <button className="btn-primary" onClick={loadAll} style={{ borderRadius: '8px' }}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <form className="card" style={{ padding: '16px' }} onSubmit={createShift}>
                    <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Create Shift</h3>
                    <input className="input-field" placeholder="Shift name" value={newShift.name} onChange={(e) => setNewShift((prev) => ({ ...prev, name: e.target.value }))} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                        <input className="input-field" type="time" value={newShift.start_time} onChange={(e) => setNewShift((prev) => ({ ...prev, start_time: e.target.value }))} required />
                        <input className="input-field" type="time" value={newShift.end_time} onChange={(e) => setNewShift((prev) => ({ ...prev, end_time: e.target.value }))} required />
                    </div>
                    <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: '10px' }}>
                        <PlusCircle size={16} /> Add Shift
                    </button>
                </form>

                <form className="card" style={{ padding: '16px' }} onSubmit={assignEmployee}>
                    <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Assign to Employee</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Select Employee</label>
                        <select className="input-field" style={{ width: '100%', display: 'block' }} value={singleAssign.employee_id} onChange={(e) => setSingleAssign((prev) => ({ ...prev, employee_id: e.target.value }))} required>
                            {employees.length === 0 && <option value="">No employees found</option>}
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Select Shift</label>
                        <select className="input-field" style={{ width: '100%', display: 'block' }} value={singleAssign.shift_id} onChange={(e) => setSingleAssign((prev) => ({ ...prev, shift_id: e.target.value }))} required>
                            {shifts.length === 0 && <option value="">No shifts available. Create one first.</option>}
                            {shifts.map((shift) => (
                                <option key={shift.id} value={shift.id}>{shift.name} ({String(shift.start_time).slice(0, 5)}-{String(shift.end_time).slice(0, 5)})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Start Date</label>
                        <input className="input-field" type="date" value={singleAssign.effective_from} onChange={(e) => setSingleAssign((prev) => ({ ...prev, effective_from: e.target.value }))} required />
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>End Date (Leave blank to make permanent)</label>
                        <input className="input-field" type="date" value={singleAssign.effective_to} min={singleAssign.effective_from} onChange={(e) => setSingleAssign((prev) => ({ ...prev, effective_to: e.target.value }))} />
                    </div>
                    <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: '14px' }}>Assign</button>
                </form>

                <form className="card" style={{ padding: '16px' }} onSubmit={assignDepartment}>
                    <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Bulk Assign Department</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Select Department</label>
                        <select className="input-field" style={{ width: '100%', display: 'block' }} value={bulkAssign.department_id} onChange={(e) => setBulkAssign((prev) => ({ ...prev, department_id: e.target.value }))} required>
                            {departments.length === 0 && <option value="">No departments found</option>}
                            {departments.map((dep) => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Select Shift</label>
                        <select className="input-field" style={{ width: '100%', display: 'block' }} value={bulkAssign.shift_id} onChange={(e) => setBulkAssign((prev) => ({ ...prev, shift_id: e.target.value }))} required>
                            {shifts.length === 0 && <option value="">No shifts available. Create one first.</option>}
                            {shifts.map((shift) => (
                                <option key={shift.id} value={shift.id}>{shift.name} ({String(shift.start_time).slice(0, 5)}-{String(shift.end_time).slice(0, 5)})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Start Date</label>
                        <input className="input-field" type="date" value={bulkAssign.effective_from} onChange={(e) => setBulkAssign((prev) => ({ ...prev, effective_from: e.target.value }))} required />
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>End Date (Leave blank to make permanent)</label>
                        <input className="input-field" type="date" value={bulkAssign.effective_to} min={bulkAssign.effective_from} onChange={(e) => setBulkAssign((prev) => ({ ...prev, effective_to: e.target.value }))} />
                    </div>
                    <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: '14px' }}>Bulk Assign</button>
                </form>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '18px' }}>Weekly Shift Roster</h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn-secondary" onClick={() => setWeekStart(toYmd(addDays(new Date(`${weekStart}T00:00:00`), -7)))}>Prev Week</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} />
                                <input className="input-field" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ width: '160px' }} aria-label="Select week start date" title="Select the start date for the week" />
                        </div>
                        <button className="btn-secondary" onClick={() => setWeekStart(toYmd(addDays(new Date(`${weekStart}T00:00:00`), 7)))}>Next Week</button>

                        <select className="input-field" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} style={{ width: '170px' }}>
                            <option value="">All Departments</option>
                            {departments.map((dep) => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '980px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Employee</th>
                                {days.map((day) => (
                                    <th key={day.toISOString()} style={{ padding: '8px' }}>
                                        {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rosterByEmployee.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '12px', color: 'var(--text-muted)' }}>No roster rows found.</td>
                                </tr>
                            ) : rosterByEmployee.map((empRow) => (
                                <tr key={empRow.employee_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ fontWeight: 600 }}>{empRow.full_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{empRow.department_name}</div>
                                    </td>
                                    {days.map((day) => {
                                        const key = toYmd(day);
                                        const assignment = empRow.days[key];
                                        return (
                                            <td key={`${empRow.employee_id}-${key}`} style={{ padding: '8px' }}>
                                                {assignment?.shift_name ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '3px 8px',
                                                        borderRadius: '999px',
                                                        background: '#e0f2fe',
                                                        color: '#0369a1',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                    }}>
                                                        {assignment.shift_name}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default HRShiftManagementPage;
