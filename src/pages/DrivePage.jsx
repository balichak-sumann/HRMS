import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
    Folder,
    File,
    Upload,
    Search,
    MoreVertical,
    FolderPlus,
    Share2,
    Trash2,
    Download,
    ChevronRight,
    ArrowLeft,
    HardDrive,
    Users,
    ShieldAlert,
    Loader2,
    FileText,
    Image as ImageIcon,
    FileCode,
    Plus,
    Edit3
} from 'lucide-react';

const DrivePage = () => {
    const [contents, setContents] = useState({ folders: [], files: [] });
    const [storageUsage, setStorageUsage] = useState({ used_bytes: 0, quota_bytes: 10 * 1024 * 1024 * 1024 });
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState([]); // Array of { id, name }
    const [viewType, setViewType] = useState('my'); // 'my', 'shared', 'company', 'hr'
    const [searchTerm, setSearchTerm] = useState('');
    const [contextMenu, setContextMenu] = useState(null); // { x, y, item, isFolder }
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const fileInputRef = useRef(null);
    const menuRef = useRef(null);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setContextMenu(null);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setUserRole(user?.role || '');
        fetchContents();
        fetchStorageUsage();
    }, [viewType, currentPath.length]);

    const fetchContents = async () => {
        try {
            setLoading(true);
            const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
            const data = await api.get(`/drive/contents?type=${viewType}${folderId ? `&folder_id=${folderId}` : ''}`);
            setContents(data);
        } catch (error) {
            console.error('Error fetching drive:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStorageUsage = async () => {
        try {
            const usage = await api.get('/drive/storage-usage');
            setStorageUsage({
                used_bytes: Number(usage?.used_bytes || 0),
                quota_bytes: Number(usage?.quota_bytes || 10 * 1024 * 1024 * 1024),
            });
        } catch (error) {
            console.error('Error fetching storage usage:', error);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
        if (currentFolderId) formData.append('folder_id', currentFolderId);

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/drive/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) fetchContents();
            if (res.ok) fetchStorageUsage();
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    const handleCreateFolder = async () => {
        const name = newFolderName.trim();
        if (!name) return;

        const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
        try {
            await api.post('/drive/folder', {
                name,
                parent_id: parentId,
                is_company: viewType === 'company',
                is_hr_only: viewType === 'hr'
            });
            setShowFolderModal(false);
            setNewFolderName('');
            fetchContents();
        } catch (error) {
            console.error('Folder creation failed:', error);
        }
    };

    const handleRenameFolder = async (folder) => {
        const nextName = prompt('Enter new folder name:', folder?.name || '');
        if (!nextName || !nextName.trim()) return;

        try {
            await api.patch(`/drive/folders/${folder.id}`, { name: nextName.trim() });
            setContextMenu(null);
            fetchContents();
        } catch (error) {
            alert(error.message || 'Failed to rename folder');
        }
    };

    const handleDeleteFolder = async (folder) => {
        const ok = window.confirm(`Delete folder "${folder?.name || 'this folder'}" and all its contents?`);
        if (!ok) return;

        try {
            await api.delete(`/drive/folders/${folder.id}`);
            setContextMenu(null);
            fetchContents();
            fetchStorageUsage();
        } catch (error) {
            alert(error.message || 'Failed to delete folder');
        }
    };

    const handleDelete = async (id, isFolder) => {
        if (!window.confirm(`Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`)) return;
        try {
            if (isFolder) {
                // Implement folder delete route if needed
                alert('Folder deletion not implemented in this demo');
            } else {
                await api.delete(`/drive/files/${id}`);
                fetchContents();
                fetchStorageUsage();
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDownloadFile = async (file) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Your session has expired. Please sign in again.');
                return;
            }

            const res = await fetch(`/api/drive/download/${file.id}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                let message = `Download failed (${res.status})`;
                try {
                    const data = await res.json();
                    if (data?.error) message = data.error;
                } catch {
                    // Ignore non-JSON responses and use fallback message.
                }
                throw new Error(message);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name || 'download';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            alert(error.message || 'Failed to download file');
        }
    };

    const usagePercent = storageUsage.quota_bytes > 0
        ? Math.min(100, (storageUsage.used_bytes / storageUsage.quota_bytes) * 100)
        : 0;

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mime) => {
        if (mime?.includes('image')) return <ImageIcon size={20} color="#3B82F6" />;
        if (mime?.includes('pdf')) return <FileText size={20} color="#EF4444" />;
        if (mime?.includes('code') || mime?.includes('javascript')) return <FileCode size={20} color="#F59E0B" />;
        return <File size={20} color="#94A3B8" />;
    };

    return (
        <>
            <div style={{ height: 'calc(100vh - 140px)', display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
                {/* Left Sidebar Tree */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <NavButton active={viewType === 'my'} icon={<HardDrive size={18} />} label="My Files" onClick={() => { setViewType('my'); setCurrentPath([]); }} />
                        <NavButton active={viewType === 'shared'} icon={<Users size={18} />} label="Shared With Me" onClick={() => { setViewType('shared'); setCurrentPath([]); }} />
                        <NavButton active={viewType === 'company'} icon={<Plus size={18} />} label="Company Folder" onClick={() => { setViewType('company'); setCurrentPath([]); }} />
                        {(userRole === 'hr' || userRole === 'admin') && <NavButton active={viewType === 'hr'} icon={<ShieldAlert size={18} />} label="HR Documents" onClick={() => { setViewType('hr'); setCurrentPath([]); }} />}
                    </div>

                    <div className="card" style={{ padding: '20px', marginTop: 'auto' }}>
                        <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Storage Usage</p>
                        <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{ width: `${usagePercent}%`, height: '100%', background: 'var(--primary)' }}></div>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {`${formatSize(storageUsage.used_bytes)} of ${formatSize(storageUsage.quota_bytes)} used`}
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {currentPath.length > 0 && (
                                <button
                                    onClick={() => setCurrentPath(currentPath.slice(0, -1))}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', padding: '4px' }}
                                    title="Go back"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Cloud Drive</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                <ChevronRight size={16} />
                                <span onClick={() => setCurrentPath([])} style={{ cursor: 'pointer' }}>{viewType.charAt(0).toUpperCase() + viewType.slice(1)}</span>
                                {currentPath.map((p, i) => (
                                    <React.Fragment key={p.id}>
                                        <ChevronRight size={14} />
                                        <span onClick={() => setCurrentPath(currentPath.slice(0, i + 1))} style={{ cursor: 'pointer', fontWeight: i === currentPath.length - 1 ? '700' : '400', color: i === currentPath.length - 1 ? 'var(--text-main)' : undefined }}>{p.name}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Search files..."
                                    style={{ paddingLeft: '40px', width: '240px' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={() => { setNewFolderName(''); setShowFolderModal(true); }} className="btn-secondary" style={{ padding: '10px' }}><FolderPlus size={18} /></button>
                            <button onClick={() => fileInputRef.current.click()} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
                                <Upload size={18} />
                                Upload
                            </button>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="card" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Loader2 className="animate-spin" color="var(--primary)" /></div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                                {/* Folders */}
                                {contents.folders.map(folder => (
                                    <div
                                        key={folder.id}
                                        onDoubleClick={() => setCurrentPath([...currentPath, { id: folder.id, name: folder.name }])}
                                        onClick={() => {
                                            if (!contextMenu) {
                                                setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
                                            }
                                        }}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                        className="file-card"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <Folder size={28} color="#94A3B8" fill="#F1F5F9" />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setContextMenu((prev) => (
                                                        prev?.isFolder && prev?.item?.id === folder.id
                                                            ? null
                                                            : { item: folder, isFolder: true }
                                                    ));
                                                }}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                                                aria-label="Folder options"
                                            >
                                                <MoreVertical size={16} color="var(--text-muted)" />
                                            </button>
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Folder</p>

                                        {contextMenu?.isFolder && contextMenu?.item?.id === folder.id && (
                                            <div
                                                ref={menuRef}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    position: 'absolute',
                                                    top: '42px',
                                                    right: '10px',
                                                    minWidth: '150px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--card-bg)',
                                                    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
                                                    zIndex: 20,
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
                                                        setContextMenu(null);
                                                    }}
                                                    style={{ width: '100%', padding: '10px 12px', border: 'none', background: 'transparent', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                                >
                                                    Open Folder
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleRenameFolder(folder);
                                                    }}
                                                    style={{ width: '100%', padding: '10px 12px', border: 'none', background: 'transparent', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                                >
                                                    Rename Folder
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDeleteFolder(folder);
                                                    }}
                                                    style={{ width: '100%', padding: '10px 12px', border: 'none', background: 'transparent', color: '#EF4444', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                                >
                                                    Delete Folder
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Files */}
                                {contents.files.map(file => (
                                    <div
                                        key={file.id}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            position: 'relative',
                                            transition: 'all 0.2s'
                                        }}
                                        className="file-card"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            {getFileIcon(file.mime_type)}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(file.id, false);
                                                }}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSize(file.size)}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadFile(file)}
                                                style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Folder Modal */}
            {showFolderModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowFolderModal(false)}
                >
                    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Create New Folder</h3>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                            autoFocus
                            style={{ width: '100%', marginBottom: '16px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowFolderModal(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '10px' }}>Cancel</button>
                            <button onClick={handleCreateFolder} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }} disabled={!newFolderName.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .file-card:hover {
                    background: #F8FAFC;
                    transform: translateY(-2px);
                    border-color: var(--primary-light);
                }
            `}</style>
        </>
    );
};

const NavButton = ({ active, icon, label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: active ? 'var(--primary-light)' : 'transparent',
            color: active ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: active ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s'
        }}
    >
        {icon}
        {label}
    </button>
);

export default DrivePage;
