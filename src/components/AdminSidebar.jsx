import React, { useMemo, useState } from 'react';
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
    const [openGroup, setOpenGroup] = useState(null);

    const menuGroups = useMemo(() => ([
        {
            label: 'Overview',
            icon: LayoutDashboard,
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
                { icon: Shield, label: 'Admin Management', path: '/admin/admin-management' },
            ],
        },
        {
            label: 'People',
            icon: Users,
            items: [
                { icon: Users, label: 'Employees', path: '/admin/employees' },
                { icon: CalendarCheck, label: 'Attendance', path: '/admin/attendance' },
                { icon: ClipboardList, label: 'Leave Requests', path: '/admin/leaves' },
                { icon: UserMinus, label: 'Offboarding', path: '/admin/employees/offboarding' },
                { icon: ClipboardList, label: 'Onboarding', path: '/admin/onboarding' },
                { icon: Briefcase, label: 'Projects', path: '/admin/projects' },
                { icon: BarChart3, label: 'Performance', path: '/admin/performance' },
            ],
        },
        {
            label: 'Payroll',
            icon: CreditCard,
            items: [
                { icon: CreditCard, label: 'Payroll', path: '/admin/payroll' },
                { icon: Settings, label: 'Statutory Settings', path: '/admin/payroll/statutory-settings' },
                { icon: FileCheck, label: 'Statutory Report', path: '/admin/payroll/statutory-compliance' },
                { icon: FileCheck, label: 'IT Declarations', path: '/admin/tax-declarations' },
                { icon: FileCheck, label: 'Form 16', path: '/admin/form16' },
                { icon: HandCoins, label: 'Leave Encashment', path: '/admin/leave-encashment' },
                { icon: Wallet, label: 'Expense Approvals', path: '/admin/expense-approvals' },
                { icon: Receipt, label: 'Reimbursement Summary', path: '/admin/reimbursement-summary' },
            ],
        },
        {
            label: 'Organization',
            icon: Building2,
            items: [
                { icon: Building2, label: 'Departments', path: '/admin/departments' },
                { icon: Network, label: 'Org Chart', path: '/admin/org-chart' },
                { icon: Laptop, label: 'Assets', path: '/admin/assets' },
                { icon: Clock3, label: 'Shift Management', path: '/admin/shifts' },
            ],
        },
        {
            label: 'Collaboration',
            icon: MessageSquare,
            items: [
                { icon: MessageSquare, label: 'Chat', path: '/admin/chat' },
                { icon: Video, label: 'Meetings', path: '/admin/meetings' },
                { icon: HardDrive, label: 'Drive', path: '/admin/drive' },
                { icon: CalendarCheck, label: 'Calendar', path: '/admin/calendar' },
                { icon: ClipboardList, label: 'Surveys', path: '/admin/surveys' },
                { icon: LifeBuoy, label: 'Helpdesk', path: '/admin/helpdesk' },
                { icon: MessageSquare, label: 'Complaints', path: '/admin/complaints' },
            ],
        },
        {
            label: 'Governance',
            icon: History,
            items: [
                { icon: History, label: 'Audit Logs', path: '/admin/audit-logs' },
            ],
        },
    ]), []);

    const isItemActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const isGroupActive = (group) => group.items.some((item) => isItemActive(item.path));

    const toggleGroup = (label) => {
        setOpenGroup((prev) => (prev === label ? null : label));
    };

    const renderLink = (item, isChild = false) => {
        const active = isItemActive(item.path);
        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && toggleSidebar()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isChild ? '10px 24px 10px 44px' : '12px 24px',
                    textDecoration: 'none',
                    color: active ? '#fff' : isChild ? '#e2e8f0' : '#cbd5e1',
                    background: active ? 'rgba(255, 255, 255, 0.15)' : isChild ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    borderLeft: active ? '4px solid #fff' : '4px solid transparent',
                    fontSize: 'var(--font-lg)',
                    fontWeight: active ? '600' : '500',
                    transition: 'all 0.2s'
                }}
            >
                {React.cloneElement(<item.icon size={20} />, { color: active ? '#fff' : '#cbd5e1' })}
                <span>{item.label}</span>
            </Link>
        );
    };

    React.useEffect(() => {
        const activeGroup = menuGroups.find((group) => isGroupActive(group));
        if (activeGroup) {
            setOpenGroup(activeGroup.label);
        }
    }, [location.pathname, menuGroups]);

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
            <Link to="/admin/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 24px' }}>
                <img src="/logo.png" alt="Company Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                <div className="brand-lockup" style={{ color: '#fff' }}>
                    <span className="brand-name-animated" style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>IndusInnovate</span>
                    <span className="brand-name-animated-subline" style={{ fontSize: '11px', fontWeight: '500', color: '#cbd5e1' }}>Admin Console</span>
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
                {menuGroups.map((group) => {
                    const groupActive = isGroupActive(group);
                    const isOpenGroup = openGroup === group.label;

                    return (
                        <div key={group.label}>
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.label)}
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
                                    {group.items.map((item) => renderLink(item, true))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

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

export default AdminSidebar;
