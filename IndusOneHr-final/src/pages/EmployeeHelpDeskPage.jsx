import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { io as createSocket } from 'socket.io-client';
import {
    FileText, MessageSquare, Plus, Send, Download, AlertCircle,
    CheckCircle, Clock, Tag, Calendar, Paperclip, X, Upload
} from 'lucide-react';
import './HelpdeskPage.css';

const EmployeeHelpDeskPage = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [activeTab, setActiveTab] = useState('list');
    const [ticketViewType, setTicketViewType] = useState('created'); // 'created' or 'assigned'
    const [tickets, setTickets] = useState([]);
    const [assignedTickets, setAssignedTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filters, setFilters] = useState({ status: 'all', category: 'all' });

    const [formData, setFormData] = useState({
        category: 'General HR',
        subject: '',
        description: '',
        priority: 'medium',
        attachment: null
    });

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
                socket.emit('join_room', { roomId: `employee_${user.id}`, userId: user.id, name: user.email });
            
            // Listen for real-time updates
                socket.on('status_changed', handleRemoteStatusChanged);
                socket.on('comment_added', handleRemoteCommentAdded);
                socket.on('assignment_changed', handleRemoteAssignmentChanged);
        }

        return () => {
                if (socket) {
                    socket.off('status_changed');
                    socket.off('comment_added');
                    socket.off('assignment_changed');
            }
        };
        }, [socket, user]);

    // Fetch tickets on mount
    useEffect(() => {
        fetchTickets();
    }, [filters, ticketViewType]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.category !== 'all') params.category = filters.category;

            const endpoint = ticketViewType === 'assigned' ? '/helpdesk/my/assigned' : '/helpdesk/my/tickets';
            const data = await api.get(endpoint, { params });
            
            if (ticketViewType === 'assigned') {
                setAssignedTickets(data);
                if (selectedTicket && data.length > 0) {
                    const updated = data.find(t => t.id === selectedTicket.id);
                    if (updated) setSelectedTicket(updated);
                }
            } else {
                setTickets(data);
                if (selectedTicket && data.length > 0) {
                    const updated = data.find(t => t.id === selectedTicket.id);
                    if (updated) setSelectedTicket(updated);
                }
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoteStatusChanged = (data) => {
        if (selectedTicket?.id === data.ticketId) {
            setSelectedTicket(prev => ({ ...prev, status: data.status }));
        }
        setTickets(prev =>
            prev.map(t => t.id === data.ticketId ? { ...t, status: data.status } : t)
        );
        setAssignedTickets(prev =>
            prev.map(t => t.id === data.ticketId ? { ...t, status: data.status } : t)
        );
    };

    const handleRemoteCommentAdded = (data) => {
        if (selectedTicket?.id === data.ticketId) {
            fetchTicketDetails(data.ticketId);
        }
    };

    const handleRemoteAssignmentChanged = (data) => {
        if (selectedTicket?.id === data.ticketId) {
            setSelectedTicket(prev => ({
                ...prev,
                assigned_to: data.assigned_to,
                assigned_to_name: data.assigned_to_name || null
            }));
        }
        setTickets(prev =>
            prev.map(t => t.id === data.ticketId
                ? { ...t, assigned_to: data.assigned_to, assigned_to_name: data.assigned_to_name || null }
                : t
            )
        );
        setAssignedTickets(prev =>
            prev.map(t => t.id === data.ticketId
                ? { ...t, assigned_to: data.assigned_to, assigned_to_name: data.assigned_to_name || null }
                : t
            )
        );
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

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!formData.category || !formData.subject || !formData.description) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const ticketData = {
                category: formData.category,
                subject: formData.subject,
                description: formData.description,
                priority: formData.priority
            };

            const newTicket = await api.post('/helpdesk', ticketData);

            // Upload attachment if provided
            if (formData.attachment) {
                const fileFormData = new FormData();
                fileFormData.append('file', formData.attachment);
                try {
                    await api.post(`/helpdesk/${newTicket.id}/attachments`, fileFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } catch (err) {
                    console.error('Failed to upload attachment:', err);
                }
            }

            setTickets([newTicket, ...tickets]);
            setFormData({
                category: 'General HR',
                subject: '',
                description: '',
                priority: 'medium',
                attachment: null
            });
            setShowCreateForm(false);
            setActiveTab('list');
        } catch (error) {
            console.error('Failed to create ticket:', error);
            alert('Failed to create ticket');
        }
    };

    const handleTicketSelect = (ticket) => {
        setSelectedTicket(ticket);
        fetchTicketDetails(ticket.id);
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
                    comments: [...(prev.comments || []), comment],
                    comment_count: (prev.comment_count || 0) + 1
                }));
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }
        setFormData({...formData, attachment: file});
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

    const getStatusIcon = (status) => {
        switch(status) {
            case 'open': return <AlertCircle size={18} />;
            case 'in_progress': return <Clock size={18} />;
            case 'resolved': return <CheckCircle size={18} />;
            case 'closed': return <CheckCircle size={18} />;
            default: return <FileText size={18} />;
        }
    };

    return (
        <div className="helpdesk-container">
            <div className="helpdesk-header">
                <h1>My Support Tickets</h1>
                <button
                    className="create-button"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                >
                    <Plus size={18} /> {showCreateForm ? 'Cancel' : 'New Ticket'}
                </button>
            </div>

            {showCreateForm && (
                <div className="create-form-container">
                    <form onSubmit={handleCreateTicket} className="create-ticket-form">
                        <h2>Create Support Ticket</h2>
                        
                        <div className="form-group">
                            <label>Category *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                required
                            >
                                <option value="IT Issue">IT Issue</option>
                                <option value="Payroll Query">Payroll Query</option>
                                <option value="Leave Issue">Leave Issue</option>
                                <option value="General HR">General HR</option>
                                <option value="Grievance">Grievance</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Subject *</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                placeholder="Brief description of your issue"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Detailed description of your issue"
                                rows={5}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Attachment</label>
                                <div className="file-input-wrapper">
                                    <input
                                        type="file"
                                        id="file-input"
                                        onChange={handleFileSelect}
                                        className="file-input"
                                    />
                                    <label htmlFor="file-input" className="file-input-label">
                                        <Upload size={18} /> {formData.attachment ? formData.attachment.name : 'Choose file...'}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="submit-button">
                            Submit Ticket
                        </button>
                    </form>
                </div>
            )}

            <div className="helpdesk-content">
                <div className="helpdesk-sidebar">
                    <div className="filters-section">
                        <h3>Filter Tickets</h3>
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
                    </div>

                    <div className="tickets-list">
                        <div className="tickets-tabs">
                            <button
                                className={`tab-button ${ticketViewType === 'created' ? 'active' : ''}`}
                                onClick={() => {
                                    setTicketViewType('created');
                                    setSelectedTicket(null);
                                }}
                            >
                                My Tickets ({tickets.length})
                            </button>
                            <button
                                className={`tab-button ${ticketViewType === 'assigned' ? 'active' : ''}`}
                                onClick={() => {
                                    setTicketViewType('assigned');
                                    setSelectedTicket(null);
                                }}
                            >
                                Assigned to Me ({assignedTickets.length})
                            </button>
                        </div>
                        {loading ? (
                            <p className="loading-text">Loading tickets...</p>
                        ) : (ticketViewType === 'created' ? tickets : assignedTickets).length === 0 ? (
                            <div className="empty-list">
                                <FileText size={32} />
                                <p>{ticketViewType === 'created' ? 'No tickets created yet' : 'No tickets assigned to you'}</p>
                            </div>
                        ) : (
                            (ticketViewType === 'created' ? tickets : assignedTickets).map(ticket => (
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
                                    <div className="ticket-meta">
                                        <span className="ticket-category">{ticket.category}</span>
                                        <span className="ticket-priority" style={{color: getPriorityColor(ticket.priority)}}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    {ticket.comment_count > 0 && (
                                        <div className="ticket-comments-count">
                                            <MessageSquare size={14} /> {ticket.comment_count}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {selectedTicket && (
                    <div className="helpdesk-detail">
                        <div className="detail-header">
                            <div>
                                <h2>{selectedTicket.subject}</h2>
                                <p className="detail-id">Ticket #{selectedTicket.id.slice(0, 8)}</p>
                            </div>
                            <div className="status-badge" style={{backgroundColor: getStatusColor(selectedTicket.status)}}>
                                {getStatusIcon(selectedTicket.status)}
                                {selectedTicket.status}
                            </div>
                        </div>

                        <div className="detail-meta">
                            <div className="meta-item">
                                <Tag size={16} />
                                <span>{selectedTicket.category}</span>
                            </div>
                            <div className="meta-item">
                                <AlertCircle size={16} />
                                <span>Priority: <strong style={{color: getPriorityColor(selectedTicket.priority)}}>{selectedTicket.priority}</strong></span>
                            </div>
                            <div className="meta-item">
                                <Calendar size={16} />
                                <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                            </div>
                            {selectedTicket.assigned_to_name && (
                                <div className="meta-item">
                                    <CheckCircle size={16} />
                                    <span>Assigned to: {selectedTicket.assigned_to_name}</span>
                                </div>
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
                                            <Paperclip size={16} />
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
                            <h3>Updates & Comments ({selectedTicket.comment_count || 0})</h3>
                            <div className="comments-list">
                                {selectedTicket.comments?.length === 0 ? (
                                    <p className="no-comments">No comments yet. HR will respond to your ticket soon.</p>
                                ) : (
                                    selectedTicket.comments?.map(comment => (
                                        <div key={comment.id} className="comment">
                                            <div className="comment-header">
                                                <span className="comment-author">{comment.user_name}</span>
                                                <span className="comment-date">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="comment-text">{comment.comment_text}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="comment-input-section">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment or provide more details..."
                                    rows={3}
                                />
                                <button
                                    onClick={() => handleAddComment(selectedTicket.id)}
                                    disabled={submittingComment || !newComment.trim()}
                                    className="send-button"
                                >
                                    <Send size={16} /> Add Comment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!selectedTicket && !loading && (
                    <div className="helpdesk-empty">
                        <FileText size={48} />
                        <p>{tickets.length === 0 ? 'Create your first support ticket' : 'Select a ticket to view details'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeHelpDeskPage;
