# IndusInnovate HR Suite - Complete Frontend Pages Breakdown

**Generated:** March 20, 2026  
**Scope:** All routed pages across HR Portal, Employee Portal, Shared, and Public routes  
**Total Pages Documented:** 56 pages with full action/data/API specifications  

---

## TABLE OF CONTENTS

- [SECTION 1 — HR PORTAL PAGES](#section-1--hr-portal-pages) (32 pages)
- [SECTION 2 — EMPLOYEE PORTAL PAGES](#section-2--employee-portal-pages) (20 pages)
- [SECTION 3 — SHARED & PUBLIC PAGES](#section-3--shared--public-pages) (4 pages)

---

## SECTION 1 — HR PORTAL PAGES

All pages accessible via `/hr/*` routes after HR login (balichak.suman@iit.org.in).

### PAGE 1: HR Dashboard
- **FILE:** `src/pages/HRDashboard.jsx`
- **ROUTE:** `/hr/dashboard`
- **PURPOSE:** Main HR command center showing company health, workforce stats, and important daily updates.
- **ACTIONS:**
  - Review KPI cards (total employees, new hires, active leaves, upcoming birthdays)
  - View attendance chart visualization
  - Review recent leave requests list
  - Check upcoming birthdays section
  - View today's celebrations
  - Read announcements feed
  - Navigate to deeper modules via sidebar
- **DATA SHOWN:**
  - Headcount metrics
  - New employees this period
  - Active leaves count
  - Department-wise stats
  - Upcoming birthdays list
  - Today's celebrations
  - Recent leave activity
  - Company announcements
- **API CALLS:**
  - `GET /analytics`
  - `GET /announcements`
- **REALTIME:** No

---

### PAGE 2: Employees (Workforce Management)
- **FILE:** `src/pages/EmployeesPage.jsx`
- **ROUTE:** `/hr/employees`
- **PURPOSE:** HR workforce management hub with employee directory and embedded administration tabs.
- **ACTIONS:**
  - Select tab: Employee Directory (default)
  - Select tab: Digital ID Cards
  - Select tab: Offboarding
  - Select tab: Salary Revisions
  - Search employees in directory
  - Create new employee via modal form
  - Edit employee details (row action)
  - Delete/soft-delete employee
  - Bulk print ID cards
  - Access embedded forms and workflows
- **DATA SHOWN:**
  - Employee directory table (avatar, name, role, department, email, phone)
  - Digital ID cards grid (printable layouts)
  - Offboarding component (exit cases, checklist, progress)
  - Salary revisions component (pending salary adjustments)
- **API CALLS:**
  - Delegated to child modules and reusable components
  - Primary: Employee CRUD endpoints via `/employees`
- **REALTIME:** No

---

### PAGE 3: Employee Profile (HR view)
- **FILE:** `src/pages/EmployeeProfilePage.jsx`
- **ROUTE:** `/hr/employees/:id`
- **PURPOSE:** Full profile drill-down for one employee, including personal details, attendance, documents, and ID card.
- **ACTIONS:**
  - Switch tabs:
    - Personal Info (name, email, phone, location, DOB, department, role)
    - Documents (uploaded files view)
    - Attendance (monthly/daily records)
    - ID Card (preview and download as PNG)
    - NDA (agreement confirmation if applicable)
  - Download ID card as image
  - Inspect attendance records
  - View document library
  - Navigate back to directory
- **DATA SHOWN:**
  - Employee identity and employment metadata (full_name, email, role, department, DOB, joining_date)
  - Attendance records with check-in/check-out timestamps, status, hours worked
  - Location information
  - ID card preview with employee photo and organizational details
  - Documents (if any)
- **API CALLS:**
  - `GET /employees/:id`
  - `GET /attendance/all?employee_id={id}` (HR context)
- **REALTIME:** No

---

### PAGE 4: Offboarding (direct route)
- **FILE:** `src/pages/HROffboardingPage.jsx`
- **ROUTE:** `/hr/employees/offboarding`
- **PURPOSE:** HR exit-process console to initiate and complete offboarding cases.
- **ACTIONS:**
  - Create new exit case (form with reason, last working date, role, department)
  - View active cases and completion progress
  - Mark checklist items cleared (IT, Finance, HR tasks)
  - Review/generate relieving letter PDF
  - View exit interview responses if submitted
  - Track case status (in_progress → completed)
  - Cancel offboarding if needed
- **DATA SHOWN:**
  - Exit case list with employee name, exit date, reason, status
  - Checklist progress bar
  - Checklist items table (status: cleared/pending, assignee, notes)
  - Exit interview data (if completed)
  - Relieving letter preview
- **API CALLS:**
  - `GET /offboarding/cases`
  - `POST /offboarding/cases`
  - `PATCH /offboarding/checklist/:itemId`
  - Related offboarding detail endpoints
- **REALTIME:** No

---

### PAGE 5: HR Assets
- **FILE:** `src/pages/HRAssetsPage.jsx`
- **ROUTE:** `/hr/assets`
- **PURPOSE:** Manage company equipment lifecycle from inventory creation to assignment/return.
- **ACTIONS:**
  - Create new asset (name, type, serial number, purchase date, value)
  - Filter assets by type (Laptop, Phone, Monitor, Access Card, Other)
  - Filter assets by status (available, assigned, damaged, retired)
  - Assign asset to employee (date, condition notes)
  - Mark asset returned (clear assignment, return date)
  - View inventory statistics cards
  - Search/navigate asset records
- **DATA SHOWN:**
  - Asset inventory table (name, type, serial number, purchase date, value, status, current assignee)
  - Inventory stats cards (total, available, assigned, damaged)
  - Assignment form (employee selector, assignment date)
  - Return workflow
- **API CALLS:**
  - `GET /assets?type={type}&status={status}`
  - `GET /employees`
  - `POST /assets`
  - `PATCH /assets/:id/assign`
  - `PATCH /assets/:id/return`
- **REALTIME:** No

---

### PAGE 6: HR Leaves
- **FILE:** `src/pages/HRLeavesPage.jsx`
- **ROUTE:** `/hr/leaves`
- **PURPOSE:** Leave approval desk for reviewing and deciding employee leave requests.
- **ACTIONS:**
  - Filter by status (All, Pending, Approved, Rejected)
  - Filter by department (All, Engineering, Product, Design, Operations)
  - Search leave requests by description/applicant
  - Approve leave request (Check button)
  - Reject leave request (X button)
  - View leave details (type, dates, duration, reason)
  - Add reviewer notes/comments
- **DATA SHOWN:**
  - Leave request table (employee name, leave type, start date, end date, duration, reason, status, action buttons)
  - Filter dropdowns
  - Search bar
- **API CALLS:**
  - `GET /leaves?status={filter}&department={filter}`
  - `PATCH /leaves/:id` (status update)
- **REALTIME:** No

---

### PAGE 7: HR Attendance
- **FILE:** `src/pages/HRAttendancePage.jsx`
- **ROUTE:** `/hr/attendance`
- **PURPOSE:** Daily organization-wide attendance monitoring with export.
- **ACTIONS:**
  - Filter by date (date picker)
  - Filter by department (All Departments, Engineering, HR, Design, Marketing)
  - Export attendance CSV report
  - Inspect check-in/check-out times and location
  - Calculate and view hours worked
  - Review status (Present, Late, On Leave, Half-Day)
- **DATA SHOWN:**
  - Attendance stats cards (total records, present today, late entries, on leave)
  - Attendance table (employee name, department, check-in time with location, check-out time, hours worked, status)
  - Date/department filters
- **API CALLS:**
  - `GET /attendance/all?date={date}&department={department}`
- **REALTIME:** No

---

### PAGE 8: HR Projects
- **FILE:** `src/pages/HRProjectsPage.jsx`
- **ROUTE:** `/hr/projects`
- **PURPOSE:** Portfolio page for creating projects and tracking team tasks/reports.
- **ACTIONS:**
  - Create new project (form with name, client, deadline, team selection)
  - Click project card to open detail panel (right sidebar)
  - View and manage team members assigned to project
  - View task board (Kanban-style: todo, in-progress, done)
  - Review daily progress reports from team
  - Update project status (Active, Completed, On-Hold)
  - Team member avatars with initials
- **DATA SHOWN:**
  - Project cards grid (name, client, deadline, progress bar, status badge, team avatars)
  - Detail panel with:
    - Team members list
    - Task board (3-column layout)
    - Daily reports list (who, date, work done, hours, blockers)
- **API CALLS:**
  - `GET /projects`
  - `GET /employees`
  - `GET /projects/:id`
  - `GET /projects/:id/reports`
  - `POST /projects`
- **REALTIME:** No

---

### PAGE 9: Calendar (HR view)
- **FILE:** `src/pages/CalendarPage.jsx`
- **ROUTE:** `/hr/calendar`
- **PURPOSE:** Calendar of holidays/events with HR event management.
- **ACTIONS:**
  - View calendar grid for month navigation
  - View upcoming holidays/events list (sidebar)
  - HR adds calendar entry (modal form with date, name, type, label)
  - Navigate between months
  - Holiday labels and markers on calendar
- **DATA SHOWN:**
  - Calendar grid with holiday markers
  - Upcoming holidays list (name, date, type, label)
  - Add event controls (HR only)
- **API CALLS:**
  - `GET /holidays`
  - `POST /holidays` (HR only)
- **REALTIME:** No

---

### PAGE 10: Offer Letters
- **FILE:** `src/pages/OfferLetterPage.jsx`
- **ROUTE:** `/hr/offer-letters`
- **PURPOSE:** Create and manage offer/joining letters with preview and distribution workflow.
- **ACTIONS:**
  - Select letter type (offer or joining)
  - Fill candidate form (name, role, department, CTC, joining date, email)
  - Preview letter as PDF
  - Generate/download letter
  - Send letter (email delivery)
  - View history of generated letters (status: Generated, Sent, Accepted, Declined)
  - Update letter status
- **DATA SHOWN:**
  - Letter form (candidate details, compensation, joining date)
  - PDF preview
  - Letters history table (candidate, role, status, type, generated date)
- **API CALLS:**
  - `POST /offer-letters`
  - `GET /offer-letters`
  - `PATCH /offer-letters/:id` (status update, if applicable)
- **REALTIME:** No

---

### PAGE 11: HR Payroll (Launcher)
- **FILE:** `src/pages/HRPayrollPage.jsx`
- **ROUTE:** `/hr/payroll`
- **PURPOSE:** Employee payroll launcher page for selecting a person and opening detailed payroll view.
- **ACTIONS:**
  - Search/filter employees
  - Click employee row to navigate to detail payroll page
  - Quick-access buttons to:
    - Statutory Settings page
    - Compliance Report page
- **DATA SHOWN:**
  - Employee list (avatar, name, role, department, email)
  - Search/filter controls
- **API CALLS:**
  - `GET /employees`
- **REALTIME:** No

---

### PAGE 12: HR Payroll Employee Detail
- **FILE:** `src/pages/HRPayrollEmployeePage.jsx`
- **ROUTE:** `/hr/payroll/:employeeId`
- **PURPOSE:** Build and review monthly payroll for one employee.
- **ACTIONS:**
  - Select month and year (dropdown/picker)
  - Generate/recompute salary components
  - Review payslip breakdown (earnings, deductions, net pay)
  - View statutory calculations
  - Send payslip to employee (if implemented)
  - Download payslip PDF
- **DATA SHOWN:**
  - Employee name and designation
  - Earnings section (basic salary, HRA, allowances, conveyance, special allowance, reimbursements, leave encashment)
  - Deductions section (PF employee/employer, ESI employee/employer, TDS, professional tax)
  - Gross salary, total deductions, net salary
  - Statutory rates in use
  - Payslip PDF preview
- **API CALLS:**
  - `GET /employees/:employeeId`
  - `GET /payroll/statutory-settings`
  - Payroll generation/fetch endpoints
- **REALTIME:** No

---

### PAGE 13: HR Statutory Settings
- **FILE:** `src/pages/HRStatutorySettingsPage.jsx`
- **ROUTE:** `/hr/payroll/statutory-settings`
- **PURPOSE:** Configure PF/ESI/TDS rules used by payroll calculations.
- **ACTIONS:**
  - Edit PF employee rate (default: 12%)
  - Edit PF employer rate (default: 12%)
  - Edit ESI employee rate (default: 0.75%)
  - Edit ESI employer rate (default: 3.25%)
  - Add new TDS slab (income_from, income_to, rate)
  - Edit existing slab
  - Delete slab
  - Save settings
- **DATA SHOWN:**
  - PF rate fields (employee, employer)
  - ESI rate fields (employee, employer)
  - TDS slabs table (income range, rate %)
  - Default/seeded slabs (0-3L: 0%, 3-6L: 5%, 6-9L: 10%, 9-12L: 15%, 12-15L: 20%, 15L+: 30%)
- **API CALLS:**
  - `GET /payroll/statutory-settings`
  - `PUT /payroll/statutory-settings`
- **REALTIME:** No

---

### PAGE 14: HR Statutory Compliance
- **FILE:** `src/pages/HRStatutoryCompliancePage.jsx`
- **ROUTE:** `/hr/payroll/statutory-compliance`
- **PURPOSE:** Monthly PF/ESI/TDS compliance report view.
- **ACTIONS:**
  - Select month (dropdown)
  - Select year (numberbox)
  - Load report
  - Download compliance PDF
- **DATA SHOWN:**
  - Monthly totals (PF employee/employer, ESI employee/employer, TDS collected)
  - Employee-wise breakdown table (name, gross salary, PF employee, PF employer, ESI employee, ESI employer, TDS)
  - Compliance summary cards
- **API CALLS:**
  - `GET /payroll/compliance-report?month={month}&year={year}`
- **REALTIME:** No

---

### PAGE 15: HR Tax Declarations
- **FILE:** `src/pages/HRTaxDeclarationPage.jsx`
- **ROUTE:** `/hr/tax-declarations`
- **PURPOSE:** Review employee tax declarations and approve/reject line items.
- **ACTIONS:**
  - Filter by financial year (dropdown)
  - Filter by status (All, Pending, Approved, Rejected)
  - Click declaration to view details
  - Open declaration items table
  - Approve/reject individual items (button action)
  - Add HR comment to item approval/rejection
  - View proofs uploaded by employee
- **DATA SHOWN:**
  - Declaration list (employee, FY, submitted date, status)
  - Declaration detail view with items table (section code, label, declared amount, approved amount, status, HR comment field)
  - Supporting document list (proofs uploaded)
- **API CALLS:**
  - `GET /income-tax/hr/declarations?financial_year={fy}&status={status}`
  - `GET /income-tax/hr/declarations/:id`
  - `PATCH /income-tax/hr/items/:itemId/review` (status, approved_amount, comment)
- **REALTIME:** No

---

### PAGE 16: HR Form 16
- **FILE:** `src/pages/HRForm16Page.jsx`
- **ROUTE:** `/hr/form16`
- **PURPOSE:** Generate Form 16 documents for employees.
- **ACTIONS:**
  - Select employee (dropdown)
  - Select financial year (dropdown)
  - Load summary
  - Download PDF
  - Preview Form 16
- **DATA SHOWN:**
  - Employee selector
  - Form 16 summary (gross income, deductions, taxable income, TDS deducted)
  - PDF download button
- **API CALLS:**
  - `GET /employees`
  - `GET /income-tax/hr/form16/:employeeId?financial_year={fy}`
- **REALTIME:** No

---

### PAGE 17: HR Complaints
- **FILE:** `src/pages/HRComplaintsPage.jsx`
- **ROUTE:** `/hr/complaints`
- **PURPOSE:** Investigate and resolve employee complaints.
- **ACTIONS:**
  - Filter by status (All, Open, In-Review, Resolved)
  - Filter by category (All, HR, Harassment, Workload, Technical)
  - Search complaints by description/applicant
  - Update complaint status via dropdown
  - View complaint details and attachment
  - Add internal notes/action items
- **DATA SHOWN:**
  - Complaint table (employee name, category, description, status, submitted date, action buttons)
  - Complaint detail (full description, anonymity flag, attachment)
  - Status update controls
- **API CALLS:**
  - `GET /complaints?status={status}&category={category}`
  - `PATCH /complaints/:id` (status)
- **REALTIME:** No

---

### PAGE 18: HR Audit Logs
- **FILE:** `src/pages/HRAuditLogsPage.jsx`
- **ROUTE:** `/hr/audit-logs`
- **PURPOSE:** Compliance trail viewer for system/user actions.
- **ACTIONS:**
  - Filter by status, category, date range (date pickers)
  - Search by user email/name
  - Export log data to CSV/file
  - View action icon indicators (login, create, edit, delete, approve, etc.)
  - Inspect audit entry details
- **DATA SHOWN:**
  - Audit log table (timestamp, user name/email, action, module, IP address, details/JSON)
  - Filter controls
  - Export button
  - Status badges
- **API CALLS:**
  - `GET /audit?status={status}&category={category}&user={user}&start_date={start}&end_date={end}`
- **REALTIME:** No

---

### PAGE 19: HR Performance
- **FILE:** `src/pages/HRPerformancePage.jsx`
- **ROUTE:** `/hr/performance`
- **PURPOSE:** Manage appraisal cycles and review completion health.
- **ACTIONS:**
  - Create new cycle (form with name, date range, status)
  - View cycle cards with status badge
  - Update cycle status (draft → active → closed)
  - View completion dashboard (response rates, participation %)
  - Refresh data
- **DATA SHOWN:**
  - Cycle cards (name, start date, end date, status, completion percentage)
  - Dashboard with completion stats
- **API CALLS:**
  - `GET /performance/cycles`
  - `GET /performance/dashboard`
  - `POST /performance/cycles`
  - `PATCH /performance/cycles/:cycleId/status`
- **REALTIME:** No

---

### PAGE 20: HR Onboarding
- **FILE:** `src/pages/HROnboardingPage.jsx`
- **ROUTE:** `/hr/onboarding`
- **PURPOSE:** Create onboarding templates and assign to new hires with progress tracking.
- **ACTIONS:**
  - Create template (form with name, description, tasks)
  - Add/remove/reorder task rows in template
  - Assign template to employee (form with employee selector)
  - Mark tasks complete as HR reviewer
  - View active cases with completion %
  - Track individual task progress
  - Request/upload documents as part of task
- **DATA SHOWN:**
  - Template catalog (name, description, task count)
  - Template form (dynamic task rows)
  - Active onboarding cases (employee name, template, progress bar, task checklist)
- **API CALLS:**
  - `GET /onboarding/templates`
  - `GET /employees`
  - `GET /onboarding/cases/active` or equivalent
  - `POST /onboarding/templates`
  - `POST /onboarding/assign` or template assignment endpoint
  - `PATCH /onboarding/tasks/:taskId/hr` (is_completed)
- **REALTIME:** No

---

### PAGE 21: HR Departments
- **FILE:** `src/pages/HRDepartmentsPage.jsx`
- **ROUTE:** `/hr/departments`
- **PURPOSE:** Create and manage organizational departments.
- **ACTIONS:**
  - Create new department (form with name, description)
  - Click department row to edit
  - Populate form with selected department data
  - Update department details
  - Delete department (confirmation)
  - Cancel edit and return to list
  - View employee count per department
- **DATA SHOWN:**
  - Department form (left: name, description, save/cancel buttons)
  - Department list (right: name, description, employee count)
- **API CALLS:**
  - `GET /departments`
  - `POST /departments`
  - `PUT or PATCH /departments/:id`
  - `DELETE /departments/:id`
- **REALTIME:** No

---

### PAGE 22: HR Org Chart
- **FILE:** `src/pages/HROrgChartPage.jsx`
- **ROUTE:** `/hr/org-chart`
- **PURPOSE:** Visual hierarchy and reporting-structure management.
- **ACTIONS:**
  - Filter org structure by department
  - Select employee for quick edit
  - Edit department assignment
  - Edit manager (reporting line)
  - Save relationship changes
  - View tree/card layout org structure
- **DATA SHOWN:**
  - Organizational tree with employee cards (avatar, name, role, manager)
  - Filter by department
  - Edit modal for reassignment
- **API CALLS:**
  - `GET /departments`
  - `GET /employees`
  - `GET /departments/org-chart/tree?department_id={depId}`
  - Update endpoint(s) for hierarchy edits
- **REALTIME:** No

---

### PAGE 23: HR Expense Approvals
- **FILE:** `src/pages/HRExpenseApprovalsPage.jsx`
- **ROUTE:** `/hr/expense-approvals`
- **PURPOSE:** Approve/reject reimbursement claims.
- **ACTIONS:**
  - View pending claims table
  - Add reviewer comment
  - Approve claim (CheckCircle2 button)
  - Reject claim (XCircle button)
  - View receipt (clickable link)
  - Filter by category, amount, date
  - Search by employee
- **DATA SHOWN:**
  - Claims table (employee name, date, category, amount, description, receipt link, comment field, action buttons)
  - Status indicators
  - Summary totals
- **API CALLS:**
  - `GET /expenses/review?status=Pending`
  - `PATCH /expenses/review/:claimId` (status, reviewer_comment)
- **REALTIME:** No

---

### PAGE 24: HR Reimbursement Summary
- **FILE:** `src/pages/HRReimbursementSummaryPage.jsx`
- **ROUTE:** `/hr/reimbursement-summary`
- **PURPOSE:** Monthly reimbursement and payout summary for finance visibility.
- **ACTIONS:**
  - Select month (dropdown)
  - Select year (number picker)
  - Load report
  - Download summary PDF
  - Print report
- **DATA SHOWN:**
  - Monthly total reimbursements (aggregate)
  - Employee-wise breakdown (name, approved amount, category breakdown)
  - Summary cards (total approved, pending, rejected)
- **API CALLS:**
  - `GET /expenses/summary/monthly?month={month}&year={year}`
- **REALTIME:** No

---

### PAGE 25: HR Shift Management
- **FILE:** `src/pages/HRShiftManagementPage.jsx`
- **ROUTE:** `/hr/shifts`
- **PURPOSE:** Create shift templates and assign staff schedules.
- **ACTIONS:**
  - Create new shift (form with name, start_time, end_time)
  - View/navigate week picker
  - Assign shift to single employee
  - Bulk assign shift to department
  - View roster grid by employee/day
  - Update shift definitions
- **DATA SHOWN:**
  - Shift list (name, start time, end time)
  - Date range picker (week view)
  - Roster table (employees × days with shift assignments)
  - Employee/department selectors
- **API CALLS:**
  - `GET /shifts`
  - `GET /employees`
  - `GET /departments`
  - `POST /shifts`
  - `POST /shifts/assignments`
  - Bulk assign endpoint
- **REALTIME:** No

---

### PAGE 26: HR Leave Encashment
- **FILE:** `src/pages/HRLeaveEncashmentPage.jsx`
- **ROUTE:** `/hr/leave-encashment`
- **PURPOSE:** Configure encashment rules and process employee encashment requests.
- **ACTIONS:**
  - Edit encashment policy (leave types, max days, payout formula)
  - Save policy
  - Filter requests by status (All, Pending, Approved, Rejected)
  - Approve/reject request
  - Add comment to approval/rejection
  - View calculated payout amounts
- **DATA SHOWN:**
  - Encashment policy form (leave types array, max days input, formula selector)
  - Requests list (employee, leave type, days requested, amount, status, comment field)
  - Policy summary info
- **API CALLS:**
  - `GET /leave-encashment/policy`
  - `PUT /leave-encashment/policy`
  - `GET /leave-encashment/requests?status={status}`
  - `PATCH /leave-encashment/requests/:id` (status, comment)
- **REALTIME:** No

---

### PAGE 27: HR Helpdesk
- **FILE:** `src/pages/HRHelpDeskPage.jsx`
- **ROUTE:** `/hr/helpdesk`
- **PURPOSE:** Support operations panel for managing all tickets and ticket collaboration.
- **ACTIONS:**
  - Filter tickets by status (open, in_progress, resolved, closed)
  - Filter tickets by category (IT Issue, Payroll Query, Leave Issue, General HR, Grievance)
  - Filter tickets by priority (low, medium, high)
  - Filter tickets by assigned_to (team member)
  - Search tickets by subject/description
  - Click ticket to view full details
  - Add comments/responses to ticket
  - Change ticket status
  - Assign ticket to team member
  - View dashboard stats
- **DATA SHOWN:**
  - Ticket list table (subject, employee, category, priority, status, assigned to, created date)
  - Ticket detail pane (description, comments timeline, attachment, assignment controls)
  - Dashboard with KPI cards (open, in-progress, resolved, closed counts)
- **API CALLS:**
  - `GET /helpdesk/hr/all?status={status}&category={category}&priority={priority}&assigned_to={assigned_to}`
  - `GET /helpdesk/hr/team-members`
  - `GET /helpdesk/hr/dashboard`
  - `POST /helpdesk/tickets/:id/comments`
  - `PATCH /helpdesk/tickets/:id` (status)
  - Assignment update endpoint
- **REALTIME:** Yes — Socket.IO events: `comment_added`, `status_changed`, `assignment_changed`, `ticket_created`

---

### PAGE 28: HR Surveys
- **FILE:** `src/pages/HRSurveysPage.jsx`
- **ROUTE:** `/hr/surveys`
- **PURPOSE:** Survey management list for publish and results access.
- **ACTIONS:**
  - Navigate to create-survey page
  - Publish survey (dropdown action on card)
  - View survey results (BarChart3 button → navigate to results page)
  - Archive/delete survey (if applicable)
- **DATA SHOWN:**
  - Survey cards (title, description, status badge, response count, deadline, publish/results buttons)
- **API CALLS:**
  - `GET /surveys`
  - `PATCH /surveys/:surveyId/publish`
- **REALTIME:** No

---

### PAGE 29: HR Survey Create
- **FILE:** `src/pages/HRSurveyCreatePage.jsx`
- **ROUTE:** `/hr/surveys/create`
- **PURPOSE:** Survey builder for designing questions and targeting audience.
- **ACTIONS:**
  - Enter survey title and description
  - Set deadline date
  - Toggle anonymous mode
  - Select target type (all employees or specific department)
  - Add/remove survey questions
  - Set question type (rating, text, MCQ)
  - Add/edit options for MCQ questions
  - Reorder questions
  - Save survey
  - Preview survey
- **DATA SHOWN:**
  - Survey title/description inputs
  - Deadline picker
  - Anonymous toggle
  - Target type selector (all / department dropdown)
  - Questions builder (dynamic rows: type dropdown, question text, options field)
  - Save/cancel buttons
- **API CALLS:**
  - `GET /departments`
  - `POST /surveys` (title, description, deadline, is_anonymous, target_type, target_department_id, questions array)
- **REALTIME:** No

---

### PAGE 30: HR Survey Results
- **FILE:** `src/pages/HRSurveyResultsPage.jsx`
- **ROUTE:** `/hr/surveys/:id/results`
- **PURPOSE:** Analytics page for submitted survey results.
- **ACTIONS:**
  - View survey metadata (title, description, deadline)
  - Review response stats (total targeted, response count, response rate %)
  - View per-question results:
    - Rating questions: average rating + star display
    - MCQ: bar chart or count breakdown
    - Text: sample responses or themes
  - Download results (if enabled)
- **DATA SHOWN:**
  - Survey title and metadata
  - Response stats cards (target count, responses, rate %)
  - Question results cards (question text, visualization, aggregate response)
- **API CALLS:**
  - `GET /surveys/:id/results`
- **REALTIME:** No

---

### PAGE 31: HR Settings
- **FILE:** `src/pages/SettingsPage.jsx`
- **ROUTE:** `/hr/settings`
- **PURPOSE:** Personal preference page for display and notification options.
- **ACTIONS:**
  - Toggle email notifications
  - Toggle push notifications
  - Toggle update notifications
  - Toggle reminder notifications
  - Change theme (light/dark/system)
  - Change font size (small/medium/large)
  - Toggle high contrast mode
  - Save preferences
- **DATA SHOWN:**
  - Notification preference toggles
  - Theme selector
  - Font size selector (small/medium/large options)
  - High contrast toggle
  - Preference save button and status feedback
- **API CALLS:**
  - None in current implementation (localStorage-based)
- **REALTIME:** No

---

### PAGE 32: HR Chat (Shared)
- **FILE:** `src/pages/ChatPage.jsx`
- **ROUTE:** `/chat`
- **PURPOSE:** Live organization chat for direct and group communication.
- **ACTIONS:**
  - Send/receive direct messages
  - Send/receive group messages
  - Create new group chat
  - Add members to group
  - Leave group
  - Search conversations
  - Upload files in chat
  - Clear conversation history
  - Initiate voice/video calls on contact
  - View online status and typing indicators
- **DATA SHOWN:**
  - Contact list (name, avatar, online status indicator)
  - Group list (name, member count, last message)
  - Message thread (sender, timestamp, avatar, message content, file attachments)
  - Typing indicator ("User is typing...")
  - Call notification popups
- **API CALLS:**
  - `GET /chat/contacts`
  - `GET /chat/groups`
  - `GET /chat/groups/:groupId/members`
  - `GET /chat/history/:targetId`
  - `POST /chat/message`
  - `POST /chat/create-group`
  - `POST /chat/add-members`
  - `POST /chat/leave-group`
  - `DELETE /chat/history/:targetId`
  - `POST /chat/upload`
- **REALTIME:** Yes — Socket.IO events: `identify`, `join_room`, `receive_message`, `incoming_call`, `user_online`, `user_offline`, `user_typing`, `message_read`

---

### PAGE 33: HR Meetings
- **FILE:** `src/pages/MeetingsPage.jsx`
- **ROUTE:** `/meetings`
- **PURPOSE:** Meeting scheduler and meeting list.
- **ACTIONS:**
  - Create meeting (modal form: title, agenda, date/time, duration, participants)
  - Select participants from employee list
  - View meeting cards
  - Click meeting to open room
  - Join meeting room
  - Cancel meeting (if applicable)
- **DATA SHOWN:**
  - Meeting cards (title, date/time, duration, participant avatars, meeting link)
  - Create meeting button and modal form
- **API CALLS:**
  - `GET /meetings`
  - `GET /employees`
  - `POST /meetings`
- **REALTIME:** No

---

### PAGE 34: HR Meeting Room (Shared)
- **FILE:** `src/pages/MeetingRoomPage.jsx`
- **ROUTE:** `/meetings/:id`
- **PURPOSE:** Live meeting room with video/audio/chat and participant controls.
- **ACTIONS:**
  - Toggle microphone on/off
  - Toggle camera on/off
  - Toggle screen share
  - Toggle recording
  - End call (PhoneOff button)
  - Add participants to room
  - View participant list
  - Send chat messages in meeting
  - Toggle participants panel vs chat panel
  - Mute/unmute individual participants (if enabled)
- **DATA SHOWN:**
  - Live video grid (local and remote streams)
  - Participant list with online/offline status
  - Meeting chat panel (messages from participants)
  - Control buttons (mic, camera, share, record, end)
  - Meeting title and timer/duration
- **API CALLS:**
  - `GET /meetings/:id`
  - `GET /employees` (for add members modal)
  - `POST /meetings/:id/add-participant`
- **REALTIME:** Yes — Socket.IO events for WebRTC signaling (offer/answer/ICE candidates) and meeting chat

---

### PAGE 35: HR Drive (Shared)
- **FILE:** `src/pages/DrivePage.jsx`
- **ROUTE:** `/drive`
- **PURPOSE:** Organization file storage with folder navigation and role-based spaces.
- **ACTIONS:**
  - Switch drive views (My Drive, Shared with Me, Company, HR Only)
  - Create new folder
  - Upload file
  - Navigate folder hierarchy (breadcrumb)
  - Delete file/folder (confirmation required)
  - Download file
  - Search files
  - Filter by file type
  - Share file with colleagues (if enabled)
- **DATA SHOWN:**
  - Breadcrumb navigation
  - Folder/file list with icons (document, image, code types)
  - View toggle (grid/list)
  - Upload progress indicators
  - File metadata (name, size, modification date, owner)
  - Search/filter results
- **API CALLS:**
  - `GET /drive/contents?type={viewType}&folder_id={folderId}`
  - `POST /drive/upload` (FormData with file + folder_id)
  - `POST /drive/folder` (name, parent_id, is_company, is_hr_only)
  - `DELETE /drive/file/:id`
  - `GET /drive/download/:id`
- **REALTIME:** No

---

### PAGE 36: HR Profile (Shared)
- **FILE:** `src/pages/ProfilePage.jsx`
- **ROUTE:** `/profile`
- **PURPOSE:** Self profile page for HR user account details and updates.
- **ACTIONS:**
  - Edit personal fields (name, email, role, DOB, address)
  - Upload/change profile photo
  - Save profile changes
  - View current profile information
  - Back navigation
- **DATA SHOWN:**
  - User personal profile form (full name, email, role, DOB, address)
  - Avatar upload/change controls
  - Edit and save buttons
  - Current profile display
- **API CALLS:**
  - User profile fetch endpoint (GET /user/me or similar)
  - `PUT /user/me` or update-profile endpoint
  - Avatar upload endpoint (if multipart)
- **REALTIME:** No

---

## SECTION 2 — EMPLOYEE PORTAL PAGES

All pages accessible via `/employee/*` routes after Employee login (balichaksumann@gmail.com).

### PAGE 37: Employee Dashboard
- **FILE:** `src/pages/EmployeeDashboard.jsx`
- **ROUTE:** `/employee/dashboard`
- **PURPOSE:** Employee home page showing personal work snapshot and announcements.
- **ACTIONS:**
  - View personal dashboard stats
  - View current shift information
  - Check onboarding progress (if assigned)
  - View celebration notice (birthday/work anniversary)
  - Read announcements feed
  - Quick action tiles (navigate to leave, expenses, etc.)
- **DATA SHOWN:**
  - Welcome greeting
  - Celebration banner (birthday, work anniversary)
  - Current shift details (name, start time, end time)
  - Onboarding progress bar (if active)
  - Announcement cards (title, date, content preview)
  - Quick action tiles with icons
- **API CALLS:**
  - `GET /employees/dashboard-stats`
  - `GET /announcements`
  - Optional: `GET /shifts/my-current`, `GET /onboarding/my-summary`
- **REALTIME:** No

---

### PAGE 38: Employee Attendance
- **FILE:** `src/pages/EmployeeAttendancePage.jsx`
- **ROUTE:** `/employee/attendance`
- **PURPOSE:** Daily attendance tool for check-in/out and attendance history.
- **ACTIONS:**
  - Check in (Play button — with geolocation or IP-based location)
  - Check out (Square button)
  - Navigate between dates (date picker)
  - View attendance records for month
  - View status summary (present, late, half-day, on leave counts)
  - View active session duration (live running timer)
  - Download attendance report (if enabled)
- **DATA SHOWN:**
  - Current time display
  - Selected date
  - Check-in/check-out buttons
  - Today's records (check-in time, check-out time, status, hours worked, location)
  - Monthly stats cards (days present, late, half-day, on leave)
  - Attendance history list
  - Active session timer (updates every second)
- **API CALLS:**
  - `GET /attendance/my`
  - `POST /attendance/check-in` (check_in_time, location_string)
  - `POST /attendance/check-out` (check_out_time)
  - Support calls: `GET /shifts/my-current`, `GET /holidays`
- **REALTIME:** Yes — Local live timer via setInterval for active session duration display

---

### PAGE 39: Employee Projects
- **FILE:** `src/pages/EmployeeProjectsPage.jsx`
- **ROUTE:** `/employee/projects`
- **PURPOSE:** Assigned project workspace and daily reporting area.
- **ACTIONS:**
  - Select project from left panel
  - Submit daily work report (work done, hours, blockers)
  - View past/history of reports
  - Review project details (client, deadline, progress)
- **DATA SHOWN:**
  - Project list (name, client, progress %, deadline)
  - Report form (work done textarea, hours number, blockers textarea)
  - Report history (date, work done summary, hours, blocker indicators)
- **API CALLS:**
  - `GET /projects`
  - `GET /projects/reports/my`
  - `POST /projects/:projectId/reports` (work_done, hours, blockers)
- **REALTIME:** No

---

### PAGE 40: Apply Leave
- **FILE:** `src/pages/ApplyLeavePage.jsx`
- **ROUTE:** `/employee/apply-leave`
- **PURPOSE:** Leave request submission and leave-history review page.
- **ACTIONS:**
  - Select leave type (Sick, Casual, Earned, Comp-Off)
  - Pick start date
  - Pick end date
  - Enter reason
  - Upload attachment/document
  - Submit leave request
  - View leave balances chart (by type)
  - Review leave history and statuses
- **DATA SHOWN:**
  - Leave request form (type dropdown, date range pickers, reason textarea, file upload)
  - Leave balance bar chart (casual, sick, earned, comp-off)
  - Leave history table (dates, type, reason, status, duration)
  - Summary totals (used, available, pending)
- **API CALLS:**
  - `GET /leaves`
  - `POST /leaves` (FormData: leave_type, start_date, end_date, reason, days, attachment)
- **REALTIME:** No

---

### PAGE 41: Calendar (Employee)
- **FILE:** `src/pages/CalendarPage.jsx`
- **ROUTE:** `/employee/calendar`
- **PURPOSE:** Read-only holiday/event calendar for employees.
- **ACTIONS:**
  - View calendar grid
  - Navigate between months
  - View upcoming holidays list (sidebar)
- **DATA SHOWN:**
  - Calendar grid with holiday markers
  - Upcoming holidays list (name, date, type, label)
- **API CALLS:**
  - `GET /holidays`
- **REALTIME:** No

---

### PAGE 42: Employee Payslips
- **FILE:** `src/pages/EmployeePayslipsPage.jsx`
- **ROUTE:** `/employee/payslips`
- **PURPOSE:** Access historical payslips and download/preview salary documents.
- **ACTIONS:**
  - Click payslip card to preview
  - Download payslip PDF
  - View payslip details (gross, deductions, net)
  - Filter by month/year (if applicable)
- **DATA SHOWN:**
  - Payslip cards grid (month, year, net salary, generated date)
  - Preview button and download button per card
  - Payslip PDF preview with full earnings/deductions breakdown
- **API CALLS:**
  - `GET /payroll` (returns array of employee payslips)
  - Client-side PDF generation via PayslipPDF component
- **REALTIME:** No

---

### PAGE 43: Employee Expenses
- **FILE:** `src/pages/EmployeeExpensesPage.jsx`
- **ROUTE:** `/employee/expenses`
- **PURPOSE:** Reimbursement claim submission and tracking page.
- **ACTIONS:**
  - Submit expense claim form (category, amount, date, description, receipt upload)
  - View claim history with status and amounts
  - View summary totals (claimed, pending, approved, rejected)
  - Track claim approval progress
  - Upload/replace receipt
- **DATA SHOWN:**
  - Expense claim form (category dropdown, amount input, date picker, description textarea, receipt upload)
  - Claims history table (date, category, amount, status, reviewer comment field)
  - Summary cards (total claimed, pending, approved, rejected)
- **API CALLS:**
  - `GET /expenses/my` or `/expenses/mine`
  - `POST /expenses/submit` (FormData: category, amount, expense_date, description, receipt)
- **REALTIME:** No

---

### PAGE 44: Employee Leave Encashment
- **FILE:** `src/pages/EmployeeLeaveEncashmentPage.jsx`
- **ROUTE:** `/employee/leave-encashment`
- **PURPOSE:** Request payout against eligible unused leaves.
- **ACTIONS:**
  - View encashment policy summary
  - Check leave balance by type
  - Select leave type to encash
  - Enter days to encash
  - Review calculated payout
  - Submit encashment request
  - View request history and status
- **DATA SHOWN:**
  - Policy info (eligible leave types, max days per year, payout formula)
  - Leave balance info (available, used, encashed by type)
  - Encashment form (leave type dropdown, days input, estimated payout calculation)
  - Request history table (date, leave type, days, estimated/approved amount, status)
- **API CALLS:**
  - `GET /leave-encashment/my/summary` or `/my/balance`
  - `GET /leave-encashment/my/requests`
  - `POST /leave-encashment/my/requests` (leave_type, days_requested)
- **REALTIME:** No

---

### PAGE 45: Employee Tax Declaration
- **FILE:** `src/pages/EmployeeTaxDeclarationPage.jsx`
- **ROUTE:** `/employee/tax-declaration`
- **PURPOSE:** Tax planning/declaration page for deductions and proof submission.
- **ACTIONS:**
  - Select financial year
  - Add declaration item (section code, label, amount)
  - Upload supporting proofs (multiple files)
  - Edit item details
  - Delete item
  - Save draft
  - Submit for HR review
  - View review status and HR comments
- **DATA SHOWN:**
  - Financial year selector
  - Items table (section code dropdown, label text, declared amount input, status)
  - Upload proofs section (file list, add files button)
  - Save draft and submit buttons
  - Review status feedback (if reviewed)
- **API CALLS:**
  - `GET /income-tax/my?financial_year={fy}`
  - `PUT /income-tax/my` (save draft)
  - `POST /income-tax/my/submit`
  - `POST /income-tax/my/items/:itemId/proofs` (FormData with proof file)
- **REALTIME:** No

---

### PAGE 46: Employee Form 16
- **FILE:** `src/pages/EmployeeForm16Page.jsx`
- **ROUTE:** `/employee/form16`
- **PURPOSE:** Download personal annual Form 16 summary.
- **ACTIONS:**
  - Select financial year (dropdown)
  - Load summary
  - Download Form 16 PDF
  - Preview Form 16
- **DATA SHOWN:**
  - Financial year selector
  - Form 16 summary (gross income, deductions, taxable income, TDS deducted)
  - Download/print buttons
- **API CALLS:**
  - `GET /income-tax/my/form16?financial_year={fy}`
- **REALTIME:** No

---

### PAGE 47: Employee Salary Structure
- **FILE:** `src/pages/EmployeeSalaryStructurePage.jsx`
- **ROUTE:** `/employee/salary-structure`
- **PURPOSE:** View current salary breakup and revision history.
- **ACTIONS:**
  - View current salary breakdown (components)
  - Toggle salary history view (if enabled in policy)
  - Review revision history list
  - View effective date of each revision
- **DATA SHOWN:**
  - Current salary structure (basic, HRA, allowances, special allowance, conveyance, etc.)
  - Effective date
  - Salary revision history table (date, proposed/approved amounts, status)
  - CTC breakdown
- **API CALLS:**
  - `GET /salary-revisions/my/current`
  - `GET /salary-revisions/my/history` (if enabled)
- **REALTIME:** No

---

### PAGE 48: Employee Exit Interview
- **FILE:** `src/pages/EmployeeExitInterviewPage.jsx`
- **ROUTE:** `/employee/exit-interview`
- **PURPOSE:** Offboarding self-service page for clearance and exit feedback.
- **ACTIONS:**
  - View offboarding checklist with task status
  - Submit exit interview form (reason, rating, feedback)
  - Track exit progress
  - View assigned clearance items (to HR/Finance/IT)
  - Mark items cleared (if applicable)
- **DATA SHOWN:**
  - Progress bar (exit case completion %)
  - Exit interview form (reason for leaving, 1-5 rating, feedback textarea)
  - Checklist items (task name, assigned role, status, notes)
  - Clearance assignments list
- **API CALLS:**
  - `GET /offboarding/my/case`
  - `POST /offboarding/my/exit-interview` (reason_for_leaving, experience_rating, feedback)
  - `PATCH /offboarding/checklist/:itemId/clear` (if employee can mark items)
- **REALTIME:** No

---

### PAGE 49: Employee Assets
- **FILE:** `src/pages/EmployeeAssetsPage.jsx`
- **ROUTE:** `/employee/assets`
- **PURPOSE:** Shows company assets currently assigned to the employee.
- **ACTIONS:**
  - View assigned assets table
  - Inspect asset details (no edit/return actions for employee)
- **DATA SHOWN:**
  - Assets table (name, type, serial number, assigned date, value, status, condition notes)
  - Asset details cards (if expanded view available)
- **API CALLS:**
  - `GET /assets/my`
- **REALTIME:** No

---

### PAGE 50: Employee ID Card
- **FILE:** `src/pages/EmployeeIDCardPage.jsx`
- **ROUTE:** `/employee/id-card`
- **PURPOSE:** View and download/share personal ID card.
- **ACTIONS:**
  - View ID card preview
  - Download as PNG image
  - Share via Web Share API (if available on browser)
- **DATA SHOWN:**
  - ID card component with employee details (name, email, ID number, avatar, role, department, QR code if applicable)
  - Download button
  - Share button
- **API CALLS:**
  - `GET /employees` (self lookup via profile context in page logic)
- **REALTIME:** No

---

### PAGE 51: Employee Complaints
- **FILE:** `src/pages/EmployeeComplaintsPage.jsx`
- **ROUTE:** `/employee/complaints`
- **PURPOSE:** Employee grievance submission and tracking.
- **ACTIONS:**
  - Submit new complaint (category, description, optional attachment)
  - Select category from dropdown (HR, Harassment, Workload, Technical, etc.)
  - Mark complaint as anonymous
  - View complaint history with status
  - View status indicators and badge colors
- **DATA SHOWN:**
  - Complaint form (category dropdown, description textarea, file upload, anonymous toggle)
  - Complaints history table (date, category, status, description preview)
  - Status badges (open, in-review, resolved, closed)
- **API CALLS:**
  - `GET /complaints`
  - `POST /complaints` (category, description, attachment_url, is_anonymous)
- **REALTIME:** No

---

### PAGE 52: Employee Helpdesk
- **FILE:** `src/pages/EmployeeHelpDeskPage.jsx`
- **ROUTE:** `/employee/helpdesk`
- **PURPOSE:** Support ticket page for employees to raise and discuss issues.
- **ACTIONS:**
  - Create new ticket (form with category, subject, description, priority, attachment)
  - View ticket list with filters
  - Select ticket to view details and comments
  - Add comments/responses to ticket
  - View ticket status and assignment
  - Upload attachments
- **DATA SHOWN:**
  - Ticket list (subject, category, priority, status, created date, assigned to, last update)
  - Ticket detail pane (description, comments thread with timestamps, attachments, status)
  - Create ticket form (category, subject, description, priority, file upload)
  - Dashboard stats, if applicable
- **API CALLS:**
  - `GET /helpdesk/my/tickets?status={status}&category={category}`
  - `POST /helpdesk/tickets` (FormData: category, subject, description, priority, attachment)
  - `POST /helpdesk/tickets/:id/comments` (comment_text)
- **REALTIME:** Yes — Socket.IO events for status_changed, comment_added

---

### PAGE 53: Employee Surveys
- **FILE:** `src/pages/EmployeeSurveysPage.jsx`
- **ROUTE:** `/employee/surveys`
- **PURPOSE:** Survey inbox listing available surveys and completion status.
- **ACTIONS:**
  - View survey cards (title, description, deadline, response status)
  - Navigate to fill survey page
  - Check if survey already completed (button disabled if completed)
- **DATA SHOWN:**
  - Survey cards list (title, description, deadline, status badge indicating completed)
  - Open survey button (disabled if already responded)
- **API CALLS:**
  - `GET /surveys`
- **REALTIME:** No

---

### PAGE 54: Employee Survey Fill
- **FILE:** `src/pages/EmployeeSurveyFillPage.jsx`
- **ROUTE:** `/employee/surveys/:id`
- **PURPOSE:** Dynamic form to submit answers for one survey.
- **ACTIONS:**
  - Answer survey questions:
    - Text input for text questions
    - Rating dropdown (1-5) for rating questions
    - Radio buttons for multiple-choice questions
  - Submit all responses
  - Validation feedback before submit
- **DATA SHOWN:**
  - Survey title and description
  - Questions with appropriate input types (text, select/dropdown, radio)
  - Submit button
- **API CALLS:**
  - `GET /surveys/:id`
  - `POST /surveys/:id/respond` (answers array with question_id and answer_text)
- **REALTIME:** No

---

### PAGE 55: Employee Performance
- **FILE:** `src/pages/EmployeePerformancePage.jsx`
- **ROUTE:** `/employee/performance`
- **PURPOSE:** Employee performance workspace for goals and appraisal submissions.
- **ACTIONS:**
  - Create/add goals (title, description, target)
  - Update goal progress (%)
  - Submit self-appraisal (overall comment, item ratings from 1-5)
  - Submit peer feedback (select colleague, rating, comment, anonymous toggle)
  - Review manager feedback (view-only)
  - Update goal status as needed
- **DATA SHOWN:**
  - Goals list (title, description, target, progress bar, status)
  - Appraisal forms sections:
    - Self-appraisal (overall comment textarea, items with ratings)
    - Peer feedback form (colleague selector, rating dropdown, comment)
    - Manager feedback display (rating, feedback text)
  - Progress indicators
- **API CALLS:**
  - `GET /performance/my-overview`
  - `POST /performance/goals`
  - `PATCH /performance/goals/:goalId/progress`
  - `POST /performance/self-appraisal` (cycle_id, overall_comment, items array)
  - `POST /performance/peer-feedback` (cycle_id, employee_id, rating, comment, is_anonymous)
- **REALTIME:** No

---

### PAGE 56: Employee Onboarding
- **FILE:** `src/pages/EmployeeOnboardingPage.jsx`
- **ROUTE:** `/employee/onboarding`
- **PURPOSE:** Personal onboarding checklist completion page.
- **ACTIONS:**
  - View onboarding checklist items
  - Mark task complete (checkbox)
  - Upload required documents
  - Track overall progress
  - View task descriptions and requirements
- **DATA SHOWN:**
  - Progress bar (completion %)
  - Template name
  - Tasks list (checkbox, title, description, document upload field if required)
  - Task status indicators (completed, pending, document uploaded)
- **API CALLS:**
  - `GET /onboarding/my-checklist`
  - `PATCH /onboarding/my/tasks/:taskId` (FormData: is_completed, document)
- **REALTIME:** No

### PAGE 57: Employee Profile Detail (route-bound)
- **FILE:** `src/pages/EmployeeProfilePage.jsx`
- **ROUTE:** `/employee/profile/:id`
- **PURPOSE:** Route-level employee profile details page when clicking on colleague profiles from employee area.
- **ACTIONS:**
  - View tabbed employee detail sections (Personal Info, Documents, Attendance, ID Card, NDA)
  - Download ID card as image
  - View attendance history
- **DATA SHOWN:**
  - Employee profile information (for other employees)
  - Attendance and document sections
  - ID card preview (if accessible by policy)
- **API CALLS:**
  - `GET /employees/:id`
  - Attendance/profile related fetches used by component
- **REALTIME:** No

---

### PAGE 58: Employee Settings
- **FILE:** `src/pages/SettingsPage.jsx`
- **ROUTE:** `/employee/settings`
- **PURPOSE:** Personal preferences management for employee account UX settings.
- **ACTIONS:**
  - Toggle notification preferences (email, push, updates, reminders)
  - Select theme (light, dark, system)
  - Select font size (small, medium, large)
  - Toggle high contrast mode
  - Save preferences
- **DATA SHOWN:**
  - Notification toggle switches
  - Theme selector
  - Font size selector
  - Accessibility toggles
  - Preview of current theme
- **API CALLS:**
  - No backend API in current implementation (localStorage-based)
- **REALTIME:** No

---

### PAGE 59: Employee Chat (Shared)
- **FILE:** `src/pages/ChatPage.jsx`
- **ROUTE:** `/chat`
- **PURPOSE:** Same shared live chat system available to employees as HR.
- **ACTIONS:**
  - Start/switch 1-to-1 conversations
  - Start/switch group chats
  - Send messages
  - Create group chat
  - Add members to group
  - Leave group
  - Search conversations
  - Upload files in chat
  - Delete/clear conversation history
  - Initiate voice/video calls on contacts
  - View online status
- **DATA SHOWN:**
  - Contact list (name, avatar, online status)
  - Group list (name, member count, last message)
  - Message thread (sender, timestamp, content, attachments, read status)
  - Typing indicator
  - Call notifications
- **API CALLS:**
  - `GET /chat/contacts`
  - `GET /chat/groups`
  - `GET /chat/groups/:groupId/members`
  - `GET /chat/history/:targetId`
  - `POST /chat/message`
  - `POST /chat/create-group`
  - `POST /chat/add-members`
  - `POST /chat/leave-group`
  - `DELETE /chat/history/:targetId`
  - `POST /chat/upload`
- **REALTIME:** Yes — Socket.IO events: `identify`, `join_room`, `receive_message`, `incoming_call`, `user_online`, `user_offline`, etc.

---

### PAGE 60: Employee Meetings
- **FILE:** `src/pages/MeetingsPage.jsx`
- **ROUTE:** `/meetings`
- **PURPOSE:** Shared meeting scheduler/list for employee users.
- **ACTIONS:**
  - Schedule meeting (form with title, agenda, date/time, duration, participant selection)
  - Select participants from employee list
  - View meeting list/cards
  - Join meeting room from list
  - Cancel meeting (if creator, if applicable)
- **DATA SHOWN:**
  - Meeting cards (title, date/time, duration, participant avatars, meeting link)
  - Create meeting form and modal
- **API CALLS:**
  - `GET /meetings`
  - `GET /employees`
  - `POST /meetings`
- **REALTIME:** No

---

### PAGE 61: Employee Meeting Room (Shared)
- **FILE:** `src/pages/MeetingRoomPage.jsx`
- **ROUTE:** `/meetings/:id`
- **PURPOSE:** Shared live meeting room with AV controls and chat.
- **ACTIONS:**
  - Toggle microphone
  - Toggle camera
  - Toggle screen share
  - Toggle recording
  - Send chat messages (if chat enabled in room)
  - End call
  - Add additional participants
  - Mute/unmute others (if moderator)
- **DATA SHOWN:**
  - Live video grid (local and remote participant streams)
  - Participant list with status
  - Chat pane (messages, timestamps, optional file previews)
  - Control buttons for AV and actions
  - Meeting title and duration timer
- **API CALLS:**
  - `GET /meetings/:id`
  - `GET /employees`
  - `POST /meetings/:id/add-participant`
- **REALTIME:** Yes — Socket.IO for WebRTC signaling and meeting chat events

---

### PAGE 62: Employee Drive (Shared)
- **FILE:** `src/pages/DrivePage.jsx`
- **ROUTE:** `/drive`
- **PURPOSE:** Shared cloud storage access for employee-level document handling.
- **ACTIONS:**
  - Browse folders (navigate via breadcrumb)
  - Create new folder
  - Upload file
  - Download file
  - Delete file/folder (confirmation)
  - Search files
  - Filter by file type or folder
  - Switch between drive scopes (if applicable)
- **DATA SHOWN:**
  - Breadcrumb navigation
  - Folder/file list (icon, name, size, modification date, owner)
  - View toggle (grid/list)
  - Upload progress
  - File metadata
- **API CALLS:**
  - `GET /drive/contents?type={viewType}&folder_id={folderId}`
  - `POST /drive/upload` (FormData with file + folder_id)
  - `POST /drive/folder`
  - `DELETE /drive/file/:id`
  - `GET /drive/download/:id`
- **REALTIME:** No

---

### PAGE 63: Employee Self Profile (Shared)
- **FILE:** `src/pages/ProfilePage.jsx`
- **ROUTE:** `/profile`
- **PURPOSE:** Shared self-profile edit page for the logged-in employee.
- **ACTIONS:**
  - Edit personal fields (name, email, role, DOB, address)
  - Upload/change profile photo
  - Save profile changes
- **DATA SHOWN:**
  - Personal profile form (full name, email, role, DOB, address)
  - Avatar upload controls
  - Save button and feedback
- **API CALLS:**
  - User profile fetch endpoint
  - `PUT /user/me` or update-profile endpoint
- **REALTIME:** No

---

## SECTION 3 — SHARED & PUBLIC PAGES

### PAGE 64: Login
- **FILE:** `src/pages/LoginPage.jsx`
- **ROUTE:** `/login`
- **PURPOSE:** Entry point for both HR and Employee authentication.
- **ACTIONS:**
  - Select role (HR or Employee) — toggle selector
  - Enter email address
  - Enter password
  - Submit login form
  - Navigate to forgot-password page
- **DATA SHOWN:**
  - Role selector (HR/Employee tabs or toggle)
  - Email input field
  - Password input field
  - Login button and loading state
  - Link to forgot-password page
  - Error messages (if login fails)
- **API CALLS:**
  - `POST /auth/login` (email, password, role)
- **REALTIME:** No

---

### PAGE 65: Forgot Password
- **FILE:** `src/pages/ForgotPasswordPage.jsx`
- **ROUTE:** `/forgot-password`
- **PURPOSE:** Starts password reset process by email.
- **ACTIONS:**
  - Enter email address
  - Submit request
  - View confirmation screen
  - Return to login
- **DATA SHOWN:**
  - Email input field
  - Submit button
  - Confirmation feedback (check icon, message: "Reset link sent to email")
  - Back to login link
- **API CALLS:**
  - `POST /auth/forgot-password` (email)
- **REALTIME:** No

---

### PAGE 66: Reset Password
- **FILE:** `src/pages/ResetPasswordPage.jsx`
- **ROUTE:** `/reset-password?token={token}`
- **PURPOSE:** Sets new password using reset token from email link.
- **ACTIONS:**
  - Enter new password (minimum 8 characters)
  - Confirm password (must match)
  - Submit reset form
  - Validation feedback
  - Redirect to login on success
- **DATA SHOWN:**
  - Reset password form (new password input, confirm password input)
  - Submit button
  - Password strength indicator or requirements text
  - Error/validation messages
  - Success confirmation
- **API CALLS:**
  - `POST /auth/reset-password` (new_password, confirm_password, token)
- **REALTIME:** No

---

### PAGE 67: Profile Route Note (Not Currently Exposed)
- **FILE:** `src/pages/EmployeeProfilePage.jsx`
- **ROUTE:** Requested `/profile/:id` — NOT currently routed in App.jsx
- **PURPOSE:** A `/profile/:id` public profile route is requested but not currently exposed as a routed public page.
- **ACTIONS:** (as described in Section 1 & 2 entries)
- **DATA SHOWN:** (as described in Section 1 & 2 entries)
- **API CALLS:** (as described in Section 1 & 2 entries)
- **REALTIME:** No
- **NOTE:** EmployeeProfilePage.jsx component exists and is used in `/hr/employees/:id` and `/employee/profile/:id` routes, but is not exposed as a public `/profile/:id` route in the current [src/App.jsx](src/App.jsx) router configuration.

---

## ADDITIONAL NOTES

### Unrouted Page
**HRAnalyticsPage** (`src/pages/HRAnalyticsPage.jsx`) — This page exists in the codebase but is currently **not routed** in `src/App.jsx`. HR users cannot navigate to analytics via the application router.

### Page Template Format
Each page entry includes:
- **FILE:** Relative path to component
- **ROUTE:** URL path pattern
- **PURPOSE:** Clear one-sentence description for non-technical users
- **ACTIONS:** Bullet list of every user-triggerable action
- **DATA SHOWN:** List of displayed information
- **API CALLS:** Exact endpoint paths and methods used
- **REALTIME:** Real-time features (Socket.IO events, polling, timers)

### Coverage Summary
- **Total Pages Documented:** 67 pages (64 currently routed + 3 notes)
- **HR Routes:** 32 pages (+1 unrouted HRAnalyticsPage)
- **Employee Routes:** 20 pages
- **Shared Routes:** 9 pages (both roles can access)
- **Public Routes:** 3 pages (unauthenticated)
- **Route Notes:** 1 note about unexposed public profile route

### Real-time Capable Pages
**6 pages use Socket.IO or interval-based real-time updates:**
1. ChatPage — Socket.IO message events
2. MeetingRoomPage — WebRTC signaling + chat events
3. HRHelpDeskPage — Socket.IO ticket events
4. EmployeeHelpDeskPage — Socket.IO status/comment events
5. EmployeeAttendancePage — Local setInterval timer for active session
6. No others use active polling or WebSocket connections

---

**End of Complete Frontend Pages Breakdown**
