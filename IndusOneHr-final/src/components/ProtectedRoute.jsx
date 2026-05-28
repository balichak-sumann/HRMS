import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F9FAFB'
            }}>
                <div className="loader">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const roleList = Array.isArray(requiredRole)
        ? requiredRole
        : requiredRole
            ? [requiredRole]
            : [];

    if (roleList.length > 0 && !roleList.includes(profile?.role)) {
        const target = profile?.role === 'admin'
            ? '/admin/dashboard'
            : profile?.role === 'hr'
                ? '/hr/dashboard'
                : '/employee/dashboard';
        return <Navigate to={target} replace />;
    }

    return children;
};

export default ProtectedRoute;
