# Complete Application Flow Guide - IndusInnovate HRMS

## 📊 Overview
This document maps the complete flow of pages, roles, and connections in the IndusInnovate HRMS system.

---

## 🔐 AUTHENTICATION FLOW

```
┌─────────────────────────────────────────────────────────────┐
│  UNAUTHENTICATED USER (ANY ROLE)                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   LOGIN PAGE         │
        │  /login              │
        │                      │
        │ - Email              │
        │ - Password           │
        │                      │
        │ Generates JWT Token  │
        └──────┬───────┬───────┘
               │       │
         ┌─────▼─┐   ┌─▼──────┐
         │ FIRST │   │ ALREADY│
         │LOGIN? │   │ LOGGED?│
         └─────┬─┘   └─┬──────┘
               │       │
               ▼       │
        ┌─────────────┐│
        │ Reset Pass  ││
        │ Page        ││
        │ (Required)  ││
        └────────┬────┘│
                 │ ┌───┘
                 ▼ ▼
        ┌──────────────────────┐
        │  Redirect by Role    │
        │  Status Check        │
        │                      │
        │ • pending_activation │
        │   → Reset Password   │
        │ • inactive           │
        │   → Access Denied    │
        │ • active             │
        │   → Dashboard        │
        └──────┬───┬───┬───────┘
               │   │   │
        ┌──────▼┐┌─▼──┐┌─▼──────┐
        │ ADMIN ││ HR ││EMPLOYEE│
        │ROUTE  ││ROUT││ ROUTE  │
        └───────┘└────┘└────────┘
```

**Key Authentication Features:**
- Email & Password validation
- JWT token generation (8 hours expiry)
- Password hashing with bcryptjs
- First-login password reset requirement
- Account status check (pending_activation, active, inactive)
- Bounce webhook auto-deactivation on email bounce
- Role-based access control (admin, hr, employee)

**Related Pages:**
- `/login` → LoginPage.jsx
- `/forgot-password` → ForgotPasswordPage.jsx (Fixed: Now checks both profiles & employees tables)
- `/reset-password` → ResetPasswordPage.jsx (Sets profile status to 'active')

---

## 👤 ADMIN DASHBOARD FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN LOGIN                                                    │
│  /admin/dashboard (HRDashboard.jsx - Shared with HR)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬────────────────────────────┐
         │             │             │                            │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐                  ┌────►────┐
    │ ADMIN   │  │ EMPLOYEE │  │ PAYROLL │                  │SETTINGS │
    │MGMT     │  │MANAGEMENT│  │MANAGEMENT                  │/ PROFILE│
    │         │  │          │  │         │                  │         │
    └────┬────┘  └────┬─────┘  └────┬────┘                  └─────────┘
         │            │            │
    ┌────▼─────────┬──▼─────────┬──▼──────────────────────────────┐
    │              │            │                                 │
┌───┴──┐      ┌────▼───┐  ┌──────┴──┐  ┌──────────┐  ┌────────┐  │
│Admin │      │Employee│  │ Payroll │  │ Statutory│  │ IT     │  │
│Mgmt  │      │Profile │  │ & Salary│  │Settings  │  │Decl &  │  │
│Page  │      │Manager │  │ Manager │  │/Compliance  │Form16  │  │
└──────┘      └────┬───┘  └────┬────┘  └──────────┘  └────────┘  │
               (UPDATE      (VIEW &                                 │
               EMPLOYEES)   UPDATE)                                │
                │            │                                     │
             ┌──▼────────────▼──┐                                  │
             │ Employees Page   │                                  │
             │ /admin/employees │                                  │
             │ (Add/Edit/Delete)│                                  │
             └────────┬─────────┘                                  │
                      │                                            │
         ┌────────────┼────────────┬─────────────────────────────┐ │
         │            │            │                             │ │
    ┌────▼─────┐ ┌────▼──┐   ┌────▼────┐  ┌──────────┐  ┌──────▼┘ │
    │Offer      │ │Attend │   │Projects │  │ Onboard  │  │OffBoard │
    │Letters    │ │ance   │   │Manager  │  │Manager   │  │Manager  │
    │Mgr        │ │Mgr    │   │         │  │          │  │         │
    └───────────┘ └───────┘   └────┬────┘  └──────────┘  └─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ Org Chart/Dept    │
                         │ Visualization     │
                         └───────────────────┘
    
    ┌──────────────────────────────────────────────────────────┐
    │ OPERATIONAL PAGES (Also accessible from Admin Dashboard) │
    ├──────────────────────────────────────────────────────────┤
    │ • Chat (/admin/chat) - Real-time messaging               │
    │ • Meetings (/admin/meetings) - Schedule & host meetings  │
    │ • Drive (/admin/drive) - File storage & sharing          │
    │ • Complaints (/admin/complaints) - Review complaints     │
    │ • Performance (/admin/performance) - Appraisal cycles    │
    │ • Surveys (/admin/surveys) - Create & view surveys       │
    │ • Audit Logs (/admin/audit-logs) - System activity log   │
    │ • Helpdesk (/admin/helpdesk) - Support tickets           │
    │ • Leave Encashment (/admin/leave-encashment)             │
    │ • Expense Approvals (/admin/expense-approvals)           │
    │ • Reimbursement (/admin/reimbursement-summary)           │
    │ • Shift Management (/admin/shifts)                       │
    │ • Assets (/admin/assets) - Track IT equipment            │
    └──────────────────────────────────────────────────────────┘
