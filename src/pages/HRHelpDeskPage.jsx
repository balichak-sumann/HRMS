import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { io as createSocket } from 'socket.io-client';
import {
    FileText, MessageSquare, Clock, AlertCircle, CheckCircle,
    Filter, Search, User, Calendar, Tag, Zap, Download, Send
} from 'lucide-react';
import './HelpdeskPage.css';

const HRHelpDeskPage = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [activeTab, setActiveTab] = useState('inbox');
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all',
        priority: 'all',
        assigned_to: 'all'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Initialize Socket.IO connection on mount
    useEffect(() => {
        const nextSocket = createSocket(window.location.origin);
        setSocket(nextSocket);

        return () => {
            if (nextSocket) nextSocket.disconnect();
        };
    }, []);

    // Join WebSocket rooms on mount
    useEffect(() => {
        if (socket && user) {
            socket.emit('join_room', { roomId: 'hr_helpdesk', userId: user.id, name: user.email });
            
            // Listen for real-time updates
            socket.on('comment_added', handleRemoteCommentAdded);
            socket.on('status_changed', handleRemoteStatusChanged);
            socket.on('assignment_changed', handleRemoteAssignmentChanged);
            socket.on('ticket_created', handleRemoteTicketCreated);
        }

        return () => {
            if (socket) {
                socket.off('comment_added');
                socket.off('status_changed');
                socket.off('assignment_changed');
                socket.off('ticket_created');
            }
        };
    }, [socket, user]);

    // Fetch data on mount and when filters change
    useEffect(() => {
        fetchAllData();
    }, [filters]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.category !== 'all') params.category = filters.category;
            if (filters.priority !== 'all') params.priority = filters.priority;
            if (filters.assigned_to !== 'all') params.assigned_to = filters.assigned_to;

            const [ticketsData, teamData, statsData] = await Promise.all([
                api.get('/helpdesk/hr/all', { params }),
                api.get('/helpdesk/hr/team-members'),
                api.get('/helpdesk/hr/dashboard')
            ]);
            setTickets(ticketsData);
            setTeamMembers(teamData);
            setDashboardStats(statsData);
            if (selectedTicket && ticketsData.length > 0) {
                const updated = ticketsData.find(t => t.id === selectedTicket.id);
                if (updated) setSelectedTicket(updated);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoteCommentAdded = (data) => {
        if (selectedTicket?.id === data.ticketId) {
            fetchTicketDetails(data.ticketId);
        }
    };

    const handleRemoteStatusChanged = (data) => {
        if (selectedTicket?.id === data.ticketId) {
            setSelectedTicket(prev => ({ ...prev, status: data.status }));
        }
        setTickets(prev =>
            prev.map(t => t.id === data.ticketId ? { ...t, status: data.status } : t)
        );
    };

    const handleRemoteAssignmentChanged = (data) => {
        if (selectedTicket?.id === data.ticketId) {
            setSelectedTicket(prev => ({
                ...prev,
                assigned_to: data.assigned_to,
                assigned_to_name: data.assigned_to_name
            }));
        }
        setTickets(prev =>
            prev.map(t => t.id === data.ticketId
                ? { ...t, assigned_to: data.assigned_to, assigned_to_name: data.assigned_to_name }
                : t
            )
        );
    };

    const handleRemoteTicketCreated = (data) => {
        fetchAllData();
    };

    const fetchTicketDetails = async (ticketId) => {
        try {
            const response = await api.get(`/helpdesk/${ticketId}`);
            const ticketData = tickets.find(t => t.id === ticketId);
            setSelectedTicket({
                ...ticketData,
                ...response.ticket,
                comments: response.comments,
                attachments: response.attachments
            });
        } catch (error) {
            console.error('Failed to fetch ticket details:', error);
        }
    };

    const handleTicketSelect = (ticket) => {
        setSelectedTicket(ticket);
        fetchTicketDetails(ticket.id);
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        try {
            await api.patch(`/helpdesk/${ticketId}/status`, { status: newStatus });
            setSelectedTicket(prev => ({ ...prev, status: newStatus }));
            setTickets(prev =>
                prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
            );
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleAssignTicket = async (ticketId, assignedToId) => {
        try {
            const response = await api.patch(`/helpdesk/${ticketId}/assign`, {
                assigned_to: assignedToId
            });
            const assigneeName = teamMembers.find(m => m.id === assignedToId)?.full_name;
            setSelectedTicket(prev => ({
                ...prev,
                assigned_to: assignedToId,
                assigned_to_name: assigneeName
            }));
            setTickets(prev =>
                prev.map(t => t.id === ticketId
                    ? { ...t, assigned_to: assignedToId, assigned_to_name: assigneeName }
                    : t
                )
            );
        } catch (error) {
            console.error('Failed to assign ticket:', error);
        }
    };

    const handleAddComment = async (ticketId) => {
        if (!newComment.trim()) return;
        try {
            setSubmittingComment(true);
            const comment = await api.post(`/helpdesk/${ticketId}/comments`, {
                comment_text: newComment
            });
            setNewComment('');
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => ({
                    ...prev,
                    comments: [...(prev.comments || []), comment]
                }));
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setSubmittingComment(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            open: '#ef4444',
            in_progress: '#f59e0b',
            resolved: '#10b981',
            closed: '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
        };
        return colors[priority] || '#f59e0b';
    };

    const filteredTickets = tickets.filter(ticket =>
        !searchTerm ||
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="helpdesk-container">
            <div className="helpdesk-header">
                <h1>Helpdesk</h1>
                <div className="helpdesk-header-tabs">
                    <button
                        className={`tab-button ${activeTab === 'inbox' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inbox')}
                    >
                        <FileText size={18} /> Inbox {tickets.filter(t => t.status === 'open').length > 0 && `(${tickets.filter(t => t.status === 'open').length})`}
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <Zap size={18} /> Dashboard
                    </button>
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="helpdesk-dashboard">
                    <div className="dashboard-grid">
                        <div className="dashboard-card">
                            <div className="card-icon open">
                                <AlertCircle size={24} />
                            </div>
                            <div className="card-content">
                                <p className="card-label">Open Tickets</p>
                                <p className="card-value">{dashboardStats?.openTicketCount || 0}</p>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-icon resolved">
                                <CheckCircle size={24} />
                            </div>
                            <div className="card-content">
                                <p className="card-label">Avg Resolution Time</p>
                                <p className="card-value">{dashboardStats?.averageResolutionTime || 0}h</p>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-icon">
                                <Clock size={24} />
                            </div>
                            <div className="card-content">
                                <p className="card-label">Total Resolved</p>
                                <p className="card-value">{dashboardStats?.totalResolved || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-grid">
                        <div className="dashboard-card-wide">
                            <h3>Open Tickets by Category</h3>
                            <div className="category-stats">
                                {dashboardStats?.categoryStats?.map(stat => (
                                    <div key={stat.category} className="stat-row">
                                        <span className="stat-label">{stat.category}</span>
                                        <div className="stat-bar">
                                            <div className="stat-fill" style={{width: `${(stat.count / (dashboardStats.openTicketCount || 1)) * 100}%`}}></div>
                                        </div>
                                        <span className="stat-value">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="dashboard-card-wide">
                            <h3>Tickets by Priority</h3>
                            <div className="priority-stats">
                                {dashboardStats?.priorityStats?.map(stat => (
                                    <div key={stat.priority} className="priority-item">
                                        <span className="priority-badge" style={{backgroundColor: getPriorityColor(stat.priority)}}>
                                            {stat.priority.toUpperCase()}: {stat.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inbox' && (
                <div className="helpdesk-content">
                    <div className="helpdesk-sidebar">
                        <div className="search-bar">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="filters-section">
                            <h3>Filters</h3>
                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                >
                                    <option value="all">All Status</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Category</label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                                >
                                    <option value="all">All Categories</option>
                                    <option value="IT Issue">IT Issue</option>
                                    <option value="Payroll Query">Payroll Query</option>
                                    <option value="Leave Issue">Leave Issue</option>
                                    <option value="General HR">General HR</option>
                                    <option value="Grievance">Grievance</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Priority</label>
                                <select
                                    value={filters.priority}
                                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                                >
                                    <option value="all">All Priorities</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="tickets-list">
                            <h3>Tickets ({filteredTickets.length})</h3>
                            {filteredTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    className={`ticket-item ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                                    onClick={() => handleTicketSelect(ticket)}
                                >
                                    <div className="ticket-item-header">
                                        <span className="ticket-id">#{ticket.id.slice(0, 8)}</span>
                                        <span className="ticket-status" style={{backgroundColor: getStatusColor(ticket.status)}}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="ticket-subject">{ticket.subject}</p>
                                    <p className="ticket-employee">{ticket.employee_name}</p>
                                    <div className="ticket-meta">
                                        <span className="ticket-category">{ticket.category}</span>
                                        <span className="ticket-priority" style={{color: getPriorityColor(ticket.priority)}}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedTicket && (
                        <div className="helpdesk-detail">
                            <div className="detail-header">
                                <div>
                                    <h2>{selectedTicket.subject}</h2>
                                    <p className="detail-id">Ticket #{selectedTicket.id.slice(0, 8)}</p>
                                </div>
                                <div className="detail-status">
                                    <select
                                        value={selectedTicket.status}
                                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                                        className="status-select"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="detail-meta">
                                <div className="meta-item">
                                    <User size={16} />
                                    <span>{selectedTicket.employee_name}</span>
                                    <span className="meta-value">{selectedTicket.employee_email}</span>
                                </div>
                                <div className="meta-item">
                                    <Tag size={16} />
                                    <span>{selectedTicket.category}</span>
                                </div>
                                <div className="meta-item">
                                    <AlertCircle size={16} />
                                    <span>Priority: {selectedTicket.priority}</span>
                                </div>
                                <div className="meta-item">
                                    <Calendar size={16} />
                                    <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="assignment-section">
                                <label>Assign to</label>
                                <select
                                    value={selectedTicket.assigned_to || ''}
                                    onChange={(e) => handleAssignTicket(selectedTicket.id, e.target.value)}
                                    className="assign-select"
                                >
                                    <option value="">Unassigned</option>
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.full_name}
                                        </option>
                                    ))}
                                </select>
                                {selectedTicket.assigned_to_name && (
                                    <p className="assigned-to">Currently assigned to: {selectedTicket.assigned_to_name}</p>
                                )}
                            </div>

                            <div className="description-section">
                                <h3>Description</h3>
                                <p>{selectedTicket.description}</p>
                            </div>

                            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                <div className="attachments-section">
                                    <h3>Attachments ({selectedTicket.attachments.length})</h3>
                                    <div className="attachments-list">
                                        {selectedTicket.attachments.map(attachment => (
                                            <div key={attachment.id} className="attachment-item">
                                                <FileText size={16} />
                                                <span>{attachment.file_name}</span>
                                                <a href={`/api/helpdesk/attachments/${attachment.id}/download`} download>
                                                    <Download size={16} />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="comments-section">
                                <h3>Comments ({selectedTicket.comment_count || 0})</h3>
                                <div className="comments-list">
                                    {selectedTicket.comments?.map(comment => (
                                        <div key={comment.id} className="comment">
                                            <div className="comment-header">
                                                <span className="comment-author">{comment.user_name}</span>
                                                <span className="comment-date">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="comment-text">{comment.comment_text}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="comment-input-section">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        rows={3}
                                    />
                                    <button
                                        onClick={() => handleAddComment(selectedTicket.id)}
                                        disabled={submittingComment || !newComment.trim()}
                                        className="send-button"
                                    >
                                        <Send size={16} /> Send Comment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!selectedTicket && (
                        <div className="helpdesk-empty">
                            <FileText size={48} />
                            <p>Select a ticket to view details</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HRHelpDeskPage;
