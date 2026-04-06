import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const theme = localStorage.getItem('theme') || 'light';
        const fontSize = localStorage.getItem('fontSize') || 'medium';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-font-size', fontSize);

        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await api.get('/auth/me');
                    setUser(userData);
                    setProfile(userData); // In local setup, profile is the same as user for now
                } catch (err) {
                    console.error('Auth initialization failed', err);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password, options = {}) => {
        const selectedRole = options.selectedRole || null;
        const data = await api.post('/auth/login', {
            email,
            password,
            requestedRole: selectedRole,
        });

        if (data?.requiresOtp) {
            return data;
        }

        const allowedRoles = Array.isArray(options.allowedRoles) ? options.allowedRoles : null;
        if (allowedRoles && !allowedRoles.includes(data?.user?.role)) {
            throw new Error(
                `Unauthorized. This account is registered as ${String(data?.user?.role || '').toUpperCase()}, but you tried to login as ${String(selectedRole || '').toUpperCase()}.`
            );
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);
        setProfile(data.user);
        return data;
    };

    const verifyLoginOtp = async ({ otp, preAuthToken, selectedRole, allowedRoles }) => {
        const data = await api.post('/auth/verify-login-otp', {
            otp,
            pre_auth_token: preAuthToken,
        });

        if (Array.isArray(allowedRoles) && !allowedRoles.includes(data?.user?.role)) {
            throw new Error(
                `Unauthorized. This account is registered as ${String(data?.user?.role || '').toUpperCase()}, but you tried to login as ${String(selectedRole || '').toUpperCase()}.`
            );
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);
        setProfile(data.user);
        return data;
    };

    const signOut = () => {
        localStorage.removeItem('token');
        setUser(null);
        setProfile(null);
    };

    const value = { user, profile, loading, login, verifyLoginOtp, signOut, setProfile };
    console.log('AuthProvider rendered with value:', value);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        console.error('useAuth must be used within an AuthProvider');
        return {};
    }
    return context;
};
