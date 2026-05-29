import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    Briefcase, Plus, Calendar, User,
    CheckCircle2, Clock, MoreVertical,
    Layout, ListTodo, FileText, ChevronRight,
    Users, Target, AlertCircle, X, Edit, Trash2, Lock, Unlock
} from 'lucide-react';
import { api } from '../lib/api';

const HRProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectDetail, setProjectDetail] = useState(null);

    const [newProject, setNewProject] = useState({
        name: '',
        client: '',
        deadline: '',
        team: []
    });
    const [selectedMemberEmployee, setSelectedMemberEmployee] = useState(null);
    const [activeMenuProject, setActiveMenuProject] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        fetchProjects();
        fetchEmployees();
    }, []);

    const fetchProjects = async () => {
        try {
            const data = await api.get('/projects');
            setProjects(data);
        } catch (err) {
            console.error('Failed to fetch projects', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await api.get('/employees');
            setEmployees(data);
        } catch (err) { }
    };

    const fetchProjectDetail = async (id) => {
        try {
            const data = await api.get(`/projects/${id}`);
            setProjectDetail(data);

            // Also fetch reports
            const reports = await api.get(`/projects/${id}/reports`);
            setProjectDetail(prev => ({ ...prev, reports }));
        } catch (err) { }
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', newProject);
            setShowAddModal(false);
            fetchProjects();
            setNewProject({ name: '', client: '', deadline: '', team: [] });
        } catch (err) {
            alert('Failed to add project');
        }
    };

    const handleCloseProject = async () => {
        if (!selectedProject?.id) return;
        const ok = window.confirm('Close this project? It will be marked as Completed.');
        if (!ok) return;

        try {
            const updated = await api.patch(`/projects/${selectedProject.id}/close`, {});
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            setSelectedProject((prev) => (prev ? { ...prev, ...updated } : prev));
            setProjectDetail((prev) => (prev ? { ...prev, ...updated } : prev));
        } catch (err) {
            alert(err?.message || 'Failed to close project');
        }
    };

    const handleReopenProject = async () => {
        if (!selectedProject?.id) return;
        const ok = window.confirm('Reopen this project? It will be marked as Active.');
        if (!ok) return;

        try {
            const updated = await api.patch(`/projects/${selectedProject.id}/reopen`, {});
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            setSelectedProject((prev) => (prev ? { ...prev, ...updated } : prev));
            setProjectDetail((prev) => (prev ? { ...prev, ...updated } : prev));
        } catch (err) {
            alert(err?.message || 'Failed to reopen project');
        }
    };

    const handleAddMember = async () => {
        if (!selectedMemberEmployee || !selectedProject?.id) return;
        try {
            await api.post(`/projects/${selectedProject.id}/members`, { employee_id: selectedMemberEmployee });
            setSelectedMemberEmployee(null);
            fetchProjectDetail(selectedProject.id);
        } catch (err) {
            alert(err?.response?.data?.error || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (employeeId) => {
        if (!selectedProject?.id) return;
        const ok = window.confirm('Remove this member from the project?');
        if (!ok) return;
        try {
            await api.delete(`/projects/${selectedProject.id}/members/${employeeId}`);
            fetchProjectDetail(selectedProject.id);
        } catch (err) {
            alert(err?.response?.data?.error || 'Failed to remove member');
        }
    };


    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setActiveMenuProject(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuClick = (e, projectId) => {
        e.stopPropagation();
        setActiveMenuProject(activeMenuProject === projectId ? null : projectId);
    };

    const handleMenuEditProject = (e, project) => {
        e.stopPropagation();
        setSelectedProject(project);
        setActiveMenuProject(null);
        fetchProjectDetail(project.id);
    };

    const handleMenuDeleteProject = async (e, projectId) => {
        e.stopPropagation();
        const ok = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');
        if (!ok) return;
        try {
            await api.delete(`/projects/${projectId}`);
            setActiveMenuProject(null);
            setSelectedProject(null);
            setProjectDetail(null);
            fetchProjects();
            alert('Project deleted successfully');
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || 'Failed to delete project');
        }
    };

    const handleMenuCloseProject = async (e, projectId) => {
        e.stopPropagation();
        const ok = window.confirm('Close this project? Team members will not be able to submit reports.');
        if (!ok) return;
        try {
            const updated = await api.patch(`/projects/${projectId}/close`, {});
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            setActiveMenuProject(null);
            alert('Project closed');
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || 'Failed to close project');
        }
    };

    const handleMenuReopenProject = async (e, projectId) => {
        e.stopPropagation();
        const ok = window.confirm('Reopen this project? Team members will be able to submit reports again.');
        if (!ok) return;
        try {
            const updated = await api.patch(`/projects/${projectId}/reopen`, {});
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            setActiveMenuProject(null);
            alert('Project reopened');
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.error || 'Failed to reopen project');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return '#3B82F6';
            case 'Completed': return '#10B981';
            case 'On-Hold': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header className="responsive-flex-header" style={{ marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '4px' }}>Projects</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage enterprise projects, teams, and deliverables.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Plus size={20} /> New Project
                </button>
            </header>

            {/* Project Grid */}
            <div className="project-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="card"
                        style={{
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onClick={() => {
                            setSelectedProject(project);
                            fetchProjectDetail(project.id);
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: `${getStatusColor(project.status)}15`,
                                color: getStatusColor(project.status),
                                textTransform: 'uppercase'
                            }}>
                                {project.status}
                            </span>
                            <div style={{ position: 'relative' }} ref={activeMenuProject === project.id ? menuRef : null}>
                                <button
                                    onClick={(e) => handleMenuClick(e, project.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Project menu"
                                >
                                    <MoreVertical size={18} color="var(--text-muted)" />
                                </button>
                                {activeMenuProject === project.id && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '24px',
                                        right: 0,
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        zIndex: 1000,
                                        minWidth: '200px',
                                        overflow: 'hidden'
                                    }}>
                                        <button
                                            onClick={(e) => handleMenuEditProject(e, project)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '10px 14px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                color: 'var(--text-main)',
                                                textAlign: 'left',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <Edit size={16} /> View/Edit Details
                                        </button>
                                        <button
                                            onClick={(e) => project.status === 'Active' ? handleMenuCloseProject(e, project.id) : handleMenuReopenProject(e, project.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '10px 14px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                color: 'var(--text-main)',
                                                textAlign: 'left',
                                                transition: 'background 0.15s',
                                                borderTop: '1px solid var(--border)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            {project.status === 'Active' ? (
                                                <><Lock size={16} /> Close Project</>
                                            ) : (
                                                <><Unlock size={16} /> Reopen Project</>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => handleMenuDeleteProject(e, project.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '10px 14px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                color: '#DC2626',
                                                textAlign: 'left',
                                                transition: 'background 0.15s',
                                                borderTop: '1px solid var(--border)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <Trash2 size={16} /> Delete Project
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{project.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Client: {project.client}</p>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                                <span style={{ fontWeight: '600' }}>{project.progress}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${project.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s' }}></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', marginLeft: '10px' }}>
                                {(project.team_names || []).slice(0, 3).map((name, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6',
                                            border: '2px solid white', marginLeft: '-10px', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: '700'
                                        }}
                                        title={name}
                                    >
                                        {name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                ))}
                                {(project.team_names || []).length > 3 && (
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9',
                                        border: '2px solid white', marginLeft: '-10px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '10px', fontWeight: '700'
                                    }}>
                                        +{(project.team_names || []).length - 3}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                <Calendar size={14} />
                                {new Date(project.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail Panel (Conditional) */}
            {selectedProject && projectDetail && (
                <div className="project-detail-panel" style={{
                    position: 'fixed', right: 0, top: 0, width: '420px', maxWidth: '90vw', height: '100vh',
                    background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 100,
                    padding: '24px', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setSelectedProject(null);
                                setProjectDetail(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}
                        >
                            <X size={16} /> Close Panel
                        </button>
                        <span style={{ padding: '4px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                            {selectedProject.name}
                        </span>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Project Hub</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '13px' }}>Edit project details below.</p>

                        {/* Editable Project Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>PROJECT NAME</label>
                                <input className="input-field" defaultValue={projectDetail.name || ''} id="edit-project-name" style={{ fontSize: '12px', width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>CLIENT</label>
                                <input className="input-field" defaultValue={projectDetail.client || ''} placeholder="Client" id="edit-project-client" style={{ fontSize: '12px', width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>DEADLINE</label>
                                <input type="date" className="input-field" defaultValue={projectDetail.deadline ? String(projectDetail.deadline).slice(0, 10) : ''} id="edit-project-deadline" style={{ fontSize: '12px', width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>STATUS</label>
                                <select className="input-field" defaultValue={projectDetail.status || 'Active'} id="edit-project-status" style={{ fontSize: '12px', width: '100%' }}>
                                    <option value="Active">Active</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const payload = {
                                            name: document.getElementById('edit-project-name')?.value,
                                            client: document.getElementById('edit-project-client')?.value,
                                            deadline: document.getElementById('edit-project-deadline')?.value || null,
                                            status: document.getElementById('edit-project-status')?.value,
                                        };
                                        try {
                                            await api.put(`/projects/${selectedProject.id}`, payload);
                                            alert('Project updated successfully');
                                            fetchProjects();
                                            fetchProjectDetail(selectedProject.id);
                                        } catch (err) {
                                            alert(err?.response?.data?.error || 'Failed to update project');
                                        }
                                    }}
                                    style={{
                                        padding: '8px 18px', background: 'var(--primary)', color: 'white',
                                        border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer',
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    <section style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} color="var(--primary)" /> Team Members ({projectDetail.members?.length || 0})
                        </h3>
                        <div style={{ marginBottom: '16px', display: 'grid', gap: '8px', gridTemplateColumns: '1fr auto' }}>
                            <select value={selectedMemberEmployee || ''} onChange={(e) => setSelectedMemberEmployee(e.target.value)} style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}>
                                <option value="">Select employee to add...</option>
                                {employees.map((emp) => {
                                    const isAlreadyMember = (projectDetail.members || []).some(m => m.id === emp.id);
                                    return !isAlreadyMember ? <option key={emp.id} value={emp.id}>{emp.full_name}</option> : null;
                                })}
                            </select>
                            <button onClick={handleAddMember} disabled={!selectedMemberEmployee} style={{ padding: '8px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: selectedMemberEmployee ? 'pointer' : 'not-allowed', opacity: selectedMemberEmployee ? 1 : 0.6 }}>Add</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {projectDetail.members.map((m, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                                            {m.full_name[0]}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{m.full_name}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.role || 'Member'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveMember(m.id)} style={{ padding: '4px 8px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </section>



                    <DailyTasksSection projectId={selectedProject.id} />

                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={handleReopenProject}
                                disabled={(projectDetail?.status || '').toLowerCase() !== 'completed'}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    cursor: (projectDetail?.status || '').toLowerCase() !== 'completed' ? 'not-allowed' : 'pointer',
                                    background: (projectDetail?.status || '').toLowerCase() === 'completed' ? '#059669' : 'var(--input-bg)',
                                    color: (projectDetail?.status || '').toLowerCase() === 'completed' ? '#FFFFFF' : 'var(--text-muted)',
                                    opacity: (projectDetail?.status || '').toLowerCase() === 'completed' ? 1 : 0.8,
                                }}
                            >
                                Reopen Project
                            </button>

                        <button
                            type="button"
                            onClick={handleCloseProject}
                            disabled={(projectDetail?.status || '').toLowerCase() === 'completed'}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '700',
                                cursor: (projectDetail?.status || '').toLowerCase() === 'completed' ? 'not-allowed' : 'pointer',
                                background: (projectDetail?.status || '').toLowerCase() === 'completed' ? 'var(--input-bg)' : '#DC2626',
                                color: (projectDetail?.status || '').toLowerCase() === 'completed' ? 'var(--text-muted)' : '#FFFFFF',
                                opacity: (projectDetail?.status || '').toLowerCase() === 'completed' ? 0.8 : 1,
                            }}
                        >
                            {(projectDetail?.status || '').toLowerCase() === 'completed' ? 'Project Already Closed' : 'Close Project'}
                        </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '500px', padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Create New Project</h2>
                        <form onSubmit={handleAddProject}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>PROJECT NAME</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Q2 System Migration"
                                    required
                                    value={newProject.name}
                                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>CLIENT</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Acme Corp"
                                    required
                                    value={newProject.client}
                                    onChange={e => setNewProject({ ...newProject, client: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>DEADLINE</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    required
                                    value={newProject.deadline}
                                    onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>ASSIGN TEAM</label>
                                <div style={{
                                    height: '150px',
                                    overflowY: 'auto',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    background: 'var(--input-bg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    {employees.filter(emp => {
                                        const role = String(emp.role || '').toLowerCase();
                                        return role !== 'admin' && role !== 'hr';
                                    }).map(emp => (
                                        <label key={emp.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            transition: 'background 0.2s',
                                            fontSize: '14px',
                                            color: 'var(--text-main)',
                                            backgroundColor: newProject.team.includes(emp.id.toString()) ? 'var(--primary)15' : 'transparent'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={newProject.team.includes(emp.id.toString())}
                                                onChange={e => {
                                                    const id = emp.id.toString();
                                                    const newTeam = e.target.checked
                                                        ? [...newProject.team, id]
                                                        : newProject.team.filter(t => t !== id);
                                                    setNewProject({ ...newProject, team: newTeam });
                                                }}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                            <span>{emp.full_name} ({emp.department})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Create Project</button>
                                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Daily Tasks Section (for HR/Admin detail panel) ─────────────
const DailyTasksSection = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
    const [showAll, setShowAll] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [employeeFilter, setEmployeeFilter] = useState('');

    useEffect(() => {
        if (projectId && modalOpen) fetchTasks();
    }, [projectId, dateFilter, showAll, modalOpen]);

    const fetchTasks = async () => {
        try {
            const query = showAll ? '' : `?date=${dateFilter}`;
            const data = await api.get(`/projects/${projectId}/tasks${query}`);
            setTasks(data || []);
        } catch (err) { setTasks([]); }
    };

    const employees = [...new Map(tasks.map(t => [t.employee_id, t.full_name])).entries()];

    const filteredTasks = employeeFilter
        ? tasks.filter(t => t.employee_id === employeeFilter)
        : tasks;

    // Flatten all tasks into a single table with date column
    const rows = filteredTasks.map(t => ({
        ...t,
        dateStr: t.date instanceof Date
            ? `${t.date.getFullYear()}-${String(t.date.getMonth()+1).padStart(2,'0')}-${String(t.date.getDate()).padStart(2,'0')}`
            : String(t.date || '').slice(0, 10),
    })).sort((a, b) => b.dateStr.localeCompare(a.dateStr) || a.full_name.localeCompare(b.full_name));

    const modal = modalOpen ? ReactDOM.createPortal(
        <div
            onClick={() => setModalOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '14px', width: '100%', maxWidth: '950px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                        Daily Task Reports {!showAll && `— ${dateFilter}`}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                        >
                            <option value="">All Employees</option>
                            {employees.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        {!showAll && (
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                            />
                        )}
                        <button
                            onClick={() => setShowAll(!showAll)}
                            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '600', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: showAll ? 'var(--primary)' : 'transparent', color: showAll ? 'white' : 'var(--text-main)' }}
                        >
                            {showAll ? 'Today Only' : 'All History'}
                        </button>
                        <button
                            onClick={() => setModalOpen(false)}
                            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '600', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#EF4444', color: 'white' }}
                        >
                            ✕ Close
                        </button>
                    </div>
                </div>

                {/* Body — single table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {rows.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px 0', fontSize: '14px' }}>No tasks found.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)' }}>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    {showAll && <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>DATE</th>}
                                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>EMPLOYEE</th>
                                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>TASK</th>
                                    <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', width: '100px' }}>STATUS</th>
                                    <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', width: '60px' }}>TIME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((t) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {showAll && <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.dateStr}</td>}
                                        <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{t.full_name}</td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-main)' }}>{t.title}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700',
                                                background: t.status === 'Finished' ? '#DCFCE7' : t.status === 'In Progress' ? '#FEF3C7' : t.status === 'Partially Finished' ? '#E0E7FF' : 'var(--input-bg)',
                                                color: t.status === 'Finished' ? '#166534' : t.status === 'In Progress' ? '#92400E' : t.status === 'Partially Finished' ? '#3730A3' : 'var(--text-muted)',
                                            }}>{t.status || 'Pending'}</span>
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>
                                            {t.time_spent ? `${t.time_spent}h` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <section style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <FileText size={16} color="var(--primary)" /> Daily Tasks
                </h3>
                <button
                    onClick={() => { setShowAll(false); setModalOpen(true); fetchTasks(); }}
                    style={{ padding: '5px 12px', fontSize: '11px', fontWeight: '600', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', background: 'var(--primary)', color: 'white' }}
                >
                    View Today
                </button>
                <button
                    onClick={() => { setShowAll(true); setModalOpen(true); fetchTasks(); }}
                    style={{ padding: '5px 12px', fontSize: '11px', fontWeight: '600', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                >
                    View All
                </button>
            </div>
            {modal}
        </section>
    );
};

export default HRProjectsPage;
