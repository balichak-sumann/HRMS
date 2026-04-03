import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    CalendarCheck,
    Send,
    FileText,
    Briefcase,
    ClipboardList,
    MessageSquare,
    HardDrive,
    CreditCard,
    BarChart3,
    Wallet,
    Laptop,
    HandCoins,
    UserX,
    LifeBuoy,
    LogOut,
    Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EmployeeSidebar = ({ isOpen, toggleSidebar, isMobile }) => {
    const { signOut } = useAuth();
    const location = useLocation();
    const navRef = useRef(null);
    const SIDEBAR_SCROLL_KEY = 'employee_sidebar_scroll_top';

    useLayoutEffect(() => {
        const savedTop = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
        if (navRef.current && savedTop != null) {
            navRef.current.scrollTop = Number(savedTop) || 0;
        }
    }, [location.pathname]);

    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return undefined;

        const handleScroll = () => {
            window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
        };

        nav.addEventListener('scroll', handleScroll);
        return () => {
            handleScroll();
            nav.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'My Dashboard', path: '/employee/dashboard' },
        { icon: <CalendarCheck size={20} />, label: 'My Attendance', path: '/employee/attendance' },
        { icon: <Send size={20} />, label: 'Apply Leave', path: '/employee/apply-leave' },
        { icon: <FileText size={20} />, label: 'My Payslips', path: '/employee/payslips' },
        { icon: <Wallet size={20} />, label: 'Expenses', path: '/employee/expenses' },
        { icon: <Laptop size={20} />, label: 'My Assets', path: '/employee/assets' },
        { icon: <FileText size={20} />, label: 'IT Declaration', path: '/employee/tax-declaration' },
        { icon: <FileText size={20} />, label: 'Form 16', path: '/employee/form16' },
        { icon: <CreditCard size={20} />, label: 'Salary Structure', path: '/employee/salary-structure' },
        { icon: <HandCoins size={20} />, label: 'Leave Encashment', path: '/employee/leave-encashment' },
        { icon: <UserX size={20} />, label: 'Exit Interview', path: '/employee/exit-interview' },
        { icon: <LifeBuoy size={20} />, label: 'Support', path: '/employee/helpdesk' },
        { icon: <ClipboardList size={20} />, label: 'Surveys', path: '/employee/surveys' },
        { icon: <Briefcase size={20} />, label: 'My Projects', path: '/employee/projects' },
        { icon: <CalendarCheck size={20} />, label: 'Calendar', path: '/employee/calendar' },
        { icon: <MessageSquare size={20} />, label: 'Complaint Box', path: '/employee/complaints' },
        { icon: <MessageSquare size={20} />, label: 'Chat', path: '/employee/chat' },
        { icon: <HardDrive size={20} />, label: 'Drive', path: '/employee/drive' },
        { icon: <CreditCard size={20} />, label: 'My ID Card', path: '/employee/id-card' },
        { icon: <BarChart3 size={20} />, label: 'Performance', path: '/employee/performance' },
        { icon: <Video size={20} />, label: 'Meetings', path: '/employee/meetings' },
        { icon: <ClipboardList size={20} />, label: 'Onboarding', path: '/employee/onboarding' },
    ];

    return (
        <div className={`sidebar-fixed ${isOpen ? 'sidebar-open' : ''}`} style={{
            width: '260px',
            height: '100vh',
            background: '#334155',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 0',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 100,
            transition: 'transform 0.3s ease-in-out'
        }}>
            {/* Logo */}
            <Link to="/employee/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 24px' }}>
                <img src="/logo.png" alt="Company Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                <div className="brand-lockup" style={{ color: '#fff' }}>
                    <span className="brand-name-animated" style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>IndusInnovate</span>
                    <span className="brand-name-animated-subline" style={{ fontSize: '11px', fontWeight: '500', color: '#cbd5e1' }}>Technologies Pvt. Ltd.</span>
                </div>
            </Link>

            {/* Navigation */}
            <nav ref={navRef} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflowY: 'auto',
                scrollbarWidth: 'none', // For Firefox
                msOverflowStyle: 'none' // For Internet Explorer
            }}>
                <style>{`
                    nav::-webkit-scrollbar {
                        display: none; /* For Chrome, Safari, and Opera */
                    }
                `}</style>
                {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                        <Link
                            key={index}
                            to={item.path}
                            onClick={() => {
                                if (navRef.current) {
                                    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navRef.current.scrollTop));
                                }
                                if (isMobile) toggleSidebar();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 24px',
                                textDecoration: 'none',
                                color: isActive ? '#fff' : '#cbd5e1',
                                background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                borderLeft: isActive ? '4px solid #fff' : '4px solid transparent',
                                fontSize: 'var(--font-lg)',
                                fontWeight: isActive ? '600' : '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            {React.cloneElement(item.icon, { color: isActive ? '#fff' : '#cbd5e1' })}
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div
                onClick={signOut}
                style={{
                    marginTop: 'auto',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px 24px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#cbd5e1',
                    fontSize: 'var(--font-lg)',
                    fontWeight: '500'
                }}
            >
                <LogOut size={20} />
                <span>Logout</span>
            </div>
        </div>
    );
};

export default EmployeeSidebar;