```

### Admin-Specific Feature: Admin Management
- **Path:** `/admin/admin-management`
- **Purpose:** Create and manage other admin accounts
- **Access:** Only system admins

### Admin Capabilities
✅ Can access ALL HR pages & admin-specific pages
✅ Create/Edit/Delete employees
✅ Manage appraisal cycles
✅ View audit logs
✅ Create admin accounts
✅ Access employee data across all modules

---

## 💼 HR DASHBOARD FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  HR LOGIN                                                       │
│  /hr/dashboard (HRDashboard.jsx - Shared with Admin)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┼──────────────┬──────────────────────────┐
         │             │              │                          │
    ┌────▼────┐  ┌────▼────┐   ┌────▼────┐              ┌──────▼────┐
    │ EMPLOYEE│  │ PAYROLL  │   │LEAVE &  │              │SETTINGS   │
    │MANAGEMENT│  │MANAGEMENT│  │ATTENDANCE              │/PROFILE   │
    │         │  │         │   │MANAGEMENT              │          │
    └────┬────┘  └────┬────┘   └────┬────┘              └───────────┘
         │            │            │
         │            │        ┌───▼────────┬──────────┬────────────┐
         │            │        │            │          │            │
    ┌────▼─────┐ ┌───▼──┐  ┌─▼──────┐  ┌──▼──────┐  ┌─▼──┐    ┌──▼───┐
    │Employees │ │Payroll  │ │Leave    │ │Attendance  │ │Shift  │ │Leave │
    │Page      │ │Viewer   │ │Requests │ │Dashboard   │ │Mgmt   │ │Encash│
    │/hr/emplo │ │         │ │         │ │  & Marking │ │       │ │      │
    │yees      │ │& Slip   │ │ Approve │ │            │ │       │ │      │
    │          │ │Gen      │ │ Reject  │ │            │ │       │ │      │
    └──────────┘ └────┬────┘ └────┬────┘ └────────────┘ └───────┘ └──────┘
                      │            │
                ┌─────▼────────────▼────┐
                │ Payroll Statutory      │
                │ • Tax Declarations     │
                │ • Form 16              │
                │ • Compliance Reports   │
                └────────────────────────┘
    
    ┌──────────────────────────────────────────────────────────┐
    │ TALENT MANAGEMENT PAGES                                  │
    ├──────────────────────────────────────────────────────────┤
    │ • Performance (/hr/performance)                          │
    │   - Create appraisal cycles                              │
    │   - Track completion status                              │
    │   - View scores (Populated by employees)                 │
    │                                                           │
    │ • Onboarding (/hr/onboarding)                            │
    │   - Track new employee onboarding progress               │
    │   - Assign tasks                                         │
    │                                                           │
    │ • Departments (/hr/departments)                          │
    │   - Manage organizational departments                    │
    │                                                           │
    │ • Org Chart (/hr/org-chart)                              │
    │   - View reporting hierarchy                             │
    │   - Visualize team structure                             │
    └──────────────────────────────────────────────────────────┘
    
    ┌──────────────────────────────────────────────────────────┐
    │ OPERATIONAL PAGES (Shared with Admin)                    │
    ├──────────────────────────────────────────────────────────┤
    │ • Chat (/hr/chat)                                        │
    │ • Meetings (/hr/meetings)                                │
    │ • Drive (/hr/drive)                                      │
    │ • Complaints (/hr/complaints)                            │
    │ • Surveys (/hr/surveys)                                  │
    │ • Projects (/hr/projects)                                │
    │ • Helpdesk (/hr/helpdesk)                                │
    │ • Offer Letters (/hr/offer-letters)                      │
    │ • Calendar (/hr/calendar)                                │
    │ • Expense Approvals (/hr/expense-approvals)              │
    │ • Assets (/hr/assets)                                    │
    │ • Reimbursement (/hr/reimbursement-summary)              │
    └──────────────────────────────────────────────────────────┘
```

