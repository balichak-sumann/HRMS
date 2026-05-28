import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Building2, Loader2, PencilLine, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const HRDepartmentsPage = () => {
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ name: '', description: '' });
    const [editingId, setEditingId] = useState(null);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await api.get('/departments');
            setDepartments(data || []);
        } catch (error) {
            console.error('Failed to fetch departments', error);
            toast.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const totalEmployees = useMemo(() =>
        (departments || []).reduce((sum, dep) => sum + (dep.employee_count || 0), 0),
    [departments]);

    const submitForm = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`/departments/${editingId}`, form);
            } else {
                await api.post('/departments', form);
            }
            setForm({ name: '', description: '' });
            setEditingId(null);
            await fetchDepartments();
        } catch (error) {
            console.error('Department save failed', error);
            toast.error(error.message || 'Failed to save department');
        }
    };

    const startEdit = (dep) => {
        setEditingId(dep.id);
        setForm({ name: dep.name || '', description: dep.description || '' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ name: '', description: '' });
    };

    const deleteDepartment = async (dep) => {
        const ok = window.confirm(`Delete department ${dep.name}?`);
        if (!ok) return;

        try {
            await api.delete(`/departments/${dep.id}`);
            await fetchDepartments();
        } catch (error) {
            console.error('Delete department failed', error);
            toast.error(error.message || 'Failed to delete department');
        }
    };

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 size={24} /> Departments
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Create, edit, and manage departments with employee counts.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
                <div className="card" style={{ padding: '18px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>{editingId ? 'Edit Department' : 'Create Department'}</h3>
                    <form onSubmit={submitForm} style={{ display: 'grid', gap: '10px' }}>
                        <input
                            className="input-field"
                            placeholder="Department name"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                        />
                        <textarea
                            className="input-field"
                            rows="3"
                            placeholder="Description"
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-primary" type="submit" style={{ borderRadius: '8px' }}>
                                <PlusCircle size={16} /> {editingId ? 'Update' : 'Create'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', background: 'var(--card-bg)', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '18px' }}>Department Directory</h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Employees: {totalEmployees}</span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <Loader2 className="animate-spin" size={34} color="var(--primary)" />
                        </div>
                    ) : departments.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No departments found.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {departments.map((dep) => (
                                <div key={dep.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                        <div>
                                            <p style={{ fontWeight: '700' }}>{dep.name}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dep.description || 'No description provided'}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{dep.employee_count || 0} employees</p>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => startEdit(dep)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                    title="Edit"
                                                >
                                                    <PencilLine size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteDepartment(dep)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default HRDepartmentsPage;
