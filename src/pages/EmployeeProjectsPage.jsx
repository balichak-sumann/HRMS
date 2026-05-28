import React, { useState, useEffect } from 'react';
import {
    Briefcase, Send, Clock, AlertCircle,
    History, CheckCircle, ListTodo, FileText
} from 'lucide-react';
import { api } from '../lib/api';

const EmployeeProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [formData, setFormData] = useState({
        work_done: '',
        hours: '',
        blockers: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const projectsData = await api.get('/projects');
            const reportsData = await api.get('/projects/reports/my');
            setProjects(projectsData);
            setReports(reportsData);
        } catch (err) {
            console.error('Failed to fetch project data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;
        try {
            await api.post(`/projects/${selectedProject.id}/reports`, formData);
            alert('Report submitted successfully!');
            setFormData({ work_done: '', hours: '', blockers: '' });
            setSelectedProject(null);
            fetchData();
        } catch (err) {
            alert('Failed to submit report');
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '4px' }}>My Projects</h1>
                <p style={{ color: 'var(--text-muted)' }}>Contribute to your assigned missions and log daily progress.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
                {/* Assignment List */}
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={18} color="var(--primary)" /> Assigned Missions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {projects.map((p) => (
                            <div
                                key={p.id}
                                className={`card ${selectedProject?.id === p.id ? 'active' : ''}`}
                                onClick={() => setSelectedProject(p)}
                                style={{
                                    cursor: 'pointer',
                                    border: selectedProject?.id === p.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h4 style={{ fontWeight: '700' }}>{p.name}</h4>
                                    <span className={`project-status-${(p.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                                        {p.status || 'Active'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Client: {p.client}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Progress: {p.progress}%</p>
                                <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--primary)' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Report Form */}
                <div>
                    {selectedProject && (
                        <div className="card" style={{ padding: '32px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Submit Daily Report</h3>
                            <form onSubmit={handleSubmitReport}>
                                <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--primary)10', borderLeft: '4px solid var(--primary)', borderRadius: '4px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700' }}>REPORTING FOR</p>
                                    <p style={{ fontWeight: '600' }}>{selectedProject.name}</p>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>WORK COMPLETED</label>
                                    <textarea
                                        className="input-field"
                                        style={{ height: '120px', resize: 'none' }}
                                        placeholder="What did you accomplish today?"
                                        required
                                        value={formData.work_done}
                                        onChange={e => setFormData({ ...formData, work_done: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>HOURS SPENT</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="e.g. 7.5"
                                            required
                                            step="0.5"
                                            value={formData.hours}
                                            onChange={e => setFormData({ ...formData, hours: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>BLOCKERS (OPTIONAL)</label>
                                        <input
                                            className="input-field"
                                            placeholder="Any hurdles?"
                                            value={formData.blockers}
                                            onChange={e => setFormData({ ...formData, blockers: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    style={{
                                        width: '100%', padding: '14px', background: 'var(--primary)', color: 'white',
                                        border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <Send size={18} /> Submit Transmission
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Report History */}
            <div style={{ marginTop: '48px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={18} color="var(--primary)" /> Transmission History
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reports.map((r, i) => (
                        <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ padding: '8px', background: '#F0F7FF', borderRadius: '8px' }}>
                                    <FileText size={20} color="var(--primary)" />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{r.project_name}</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EFFORT</p>
                                    <p style={{ fontWeight: '600' }}>{r.hours}h</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '12px', fontWeight: '700' }}>
                                        <CheckCircle size={14} /> Logged
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EmployeeProjectsPage;