### HR Key Responsibilities
✅ Create & manage employees
✅ Manage leave requests (approve/reject)
✅ Process payroll & generate salary slips
✅ Track attendance
✅ Create appraisal cycles (Employees populate data)
✅ Manage onboarding & offboarding
✅ Department & organizational management
✅ Cannot create admin accounts (Admin-only)
❌ Cannot view audit logs (Admin-only)

---

## 👨‍💼 EMPLOYEE DASHBOARD FLOW

```
┌──────────────────────────────────────────────────────────────────┐
│  EMPLOYEE LOGIN                                                  │
│  /employee/dashboard (EmployeeDashboard.jsx)                    │
└────────────┬───────────┬────────────┬──────────────┬─────────────┘
             │           │            │              │
        ┌────▼──┐   ┌────▼──┐   ┌────▼──┐      ┌───▼──┐
        │LEAVE  │   │PAYROLL│   │PROJECTS│     │COMM  │
        │MGMT   │   │       │   │        │     │PAGES │
        └────┬──┘   └────┬──┘   └────┬───┘     └──────┘
             │           │           │
        ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
        │ Apply   │ │ Payslips│ │My       │
        │ Leave   │ │ & Slip  │ │Projects │
        │         │ │ Details │ │ & Tasks │
        └────┬────┘ └────┬────┘ └────────┘
             │           │
             └────┬──────┘
                  │
         ┌────────▼────────┐
         │ Statutory Pages │
         │ • Tax Decl      │
         │ • Form 16       │
         │ • Sal Structure │
         │ • Leave Encash  │
         │ • Exit Interview│
         └────────────────┘

    MY INFORMATION PAGES:
    ┌──────────────────────────────────────────────────┐
    │ • My Dashboard (/employee/dashboard)             │
    │   - KPI cards                                    │
    │   - Attendance status                            │
    │   - Upcoming leaves                              │
    │   - Birthday announcements                       │
    │                                                  │
    │ • My Attendance (/employee/attendance)           │
    │   - Check-in/Check-out history                   │
    │   - Present/Absent status                        │
    │   - Late arrivals                                │
    │                                                  │
    │ • My Payslips (/employee/payslips)               │
    │   - View salary slips                            │
    │   - Download PDF                                 │
    │   - Salary structure breakdown                   │
    │                                                  │
    │ • Apply Leave (/employee/apply-leave)            │
    │   - Submit leave requests                        │
    │   - View leave balance                           │
    │   - Check history                                │
    │                                                  │
    │ • My Assets (/employee/assets)                   │
    │   - View assigned IT equipment                   │
    │   - Return requests                              │
    │                                                  │
    │ • My ID Card (/employee/id-card)                 │
    │   - View digital employee ID                     │
    │   - Download as PDF                              │
    └──────────────────────────────────────────────────┘

    TAX & FINANCIAL PAGES:
    ┌──────────────────────────────────────────────────┐
    │ • Expenses (/employee/expenses)                  │
    │   - Submit expense claims                        │
    │   - Track reimbursements                         │
    │                                                  │
    │ • IT Declaration (/employee/tax-declaration)     │
    │   - 80C section investments                      │
    │   - HRA exemption                                │
    │   - Medical insurance                            │
    │                                                  │
    │ • Form 16 (/employee/form16)                     │
    │   - View annual tax certificate                  │
    │   - Download PDF                                 │
    │                                                  │
    │ • Salary Structure (/employee/salary-structure)  │
    │   - Base salary breakdown                        │
    │   - Deductions & benefits                        │
    │                                                  │
    │ • Leave Encashment (/employee/leave-encashment)  │
    │   - Request unused leave payout                  │
    │                                                  │
    │ • Exit Interview (/employee/exit-interview)      │
    │   - Offboarding form                             │
    │   - Exit survey                                  │
    └──────────────────────────────────────────────────┘

    PERFORMANCE & DEVELOPMENT:
    ┌──────────────────────────────────────────────────┐
    │ • My Performance (/employee/performance)         │
    │   - Set goals for active cycle                   │
    │   - Self-appraisal submission                    │
    │   - Manager feedback                             │
    │   - Peer feedback                                │
    │   - View scores (Auto-populated from HR)         │
    │                                                  │
    │ • Surveys (/employee/surveys)                    │
    │   - Fill survey forms                            │
    │   - View survey results                          │
    │                                                  │
    │ • Onboarding (/employee/onboarding)              │
    │   - Complete onboarding tasks                    │
    │   - Track progress                               │
    └──────────────────────────────────────────────────┘

    COMMUNICATION & COLLABORATIVE PAGES:
    ┌──────────────────────────────────────────────────┐
    │ • Chat (/employee/chat)                          │
    │   - Real-time messaging                          │
    │   - 1-on-1 & group chats                         │
    │                                                  │
    │ • Meetings (/employee/meetings)                  │
    │   - Join scheduled meetings                      │
    │   - Video conferences                            │
    │                                                  │
    │ • Drive (/employee/drive)                        │
    │   - Store files                                  │
    │   - Share documents                              │
    │                                                  │
    │ • Complaints (/employee/complaints)              │
    │   - Submit grievances                            │
    │   - Track complaint status                       │
    │                                                  │
    │ • Support/Helpdesk (/employee/helpdesk)          │
    │   - Raise support tickets                        │
    │   - View ticket history                          │
    │                                                  │
    │ • Projects (/employee/projects)                  │
    │   - View assigned projects                       │
    │   - Task management                              │
    │                                                  │
    │ • Calendar (/employee/calendar)                  │
    │   - Team calendar view                           │
    │   - Holiday schedule                             │
    └──────────────────────────────────────────────────┘
```

