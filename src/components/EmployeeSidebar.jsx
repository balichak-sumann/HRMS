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

    const menuGroups = [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            items: [
                { icon: <LayoutDashboard size={20} />, label: 'My Dashboard', path: '/employee/dashboard' },
            ],
        },
        {
            label: 'Work',
            icon: Briefcase,
            items: [
                { icon: <CalendarCheck size={20} />, label: 'My Attendance', path: '/employee/attendance' },
                { icon: <Send size={20} />, label: 'Apply Leave', path: '/employee/apply-leave' },
                { icon: <Briefcase size={20} />, label: 'My Projects', path: '/employee/projects' },
                { icon: <CalendarCheck size={20} />, label: 'Calendar', path: '/employee/calendar' },
                { icon: <ClipboardList size={20} />, label: 'Onboarding', path: '/employee/onboarding' },
            ],
        },
        {
            label: 'Payroll',
            icon: CreditCard,
            items: [
                { icon: <FileText size={20} />, label: 'My Payslips', path: '/employee/payslips' },
                { icon: <Wallet size={20} />, label: 'Expenses', path: '/employee/expenses' },
                { icon: <Laptop size={20} />, label: 'My Assets', path: '/employee/assets' },
                { icon: <FileText size={20} />, label: 'IT Declaration', path: '/employee/tax-declaration' },
                { icon: <FileText size={20} />, label: 'Form 16', path: '/employee/form16' },
                { icon: <CreditCard size={20} />, label: 'Salary Structure', path: '/employee/salary-structure' },
                { icon: <HandCoins size={20} />, label: 'Leave Encashment', path: '/employee/leave-encashment' },
                { icon: <UserX size={20} />, label: 'Offboarding', path: '/employee/exit-interview' },
                { icon: <CreditCard size={20} />, label: 'My ID Card', path: '/employee/id-card' },
                { icon: <BarChart3 size={20} />, label: 'Performance', path: '/employee/performance' },
            ],
        },
        {
            label: 'Collaboration',
            icon: MessageSquare,
            items: [
                { icon: <LifeBuoy size={20} />, label: 'Support', path: '/employee/helpdesk' },
                { icon: <ClipboardList size={20} />, label: 'Surveys', path: '/employee/surveys' },
                { icon: <MessageSquare size={20} />, label: 'Complaint Box', path: '/employee/complaints' },
                { icon: <MessageSquare size={20} />, label: 'Chat', path: '/employee/chat' },
                { icon: <HardDrive size={20} />, label: 'Drive', path: '/employee/drive' },
                { icon: <Video size={20} />, label: 'Meetings', path: '/employee/meetings' },
            ],
        },
    ];

    const isItemActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
    const isGroupActive = (group) => group.items.some((item) => isItemActive(item.path));

    const [openGroup, setOpenGroup] = React.useState(null);

    useEffect(() => {
        const activeGroup = menuGroups.find((group) => isGroupActive(group));
        if (activeGroup) {
            setOpenGroup(activeGroup.label);
        }
    }, [location.pathname]);

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
                {menuGroups.map((group) => {
                    const groupActive = isGroupActive(group);
                    const isOpenGroup = openGroup === group.label;

                    return (
                        <div key={group.label}>
                            <button
                                type="button"
                                onClick={() => setOpenGroup((prev) => (prev === group.label ? null : group.label))}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: isOpenGroup ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    borderLeft: isOpenGroup ? '4px solid #fff' : '4px solid transparent',
                                    color: isOpenGroup ? '#fff' : '#cbd5e1',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-lg)',
                                    fontWeight: isOpenGroup ? '600' : '500',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <group.icon size={20} color={isOpenGroup ? '#fff' : '#cbd5e1'} />
                                    <span>{group.label}</span>
                                </span>
                            </button>
                            {isOpenGroup && (
                                <div>
                                    {group.items.map((item) => {
                                        const active = isItemActive(item.path);
                                        return (
                                            <Link
                                                key={item.path}
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
                                                    padding: '10px 24px 10px 44px',
                                                    textDecoration: 'none',
                                                    color: active ? '#fff' : '#e2e8f0',
                                                    background: active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                                    borderLeft: active ? '4px solid #fff' : '4px solid transparent',
                                                    fontSize: 'var(--font-lg)',
                                                    fontWeight: active ? '600' : '500',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {React.cloneElement(item.icon, { color: active ? '#fff' : '#cbd5e1' })}
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
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
