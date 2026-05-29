import React, { useState, useEffect } from 'react';
import {
    Briefcase, Send, Plus, Trash2, Edit2,
    FileText, Users, Clock
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getIstTodayYmd } from '../lib/istDate';

const EmployeeProjectsPage = () => {
    const { profile } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [addingTask, setAddingTask] = useState(false);

    const today = getIstTodayYmd();
    const myEmployeeId = profile?.employee_uuid || profile?.id;

    useEffect(() => { fetchProjects(); }, []);
    useEffect(() => { if (selectedProject) fetchTasks(selectedProject.id); }, [selectedProject]);

    const fetchProjects = async () => {
        try {
            const data = await api.get('/projects');
            setProjects(data || []);
        } catch (err) { console.error('Failed to fetch projects'); }
        finally { setLoading(false); }
    };

    const fetchTasks = async (projectId) => {
        try {
            const data = await api.get(`/projects/${projectId}/tasks?date=${today}`);
            setTasks(data || []);
        } catch (err) { setTasks([]); }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedProject) return;
        setAddingTask(true);
        try {
            await api.post(`/projects/${selectedProject.id}/tasks/daily`, { title: newTaskTitle.trim() });
            setNewTaskTitle('');
            fetchTasks(selectedProject.id);
        } catch (err) {
            alert(err?.response?.data?.error || 'Failed to add task');
        } finally { setAddingTask(false); }
    };

    const handleUpdateTask = async (taskId, updates) => {
        try {
            await api.put(`/projects/${selectedProject.id}/tasks/${taskId}`, updates);
            fetchTasks(selectedProject.id);
        } catch (err) {
            alert(err?.response?.data?.error || 'Failed to update task');
            throw err;
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await api.delete(`/projects/${selectedProject.id}/tasks/${taskId}`);
            fetchTasks(selectedProject.id);
        } catch (err) {
            alert(err?.response?.data?.error || 'Failed to delete task');
        }
    };

    // Group tasks by employee
    const groupedByEmployee = tasks.reduce((acc, t) => {
        const key = t.employee_id;
        if (!acc[key]) acc[key] = { name: t.full_name, tasks: [] };
        acc[key].tasks.push(t);
        return acc;
    }, {});

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '4px' }}>My Projects</h1>
                <p style={{ color: 'var(--text-muted)' }}>Add daily tasks and track team progress in real-time.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
                {/* Project List */}
                <div>
                    <h3 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '14px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>PROJECTS</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {projects.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProject(p)}
                                className="card"
                                style={{
                                    padding: '14px', cursor: 'pointer',
                                    border: selectedProject?.id === p.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                }}
                            >
                                <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{p.name}</h4>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.client || 'No client'} · {p.status || 'Active'}</p>
                            </div>
                        ))}
                        {projects.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No projects assigned.</p>}
                    </div>
                </div>

                {/* Right Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {selectedProject ? (
                        <>
                            {/* Add Task */}
                            <div className="card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Daily Tasks</h3>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', background: 'var(--input-bg)', padding: '5px 12px', borderRadius: '6px' }}>
                                        📅 {today}
                                    </span>
                                </div>

                                <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <input
                                        className="input-field"
                                        placeholder="What are you working on?"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        required
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={addingTask || !newTaskTitle.trim()}
                                        style={{
                                            padding: '10px 18px', background: 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                                            opacity: addingTask ? 0.7 : 1,
                                        }}
                                    >
                                        <Plus size={16} /> Add Task
                                    </button>
                                </form>

                                {/* All Team Tasks for Today */}
                                {Object.entries(groupedByEmployee).map(([empId, group]) => {
                                    const isMe = empId === myEmployeeId;
                                    return (
                                    <div key={empId} style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: isMe ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Users size={14} /> {group.name} {isMe && <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>You</span>}
                                        </div>

                                        {/* Column headers */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', padding: '0 12px 6px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>TASK</span>
                                            <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>TIME</span>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>STATUS</span>
                                            </span>
                                            <span style={{ width: '50px' }}></span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {isMe ? (
                                                group.tasks.map((task) => (
                                                    <TaskRow
                                                        key={task.id}
                                                        task={task}
                                                        onUpdate={handleUpdateTask}
                                                        onDelete={handleDeleteTask}
                                                    />
                                                ))
                                            ) : (
                                                group.tasks.map((task) => (
                                                    <div key={task.id} style={{
                                                        padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border)',
                                                        display: 'grid', gridTemplateColumns: '1fr 60px 100px', gap: '8px', alignItems: 'center',
                                                    }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{task.title}</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>{task.time_spent ? `${task.time_spent}h` : '—'}</span>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textAlign: 'center',
                                                            background: task.status === 'Finished' ? '#DCFCE7' : task.status === 'In Progress' ? '#FEF3C7' : task.status === 'Partially Finished' ? '#E0E7FF' : 'var(--input-bg)',
                                                            color: task.status === 'Finished' ? '#166534' : task.status === 'In Progress' ? '#92400E' : task.status === 'Partially Finished' ? '#3730A3' : 'var(--text-muted)',
                                                        }}>
                                                            {task.status || 'Pending'}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}

                                {tasks.length === 0 && (
                                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '13px' }}>
                                        No tasks added yet today. Add your first task above.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                            <FileText size={40} color="var(--border)" style={{ marginBottom: '16px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Select a project to manage daily tasks</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Individual Task Row Component ───────────────────────────────
const TaskRow = ({ task, onUpdate, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [timeSpent, setTimeSpent] = useState(task.time_spent || '');
    const [status, setStatus] = useState(task.status || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const hasChanges = (
        (timeSpent !== (task.time_spent || '')) ||
        (status !== (task.status || ''))
    );

    const handleSave = async () => {
        setSaving(true);
        const updates = {};
        if (timeSpent !== (task.time_spent || '')) updates.time_spent = timeSpent || null;
        if (status !== (task.status || '')) updates.status = status || null;
        if (Object.keys(updates).length > 0) {
            await onUpdate(task.id, updates);
        }
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleTitleSave = () => {
        if (title.trim() && title !== task.title) {
            onUpdate(task.id, { title: title.trim() });
        }
        setEditing(false);
    };

    return (
        <div style={{
            padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border)',
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                {/* Title */}
                {editing ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                            className="input-field"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                            onBlur={handleTitleSave}
                            autoFocus
                            style={{ fontSize: '13px' }}
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600' }}>
                        <span>{task.title}</span>
                        <button onClick={() => setEditing(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                            <Edit2 size={12} />
                        </button>
                    </div>
                )}
                <button
                    onClick={() => onDelete(task.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '4px' }}
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <select
                    className="input-field"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px' }}
                >
                    <option value="">⏱ Time spent</option>
                    {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(h => (
                        <option key={h} value={h}>{h}h</option>
                    ))}
                </select>

                <select
                    className="input-field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px' }}
                >
                    <option value="">📋 Status</option>
                    <option value="Finished">✓ Finished</option>
                    <option value="In Progress">⏳ In Progress</option>
                    <option value="Partially Finished">◐ Partial</option>
                </select>

                {hasChanges ? (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '8px 14px', background: 'var(--primary)', color: 'white',
                            border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                            cursor: 'pointer', whiteSpace: 'nowrap', opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? '...' : 'Save'}
                    </button>
                ) : saved ? (
                    <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>✓ Saved</span>
                ) : (
                    <span style={{ width: '50px' }}></span>
                )}
            </div>
        </div>
    );
};

export default EmployeeProjectsPage;