### Employee Capabilities
✅ Apply leave & track balance
✅ View payslips & salary structure
✅ Set goals & submit self-appraisals
✅ Receive & give peer feedback
✅ Submit tax declarations
✅ Track attendance
✅ Download ID card
✅ Submit expense claims
✅ View projects assigned to them
❌ Cannot see other employees' detailed profiles
❌ Cannot approve leaves or process payroll
❌ Cannot create appraisal cycles

---

## 🔄 CROSS-MODULE PAGE CONNECTIONS

### Employee CRUD to Multiple Modules
```
Employees Page (/admin/employees or /hr/employees)
        │
        ├──► Employee Profile (/admin/employees/:id)
        │         │
        │         ├──► Payroll Employee Page (/admin/payroll/:employeeId)
        │         │     [Salary slip generation, structure view]
        │         │
        │         └──► Check Employee Attendance
        │               [Link to attendance marking]
        │
        └──► Offer Letter Page (/admin/offer-letters)
              [Select employee to generate offer letter]
```

### Leave Flow
```
Employee applies leave
    ↓
Employee Page (/employee/apply-leave)
    ↓
HR Reviews (/hr/leaves)
    ↓
HR Approves/Rejects
    ↓
Employee sees status in:
    • My Dashboard (upcoming leaves)
    • Calendar
    • Attendance page
```

### Performance Workflow
```
HR creates cycle
    ↓
HR Performance Page (/hr/performance or /admin/performance)
    ↓
Cycle becomes ACTIVE
    ↓
Employee logs in → Performance page (/employee/performance)
    ↓
Employee Actions:
    • Sets goals
    • Self-appraisal
    • Peer feedback
    ↓
Manager Actions (if manager):
    • Gives feedback to direct reports
    ↓
HR views completed data back on Performance Dashboard
    (Null data shown until employees submit)
```

### Payroll Processing Pipeline
```
HR updates employee salary
    ↓
HR Payroll Page (/hr/payroll) - Edit salaries
    ↓
HR sets statutory settings (/hr/payroll/statutory-settings)
    ↓
HR generates statutory reports (/hr/payroll/statutory-compliance)
    ↓
HR processes tax declarations (/hr/tax-declarations)
    ↓
HR generates Form 16 (/hr/form16)
    ↓
Employee views:
    • Payslips (/employee/payslips)
    • Form 16 (/employee/form16)
    • Salary Structure (/employee/salary-structure)
    • IT Declaration (/employee/tax-declaration)
```

