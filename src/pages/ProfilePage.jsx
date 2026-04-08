import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    ChevronLeft,
    Camera,
    Loader2,
    Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import CameraCaptureModal from '../components/CameraCaptureModal';

const ProfilePage = () => {
    const { profile: authProfile, setProfile: setAuthProfile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const [photoUpdating, setPhotoUpdating] = useState(false);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const fileInputRef = React.useRef(null);

    const nameValidationRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
    const allowedRoles = ['admin', 'hr', 'employee'];
    const canEditOwnRole = false;
    const isAdminUser = String(authProfile?.role || '').toLowerCase() === 'admin';
    const todayDate = new Date().toISOString().split('T')[0];
    const roleHelperText = role === 'admin'
        ? 'Admin role cannot be changed.'
        : "Role changes are restricted. Only admin can change other users' roles.";

    useEffect(() => {
        fetchProfile();
    }, []);

    const formatDisplayName = (nameStr) => {
        if (!nameStr) return '';
        if (nameStr.includes('@')) {
            const part = nameStr.split('@')[0];
            return part
                .split(/[._-]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return nameStr;
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await api.get('/user/profile');
            setUserData(data);
            setName(formatDisplayName(data.name));
            setEmail(data.email || '');
            setRole(allowedRoles.includes(String(data.role || '').toLowerCase()) ? String(data.role).toLowerCase() : '');

            // Format DATE for input type="date"
            if (data.dob) {
                setDob(new Date(data.dob).toISOString().split('T')[0]);
            } else {
                setDob('');
            }
            setAddress(data.address || '');
        } catch (error) {
            console.error('Fetch profile error:', error);
            if (authProfile) {
                setName(formatDisplayName(authProfile.full_name || authProfile.name));
                setEmail(authProfile.email || '');
                setRole(allowedRoles.includes(String(authProfile.role || '').toLowerCase()) ? String(authProfile.role).toLowerCase() : '');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error('Full Name is required.');
            return;
        }

        if (!nameValidationRegex.test(trimmedName)) {
            toast.error('Full Name can contain only alphabets, spaces, apostrophes, dots, and hyphens.');
            return;
        }

        if (canEditOwnRole && !allowedRoles.includes(role)) {
            toast.error('Please select a valid role.');
            return;
        }

        if (dob && dob > todayDate) {
            toast.error('Date of Birth cannot be in the future');
            return;
        }

        try {
            setSaving(true);
            const payload = canEditOwnRole
                ? { name: trimmedName, email, role, dob, address }
                : { name: trimmedName, email, dob, address };
            await api.put('/user/update-profile', payload);
            toast.success('Changes saved!');

            // Update local state and auth context
            if (setAuthProfile) {
                setAuthProfile(prev => ({
                    ...prev,
                    full_name: trimmedName,
                    email: email,
                    role: canEditOwnRole ? role : prev?.role
                }));
            }
            fetchProfile();
        } catch (error) {
            toast.error(error.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoChange = async (eOrFile) => {
        let file;
        if (eOrFile?.target?.files) {
            file = eOrFile.target.files[0];
        } else {
            file = eOrFile;
        }
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePhoto', file);

        try {
            setPhotoUpdating(true);
            const res = await api.put('/user/update-profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Photo updated!');

            // Refresh the profile data
            const newData = await api.get('/user/profile');
            setUserData(newData);

            if (setAuthProfile) {
                setAuthProfile(prev => ({
                    ...prev,
                    avatar_url: newData.profilePhoto,
                    profilePhoto: newData.profilePhoto
                }));
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            toast.error(error.message || 'Photo upload failed');
        } finally {
            setPhotoUpdating(false);
        }
    };

    // Use formatted state for header display
    const headerName = name || 'User';
    const displayEmail = email || authProfile?.email || '';
    const displayPhoto = userData?.profilePhoto || authProfile?.avatar_url || authProfile?.profilePhoto;

    if (loading && !authProfile) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90vh', background: '#F8F9FB' }}>
                <Loader2 className="animate-spin" size={40} color="#2563EB" />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F8F9FB',
            padding: '40px 20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        position: 'absolute',
                        left: '-60px',
                        top: '10px',
                        background: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#2563EB',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    className="profile-back-btn"
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Header Card */}
                <div className="profile-grid" style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '40px',
                    marginBottom: '32px',
                    border: '1px solid #E5E7EB',
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    alignItems: 'center',
                    gap: '40px'
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '160px',
                            height: '160px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                            fontWeight: '700',
                            color: '#2563EB',
                            border: '1px solid #E5E7EB'
                        }}>
                            {photoUpdating ? (
                                <Loader2 className="animate-spin" size={40} />
                            ) : displayPhoto ? (
                                <img
                                    src={displayPhoto.startsWith('http') ? displayPhoto : `${displayPhoto}`}
                                    alt="User"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    key={displayPhoto} // Force refresh image
                                />
                                    disabled={!isAdminUser || saving}
                                <span>{headerName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()}</span>
                            )}
                                    {isAdminUser
                                        ? 'As admin, you can update this email.'
                                        : 'Only admin can change email.'}
                        <div style={{ position: 'absolute', bottom: '5px', right: '5px' }}>
                            <button 
                                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}
                            >
                                <Camera size={20} color="var(--text-muted)" />
                            </button>
                            
                            {showPhotoOptions && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: '0',
                                    marginBottom: '8px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    width: '140px',
                                    zIndex: 10
                                }}>
                                    <button 
                                        onClick={() => {
                                            setShowPhotoOptions(false);
                                            fileInputRef.current?.click();
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            textAlign: 'left',
                                            background: 'none',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            width: '100%',
                                            color: 'var(--text-main)'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = 'var(--input-bg)'}
                                        onMouseOut={(e) => e.target.style.background = 'none'}
                                    >
                                        Upload Photo
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setShowPhotoOptions(false);
                                            setShowCameraModal(true);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            textAlign: 'left',
                                            background: 'none',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            width: '100%',
                                            color: 'var(--text-main)'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = 'var(--input-bg)'}
                                        onMouseOut={(e) => e.target.style.background = 'none'}
                                    >
                                        Take Photo
                                    </button>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handlePhotoChange} 
                                style={{ display: 'none' }} 
                                accept="image/*" 
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{headerName}</h1>
                        <p style={{ fontSize: '18px', color: '#6B7280' }}>{displayEmail}</p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E5E7EB' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '32px' }}>Personal Information</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <label className="input-label">Full Name</label>
                                <input
                                    className="ref-input"
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        const sanitized = e.target.value.replace(/[^A-Za-z\s.'-]/g, '');
                                        setName(sanitized);
                                    }}
                                    placeholder="Enter your full name"
                                />
                            </div>
                            <div>
                                <label className="input-label">Email Address</label>
                                <input
                                    className="ref-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    disabled
                                />
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                                    Email cannot be changed once the account is created.
                                </p>
                            </div>
                        </div>

                        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <label className="input-label">Role</label>
                                <select
                                    className="ref-input"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={!canEditOwnRole}
                                >
                                    <option value="">Select role</option>
                                    <option value="admin">Admin</option>
                                    <option value="hr">HR</option>
                                    <option value="employee">Employee</option>
                                </select>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                                    {roleHelperText}
                                </p>
                            </div>
                            <div>
                                <label className="input-label">Date of Birth</label>
                                <input
                                    className="ref-input"
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    max={todayDate}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Address</label>
                            <textarea
                                className="ref-input"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter your full address"
                                rows="3"
                                style={{ resize: 'none' }}
                            />
                        </div>

                        <div>
                            <label className="input-label">Account Created</label>
                            <p style={{ fontSize: '16px', color: '#6B7280', marginTop: '4px' }}>
                                Joined on {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>

                        <button
                            onClick={handleUpdateProfile}
                            disabled={saving}
                            style={{
                                background: '#2563EB',
                                color: 'white',
                                border: 'none',
                                padding: '14px 28px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: 'fit-content',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '8px',
                                transition: 'background 0.2s'
                            }}
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                .input-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 8px;
                }
                
                .ref-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #D1D5DB;
                    border-radius: 8px;
                    font-size: 16px;
                    color: #111827;
                    outline: none;
                    transition: all 0.2s;
                    background: white;
                }
                
                .ref-input:focus {
                    border-color: #2563EB;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <CameraCaptureModal 
                isOpen={showCameraModal} 
                onClose={() => setShowCameraModal(false)} 
                onCapture={handlePhotoChange} 
            />
        </div>
    );
};

export default ProfilePage;
