import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Shield,
    Users,
    CalendarCheck,
    Briefcase,
    ClipboardList,
    CreditCard,
    Building2,
    Network,
    BarChart3,
    Mail,
    History,
    Settings,
    FileCheck,
    MessageSquare,
    Wallet,
    Receipt,
    Laptop,
    Clock3,
    HandCoins,
    UserMinus,
    LifeBuoy,
    Video,
    HardDrive,
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = ({ isOpen, toggleSidebar, isMobile }) => {
    const { signOut } = useAuth();
    const location = useLocation();

    const menuItems = [
        // Admin-specific
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: <Shield size={20} />, label: 'Admin Management', path: '/admin/admin-management' },

        // All HR/Organizational Features (via admin routes)
        { icon: <Users size={20} />, label: 'Employees', path: '/admin/employees' },
        { icon: <CalendarCheck size={20} />, label: 'Attendance', path: '/admin/attendance' },
        { icon: <ClipboardList size={20} />, label: 'Leave Requests', path: '/admin/leaves' },
        { icon: <CreditCard size={20} />, label: 'Payroll', path: '/admin/payroll' },
        { icon: <Settings size={20} />, label: 'Statutory Settings', path: '/admin/payroll/statutory-settings' },
        { icon: <FileCheck size={20} />, label: 'Statutory Report', path: '/admin/payroll/statutory-compliance' },
        { icon: <FileCheck size={20} />, label: 'IT Declarations', path: '/admin/tax-declarations' },
        { icon: <FileCheck size={20} />, label: 'Form 16', path: '/admin/form16' },
        { icon: <Wallet size={20} />, label: 'Expense Approvals', path: '/admin/expense-approvals' },
        { icon: <Laptop size={20} />, label: 'Assets', path: '/admin/assets' },
        { icon: <Receipt size={20} />, label: 'Reimbursement Summary', path: '/admin/reimbursement-summary' },
        { icon: <Clock3 size={20} />, label: 'Shift Management', path: '/admin/shifts' },
        { icon: <HandCoins size={20} />, label: 'Leave Encashment', path: '/admin/leave-encashment' },
        { icon: <UserMinus size={20} />, label: 'Offboarding', path: '/admin/employees/offboarding' },
        { icon: <LifeBuoy size={20} />, label: 'Helpdesk', path: '/admin/helpdesk' },
        { icon: <ClipboardList size={20} />, label: 'Surveys', path: '/admin/surveys' },
        { icon: <Briefcase size={20} />, label: 'Projects', path: '/admin/projects' },
        { icon: <CalendarCheck size={20} />, label: 'Calendar', path: '/admin/calendar' },
        { icon: <Mail size={20} />, label: 'Offer Letters', path: '/admin/offer-letters' },
        { icon: <History size={20} />, label: 'Audit Logs', path: '/admin/audit-logs' },
        { icon: <MessageSquare size={20} />, label: 'Chat', path: '/admin/chat' },
        { icon: <Video size={20} />, label: 'Meetings', path: '/admin/meetings' },
        { icon: <HardDrive size={20} />, label: 'Drive', path: '/admin/drive' },
        { icon: <MessageSquare size={20} />, label: 'Complaints', path: '/admin/complaints' },
        { icon: <BarChart3 size={20} />, label: 'Performance', path: '/admin/performance' },
        { icon: <ClipboardList size={20} />, label: 'Onboarding', path: '/admin/onboarding' },
        { icon: <Building2 size={20} />, label: 'Departments', path: '/admin/departments' },
        { icon: <Network size={20} />, label: 'Org Chart', path: '/admin/org-chart' },
    ];

    return (
        <div className={`sidebar-fixed ${isOpen ? 'sidebar-open' : ''}`} style={{
            width: '260px',
            height: '100vh',
            background: 'var(--sidebar-bg)',
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
            <Link to="/admin/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 24px' }}>
                <img src="/logo.png" alt="Company Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                <div className="brand-lockup">
                    <span className="brand-name-animated" style={{ fontSize: '17px', fontWeight: '800' }}>IndusInnovate</span>
                    <span className="brand-name-animated-subline" style={{ fontSize: '11px', fontWeight: '500' }}>Admin Console</span>
                </div>
            </Link>

            <nav style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <style>{`
                    nav::-webkit-scrollbar { display: none; }
                `}</style>
                {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                        <Link
                            key={index}
                            to={item.path}
                            onClick={() => isMobile && toggleSidebar()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 24px',
                                textDecoration: 'none',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                background: isActive ? 'var(--input-bg)' : 'transparent',
                                borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                                fontSize: 'var(--font-lg)',
                                fontWeight: isActive ? '600' : '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            {React.cloneElement(item.icon, { color: isActive ? 'var(--primary)' : 'var(--text-muted)' })}
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div
                onClick={signOut}
                style={{
                    marginTop: 'auto',
                    borderTop: '1px solid var(--border)',
                    padding: '16px 24px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--text-muted)',
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

export default AdminSidebar;
