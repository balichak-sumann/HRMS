import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import Navbar from './Navbar';

const AdminLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--main-bg)', position: 'relative' }}>
            <div className="no-print">
                <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />
            </div>

            {isMobile && isSidebarOpen && (
                <div
                    onClick={toggleSidebar}
                    className="no-print"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 95
                    }}
                />
            )}

            <div className="main-content-wrapper" style={{
                flex: 1,
                marginLeft: isMobile ? '0' : '260px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'margin-left 0.3s ease'
            }}>
                <div className="no-print">
                    <Navbar onMenuClick={toggleSidebar} isMobile={isMobile} />
                </div>
                <main style={{
                    flex: 1,
                    padding: isMobile ? '16px' : '24px',
                    width: '100%',
                    maxWidth: '1400px',
                    margin: '0 auto'
                }}>
                    {children}
                </main>
            </div>

            <style>{`
                @media (max-width: 1024px) {
                    .sidebar-fixed {
                        transform: translateX(-100%);
                        box-shadow: none;
                    }
                    .sidebar-open {
                        transform: translateX(0);
                        box-shadow: 10px 0 20px rgba(0,0,0,0.1);
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminLayout;