---

## 🗄️ Database Tables & Page Relationships

```
AUTHENTICATION TABLES:
├─ profiles (email, password, role, status)
│  └─ Linked to: All role-based pages via JWT token
│
EMPLOYEE DATA TABLES:
├─ employees (full_name, email, department, salary, etc.)
│  ├─ Employees Page reads/writes this
│  ├─ Links to payroll
│  ├─ Links to attendance
│  └─ Links to leave requests
│
├─ attendance (check_in, check_out, date, employee_id)
│  └─ Attendance pages read/write this
│
├─ leaves (type, days, start_date, status, employee_id)
│  ├─ Apply Leave (employee writes)
│  ├─ Leave Overview (HR approves/rejects)
│  └─ Calendar visualizes this
│
├─ payroll (base_salary, allowances, deductions, employee_id)
│  └─ Payroll pages manage this
│
PERFORMANCE TABLES:
├─ appraisal_cycles (name, start_date, end_date, status)
│  └─ HR creates, sets to ACTIVE
│
├─ goals (title, target, cycle_id, employee_id)
│  └─ Employees set goals in performance page
│
├─ self_appraisals (cycle_id, employee_id, items, comment)
│  └─ Employees submit via performance page
│
├─ manager_appraisals (cycle_id, employee_id, items, feedback)
│  └─ Managers submit via performance page
│
├─ peer_feedback (cycle_id, employee_id, rating, comment)
│  └─ Employees submit via performance page

OTHER OPERATIONAL:
├─ projects (name, deadline, assigned_to)
│  ├─ HR creates/manages
│  └─ Employees view assigned
│
├─ complaints (title, description, status, employee_id)
│  ├─ Employees submit
│  └─ HR reviews
│
├─ chats & messages
│  └─ Chat page manages
│
├─ meetings
│  └─ Meetings page manages
```

---

## 📝 Page Dependencies & Data Flow

### Payroll Data Flow
```
Employee Records
    ↓
[HR Payroll Page] → Adjusts salary components
    ↓
[Statutory Settings] → Tax slabs, ESI, PF rates
    ↓
[Automatic Slip Generation] → Backend calculates deductions
    ↓
Employee sees in [Payslips Page]
    ↓
[Form 16 Page] → Annual tax certificate
    ↓
Employee downloads from [Form 16 Page]
```

### Attendance Data Flow
```
[Attendance Dashboard] → HR marks attendance
    ↓
OR
    ↓
Employee auto check-in/out (if applicable)
    ↓
[Attendance Page (Employee)] → Views their record
    ↓
[Calendar Page] → Holiday + attendance visual
    ↓
[Leave Application] → Uses attendance data to calculate balance
```

### Onboarding Flow
```
[Employee created in HR] → Status: pending_activation
    ↓
Employee gets welcome email with reset link
    ↓
Employee clicks link → [Reset Password Page] → Status: active
    ↓
[Onboarding Page (Employee)] → Completes tasks
    ↓
[Onboarding Page (HR)] → HR tracks progress
    ↓
Tasks marked complete by HR or employee
```

### Offboarding Flow
```
[HR clicks Offboarding] → /admin/employees/offboarding
    ↓
Creates exit process
    ↓
[Employee sees Exit Interview] → /employee/exit-interview
    ↓
Completes exit survey
    ↓
[HR processes last payslip, leave encashment]
    ↓
Account marked as Inactive
    ↓
Employee cannot login anymore
```

---

## 🚀 Critical Page Interconnections

### 1. **Employees Page** - Central Hub
```
Entry: /admin/employees or /hr/employees
    ├─► Click employee row → Employee Profile
    │         ├─► View attendance details
    │         ├─► View payslip history
    │         ├─► Manage assignments
    │         └─► Check performance data
    │
    ├─► Bulk Actions
    │   ├─► Generate offer letters → /admin/offer-letters
    │         └─► Map employee → generate PDF
    │
    ├─► Navigation to related pages
    │   ├─► Attendance Page (mark attendance for employees)
    │   ├─► Leave Page (approve/reject requests)
    │   ├─► Payroll Page (view/adjust salary)
    │   └─► Performance Page (create cycles)
    │
    └─► Offboarding Link
        └─► /admin/employees/offboarding
```

