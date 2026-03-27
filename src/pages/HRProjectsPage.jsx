import React, { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Calendar, User,
    CheckCircle2, Clock, MoreVertical,
    Layout, ListTodo, FileText, ChevronRight,
    Users, Target, AlertCircle, X
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
                            <MoreVertical size={18} color="var(--text-muted)" />
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
                    position: 'fixed', right: 0, top: 0, width: '40%', height: '100vh',
                    background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 100,
                    padding: '40px', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)'
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

                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Project Hub</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Real-time team collaboration and task tracking.</p>
                    </div>

                    <section style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} color="var(--primary)" /> Team Members
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {projectDetail.members.map((m, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                                        {m.full_name[0]}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{m.full_name}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.role || 'Member'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>



                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} color="var(--primary)" /> Daily Reports
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {projectDetail.reports?.map((r, i) => (
                                <div key={i} style={{ padding: '16px', border: '1px solid var(--border)', background: 'var(--input-bg)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>{r.full_name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>{r.work_done}</p>
                                    <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                                        <span style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)' }}>{r.hours}h Worked</span>
                                        {r.blockers && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FEF2F2', borderRadius: '4px', color: '#EF4444' }}>⚠️ {r.blockers}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

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
                                    background: '#F3F4F6',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    {employees.map(emp => (
                                        <label key={emp.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            transition: 'background 0.2s',
                                            fontSize: '14px',
                                            color: '#000000',
                                            backgroundColor: newProject.team.includes(emp.id.toString()) ? '#E5E7EB' : 'transparent'
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

export default HRProjectsPage;
