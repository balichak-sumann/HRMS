import React, { useState, useEffect } from 'react';
import EmployeeSidebar from './EmployeeSidebar';
import Navbar from './Navbar';

const EmployeeLayout = ({ children }) => {
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
            <EmployeeSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />

            {/* Overlay for mobile */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={toggleSidebar}
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
                <Navbar onMenuClick={toggleSidebar} isMobile={isMobile} />
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

export default EmployeeLayout;