### 2. **Dashboard** - Information Center
```
Entry: /admin/dashboard or /hr/dashboard or /employee/dashboard

ADMIN/HR DASHBOARD shows:
    ├─ Total employees count
    ├─ New joiners
    ├─ Announcements
    ├─ Leave requests pending approval
    │     └─ Link to → Leave Page
    ├─ Upcoming birthdays
    ├─ Attendance overview
    │     └─ Link to → Attendance Page
    └─ Quick navigation to all modules

EMPLOYEE DASHBOARD shows:
    ├─ My attendance status
    ├─ Leave balance & upcoming leaves
    │     └─ Link to → Apply Leave
    ├─ Payslip notifications
    │     └─ Link to → Payslips Page
    ├─ Upcoming birthdays in team
    ├─ Performance cycle notifications
    │     └─ Link to → Performance Page
    └─ Recent announcements
```

### 3. **Chat & Meetings** - Communication Hubs
```
/admin/chat or /hr/chat or /employee/chat
    ├─ Real-time messaging to any employee or group
    ├─ File sharing in chat messages
    └─ Links to → Chat notifications in dashboard

/admin/meetings or /hr/meetings or /employee/meetings
    ├─ Schedule meetings
    ├─ Invite participants
    ├─ Join meeting room → /meetings/:id
    └─ Video conferencing integration
```

### 4. **Drive** - Shared File Repository
```
/admin/drive or /hr/drive or /employee/drive
    ├─ Create folders by project
    ├─ Upload company documents
    ├─ Share files with teams
    ├─ Set access permissions
    └─ Linked from chat & project pages
```

### 5. **Performance Cycle** - Multi-Step Process
```
Step 1: HR Creates Cycle (/hr/performance)
    ↓
Step 2: HR Activates Cycle (Change status: draft → active)
    ↓
Step 3: Employee Views Cycle (/employee/performance)
    ├─ Add Goals
    ├─ Self-Appraisal
    ├─ Peer Feedback
    └─ Receive Manager Feedback
    ↓
Step 4: Managers (employees with direct reports) Submit Appraisals
    (/employee/performance → Manager Appraisals tab)
    ↓
Step 5: HR Views Completion (/hr/performance dashboard)
    ├─ See completion %
    ├─ See avg scores
    └─ Close cycle (status: closed)
```

---

## 🔑 Key Page Features Summary

| Page | Path | Role | Purpose | Special Features |
|------|------|------|---------|------------------|
| **Employees** | /admin/employees | Admin, HR | CRUD operations | Bulk import CSV, offer letters, profile links |
| **Dashboard** | /admin/dashboard | Admin, HR | Overview KPIs | Leave summary, announcements, birthday alerts |
| **Dashboard** | /employee/dashboard | Employee | Personal info | Attendance, leave balance, performance alerts |
| **Attendance** | /admin/attendance | Admin, HR | Mark attendance | Bulk upload, shift management |
| **Attendance** | /employee/attendance | Employee | View record | Check-in/out history, absent justification |
| **Leave Requests** | /admin/leaves | Admin, HR | Approve/Reject | Email notifications, balance calculation |
| **Apply Leave** | /employee/apply-leave | Employee | Submit request | Balance check, manager notification |
| **Payroll** | /admin/payroll | Admin, HR | Salary management | Slip generation, component editing |
| **Payslips** | /employee/payslips | Employee | View slips | PDF download, monthly history |
| **Offer Letters** | /admin/offer-letters | Admin, HR | Generate docs | PDF generation, CTC configuration |
| **Performance** | /admin/performance | Admin, HR | Create cycles | Completion tracking, score averaging |
| **Performance** | /employee/performance | Employee | Self & peer review | Goals, appraisals, feedback submission |
| **Onboarding** | /admin/onboarding | Admin, HR | Track tasks | Checklist, progress monitoring |
| **Onboarding** | /employee/onboarding | Employee | Complete tasks | Task checklist, status updates |
| **Offboarding** | /admin/employees/offboarding | Admin, HR | Exit process | Final payslip, asset returns |
| **Complaints** | /admin/complaints | Admin, HR | Review issues | Status tracking, resolution |
| **Complaints** | /employee/complaints | Employee | Submit grievance | Anonymous option, history |
| **Chat** | /admin/chat | All | Messaging | Group chats, file uploads |
| **Meetings** | /admin/meetings | All | Schedule meetings | Video conference, recording |
| **Drive** | /admin/drive | All | File storage | Folder hierarchy, sharing |
| **Profile** | /admin/profile | All | Account settings | Avatar, personal info, preferences |
| **Settings** | /admin/settings | All | System settings | Theme, notifications, account |
| **Surveys** | /admin/surveys | Admin, HR | Create surveys | Response tracking, analytics |
| **Surveys** | /employee/surveys | Employee | Fill surveys | Anonymous, multiple choice |
| **Org Chart** | /admin/org-chart | Admin, HR | View structure | Reporting hierarchy, departments |
| **Departments** | /admin/departments | Admin, HR | Manage depts | Department heads, employee mapping |
| **Audit Logs** | /admin/audit-logs | Admin | System logs | All user activities, changes |

