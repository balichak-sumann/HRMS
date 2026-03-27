import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user: currentUser } = useAuth();
    const socket = useRef(null);
    const [callConfig, setCallConfig] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        if (!currentUser) {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
            return;
        }

        // Initialize socket
        socket.current = io({
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socket.current.on('connect', () => {
            console.log('[Socket] Connected:', socket.current.id);
            const myId = currentUser.employee_uuid || currentUser.id;
            if (myId) {
                console.log('[Socket] Identifying as:', myId);
                socket.current.emit('identify', myId);
            }
        });

        socket.current.on('incoming_call', (data) => {
            console.log('[Socket] Global incoming call:', data);
            setCallConfig({
                type: data.type,
                remoteUser: { id: data.from, name: data.caller_name },
                isIncoming: true,
                offer: data.offer
            });
        });

        socket.current.on('call_ended', () => {
            console.log('[Socket] Global call ended');
            setCallConfig(null);
        });

        socket.current.on('user_online', (userId) => {
            setOnlineUsers(prev => new Set([...prev, userId]));
        });

        socket.current.on('user_offline', (userId) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [currentUser]);

    const value = {
        socket,
        callConfig,
        setCallConfig,
        onlineUsers
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