---

## 🔒 Access Control Summary

```
            Admin    HR    Employee
Dashboard    ✅      ✅      ✅
Employees    ✅      ✅      ❌ (Can only view own profile)
Attendance   ✅      ✅      ✅ (Can only mark own)
Leaves       ✅      ✅      ✅ (Approve only for HR/Admin)
Payroll      ✅      ✅      ❌
Payslips     ✅      ✅      ✅ (Can only view own)
Performance  ✅      ✅      ✅ (Limited to own data)
Onboarding   ✅      ✅      ✅ (Own tasks only)
Chat         ✅      ✅      ✅
Meetings     ✅      ✅      ✅
Drive        ✅      ✅      ✅
Complaints   ✅      ✅      ✅ (Own complaints for employees)
Audit Logs   ✅      ❌      ❌ (Admin only)
Admin Mgmt   ✅      ❌      ❌ (Admin only)
Survey Create ✅     ✅      ❌
Survey Fill  ✅      ✅      ✅
Org Chart    ✅      ✅      ❌
Departments  ✅      ✅      ❌
```

---

## 📱 Mobile Responsive Behavior

All pages are fully responsive with:
- Sidebar collapses on mobile (hamburger menu)
- Cards & tables adapt to small screens
- Touch-friendly buttons
- Mobile-first CSS approach
- Flexbox & grid layouts

---

## 🔄 Session & State Management

**AuthContext.jsx handles:**
- User login/logout
- JWT token storage
- Role-based rendering
- Protected route enforcement
- Profile data caching

**API Endpoints Structure:**
```
/api/auth → Login, logout, password reset, bounce webhooks
/api/employees → CRUD operations
/api/attendance → Marking, viewing
/api/leaves → Apply, approve, list
/api/payroll → Salary, slips, statutory
/api/performance → Cycles, goals, appraisals, feedback
/api/chat → Messages, conversations
/api/meetings → Schedule, joining
/api/drive → Files, folders
/api/complaints → Submit, view
/api/surveys → Create, respond
```

---

## 🎯 Typical User Journeys

### Admin Journey
```
Login → Dashboard (KPIs)
    → Employees Page (Add new employee)
        → Offer Letter (Generate PDF)
        → Payroll (Set salary)
        → Attendance (Mark presence)
    → Leave Page (Admin approvals)
    → Performance (Create cycles)
    → Audit Logs (Monitor activity)
    → Admin Management (Create other admins)
```

### HR Journey
```
Login → Dashboard (Key metrics)
    → Employees (Manage team)
        → Profile (Edit details)
        → Payroll (Salary management)
    → Attendance (Marking & reports)
    → Leave Requests (Approve/Reject)
    → Performance (Track cycles, view completions)
    → Onboarding (Monitor new hires)
    → Tax Declarations & Form 16
    → Surveys (Employee engagement)
```

### Employee Journey
```
Login → My Dashboard (Personal overview)
    → Attendance (Check status)
    → Apply Leave (Submit request)
    → Payslips (View salary)
    → Performance (Set goals, self-appraisal)
    → Chat (Team communication)
    → My Projects (Task management)
    → Surveys (Fill feedback forms)
    → Support/Helpdesk (Raise tickets)
```

---

This document provides a complete map of the application. Each page is connected through either:
1. **Navigation links** in sidebars
2. **Contextual links** (e.g., employee row → profile)
3. **Data flow** (e.g., HR creates cycle → employee fills data → HR views results)
4. **Backend APIs** connecting pages to database

