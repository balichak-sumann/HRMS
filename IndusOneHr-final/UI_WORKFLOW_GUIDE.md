# UI Workflow Guide - What You Do As A User

This guide shows **practical step-by-step workflows** - exactly what you click, see, and do in the application.

---

## 🚀 GETTING STARTED - First Time Login

### Step 1️⃣: Access the Application
```
Go to: http://localhost:5173 (or your deployed URL)
You see: LOGIN page with email & password fields
```

### Step 2️⃣: Login
```
✅ Enter Email: admin@indus.com (or your email)
✅ Enter Password: your-password
✅ Click "LOGIN" button

Result:
  If FIRST LOGIN:
    → You're redirected to RESET PASSWORD page
    → Create a new strong password
    → Click "RESET PASSWORD"
    → Success message appears
    
  If NOT first login:
    → Based on your role, you see:
       - **ADMIN** → Admin Dashboard
       - **HR** → HR Dashboard
       - **EMPLOYEE** → Employee Dashboard
```

---

## 👤 ADMIN WORKFLOWS

### ⚙️ Workflow #1: Create New Employee

You're at: **Admin Dashboard**

**Step 1: Go to Employees Page**
```
LEFT SIDEBAR → Click "Employees"
You see: List of all existing employees in a table

Columns visible:
  • Name | Email | Department | Joining Date | Salary | Actions
```

**Step 2: Click Add Button**
```
At the TOP RIGHT of the page → Click "Add Employee" button (blue button)
A MODAL DIALOG appears with form fields:

FORM FIELDS:
  ✏️ First Name *
  ✏️ Last Name *
  ✏️ Email * (Unique - can't duplicate)
  ✏️ Phone Number * (Format: 10 digits or +91+10 digits)
  ✏️ Department *
  ✏️ Designation *
  ✏️ Date of Joining *
  ✏️ Reporting Manager (Dropdown - select from existing employees)
  ✏️ Pan Number (Format: ABCDE1234F)
  ✏️ Aadhaar Number (12 digits)
  ✏️ Bank Account Number (9-18 digits)
  ✏️ Emergency Contact Phone * (10 digits)
  ✏️ Base Salary *
  ✏️ Allowances (optional)
  ✏️ Deductions (optional)
```

**Step 3: Fill the Form**
```
You fill all required fields (*) with valid data

REAL EXAMPLE:
  First Name: John
  Last Name: Doe
  Email: john.doe@company.com
  Phone: 9876543210
  Department: Engineering
  Designation: Senior Developer
  Joining Date: 2024-01-15
  Reporting Manager: [Select from dropdown]
  PAN: ABCDE1234F
  Aadhaar: 123456789012
  Bank Account: 12345678901234
  Emergency Contact: 9876543210
  Base Salary: 50000
  Allowances: 10000
  Deductions: 5000
```

**Step 4: Submit**
```
At bottom of modal → Click "CREATE" button
Loading spinner appears...

Result:
  ✅ SUCCESS: Modal closes
  ✅ Employee appears in the list
  ✅ Success toast notification: "Employee created successfully"
  ✅ Email AUTOMATICALLY SENT to employee with:
     • Welcome message
     • Password reset link
     • Username (email)
  ✅ Employee account created with status: "pending_activation"
     (Employee needs to click reset link to activate)

❌ ERROR (If email not accepted by SMTP):
  ❌ Modal shows error: "Welcome email not accepted by SMTP"
  ❌ Employee NOT created, transaction rolled back
  ❌ You need to retry with different email or check SMTP settings
```

---

### 💰 Workflow #2: Set Employee Salary & Generate Payslip

You're at: **Admin Dashboard**

**Step 1: Go to Payroll Page**
```
LEFT SIDEBAR → Click "Payroll"
You see: Table showing all employees with salary info

Columns visible:
  • Employee Name
  • Base Salary
  • Allowances
  • Deductions
  • Net Salary
  • Actions (Edit, View Slip)
```

**Step 2: Edit an Employee's Salary**
```
Find the employee row → Click "EDIT" button
A MODAL appears with editable fields:

Fields:
  ✏️ Base Salary
  ✏️ Allowances breakdown
  ✏️ Deductions breakdown
  ✏️ Other components

Modify values as needed → Click "SAVE"

Result:
  ✅ Salary updated
  ✅ All future salary slips calculated with new values
```

**Step 3: Generate Monthly Payslip**
```
Stay on Payroll page → Click "GENERATE SLIP" button (or per-employee)
A section appears where you select:
  • Month & Year (dropdown)
  • Employee(s) to generate for (checkbox list)

Click "GENERATE"

Result:
  ✅ Payslips generated automatically
  ✅ Calculations done: Gross - Deductions = Net
  ✅ You can PREVIEW or DOWNLOAD PDF
  
Employee can NOW see these slips at:
  /employee/payslips → View all monthly slips
```

**Step 4: Employee Views Their Payslip**
```
Employee logs in → LEFT SIDEBAR → Click "My Payslips"
They see: Table with months showing:
  • Month
  • Gross Salary
  • Deductions
  • Net Salary
  • Download button

Employee clicks "DOWNLOAD" → PDF file generated with:
  • Company header
  • Employee details
  • Salary breakdown
  • Deductions breakdown
  • Bank details
```

---

### 📋 Workflow #3: Create & Track Appraisal Cycle

You're at: **Admin Dashboard**

**Step 1: Go to Performance Page**
```
LEFT SIDEBAR → Click "Performance"
You see: 
  • "Create Appraisal Cycle" form at top
  • List of existing cycles below
```

**Step 2: Create Cycle**
```
FORM at top with fields:
  ✏️ Cycle Name (e.g., "Q2 FY2024 Review")
  ✏️ Start Date (date picker)
  ✏️ End Date (date picker)
  ✏️ Status (Draft, Active, Closed)

Fill form → Click "CREATE"

Result:
  ✅ Cycle appears in list below
  ✅ Status shows: "DRAFT" (gray badge)
  ✅ Initially all employee data is NULL (waiting for submissions)
```

**Step 3: Activate Cycle**
```
Find the cycle in list → Click on it
You see cycle details:
  • Cycle name
  • Dates
  • Status dropdown showing "Draft"
  
STATUS DROPDOWN → Change from "Draft" to "Active"
Click SAVE

Result:
  ✅ Status changes to "ACTIVE" (green badge)
  ✅ INSTANTLY, all employees can now:
     → See this cycle in their Performance page
     → Add goals
     → Submit self-appraisal
     → Give peer feedback
```

**Step 4: Monitor Completion**
```
Stay on Performance page → Look at cycle row:
  
You see metrics:
  • Employees in Cycle: 25
  • Self Completed: 18 ✅ (72%)
  • Manager Completed: 12 ✅ (48%)
  
Below that: TABLE showing each employee:
  • Employee Name
  • Goals Count
  • Self (Done/Pending)
  • Manager (Done/Pending)
  • Avg Score (when all complete)

As employees submit, these update LIVE

Example employee row:
  John Doe | 3 goals | Done ✅ | Pending ❌ | -
  (Waiting for manager to submit feedback)
```

**Step 5: Close Cycle**
```
When performance period ends:
  Status dropdown → Change from "Active" to "Closed"
  
Result:
  ✅ Employees can NO LONGER add new goals or appraisals
  ✅ Final scores locked in (visible in Avg Score column)
  ✅ Historical data saved for records
```

---

### ✅ Workflow #4: Approve Employee Leave Request

You're at: **Admin Dashboard**

**Step 1: Go to Leave Requests Page**
```
LEFT SIDEBAR → Click "Leave Requests" (or "Leaves")
You see: Table of all leave requests

Columns:
  • Employee Name
  • Leave Type (Sick, Annual, Casual, etc.)
  • Start Date
  • End Date
  • Days Applied
  • Status (Pending, Approved, Rejected)
  • Actions (Approve, Reject)

Filter by: Status = Pending
```

**Step 2: Review Request**
```
Find a "Pending" leave request in the table
Click on the row → Details appear:
  • Employee name: John Doe
  • Type: Annual Leave
  • Duration: Jan 15 - Jan 20, 2024 (6 days)
  • Reason: Family vacation
  • Employee balance: 12 days available
  • Request date: Jan 1, 2024

You can see: Is this within their leave balance? ✅ Yes
```

**Step 3: Approve or Reject**
```
Two options:

OPTION A - APPROVE:
  Click "APPROVE" button
  
  Modal appears asking: "Reason for approval?"
  (Optional comment field)
  
  Click "CONFIRM APPROVE"
  
  Result:
    ✅ Status changed to "APPROVED" (green)
    ✅ AUTOMATIC EMAIL sent to employee
    ✅ Leave balance DEDUCTED: 12 → 6 days
    ✅ Dates marked in calendar
    ✅ Attendance marked as "On Leave"

OPTION B - REJECT:
  Click "REJECT" button
  
  Modal appears asking: "Reason for rejection?"
  (Comment field - REQUIRED)
  
  Click "CONFIRM REJECT"
  
  Result:
    ❌ Status changed to "REJECTED" (red)
    ❌ AUTOMATIC EMAIL sent to employee
    ❌ Leave balance NOT deducted
    ❌ Employee can reapply
```

**Step 4: Employee Sees Result**
```
Employee logs in → LEFT SIDEBAR → Click "Apply Leave"
Table shows ALL their past requests:
  
  | Leave Type | Start Date | End Date | Status | 
  | Annual     | Jan 15     | Jan 20   | ✅ APPROVED |
  | Sick       | Feb 1      | Feb 1    | ❌ REJECTED |
  
In Dashboard: Shows "Upcoming Leaves: Jan 15-20 (6 days)"
```

---

### 👨‍💼 Workflow #5: Mark Employee Attendance

You're at: **Admin Dashboard**

**Step 1: Go to Attendance Page**
```
LEFT SIDEBAR → Click "Attendance"
You see: Calendar view showing all employees

Format:
  • Left side: List of employees
  • Right side: Calendar grid (Last 30 days)
  
Each cell shows: P (Present), A (Absent), L (Leave), etc.
```

**Step 2: Mark Attendance for a Date**
```
Click on employee name in left list → That employee row highlights
Click on a DATE cell for that employee → Dropdown appears:
  
Dropdown options:
  • P (Present)
  • A (Absent)
  • L (Leave)
  • HP (Half Present)
  • OD (Outdoor Duty)
  
Select "P" for Present

Result:
  ✅ Cell changes to "P" (green)
  ✅ Attendance recorded
```

**Step 3: Bulk Upload (Optional)**
```
At top of Attendance page → Click "UPLOAD ATTENDANCE CSV"
A file dialog opens → Select your CSV file

CSV format expected:
  employee_email,date,status
  john.doe@company.com,2024-01-15,P
  john.doe@company.com,2024-01-16,A
  jane.smith@company.com,2024-01-15,P

Click "UPLOAD"

Result:
  ✅ All records imported in seconds
  ✅ Calendar updates automatically
  ✅ All employees' attendance marked
```

**Step 4: Employee Views Their Attendance**
```
Employee logs in → LEFT SIDEBAR → Click "My Attendance"
Calendar shows: Their attendance for past months

They see:
  • Green: Present
  • Red: Absent
  • Yellow: Leave
  
Can also see: Summary stats
  • Total Present: 20 days
  • Total Absent: 2 days
  • Total Leave: 3 days
  • On Time: 18 days
  • Late: 2 days
```

---

### 📧 Workflow #6: Generate & Send Offer Letter

You're at: **Admin Dashboard**

**Step 1: Go to Offer Letters Page**
```
LEFT SIDEBAR → Click "Offer Letters"
You see: List of generated offer letters

Columns:
  • Employee Name
  • Position
  • CTC
  • Generated Date
  • Actions (View, Download, Resend)
```

**Step 2: Generate New Offer Letter**
```
Click "GENERATE OFFER LETTER" button (top right)
MODAL appears:

Dropdown: Select Employee
  (Lists all employees without offer letters)

Auto-filled fields (from employee record):
  • Position: Senior Developer
  • Department: Engineering
  • CTC: 60,00,000 (6 lakhs)
  • Base Salary: 50,000
  • Joining Date: 2024-03-01
  
(You can override any field)

Click "GENERATE"

Result:
  ✅ PDF generated
  ✅ Preview shown (you can review)
  ✅ Options: Download, Send Email, Print
```

**Step 3: Send to Employee**
```
In the generated offer letter preview:
  Click "SEND EMAIL" button
  
Modal asks: "Send to: john.doe@company.com?"
  
Click "CONFIRM"

Result:
  ✅ Email sent to employee
  ✅ Email includes:
     • Letter as attachment (PDF)
     • Join date details
     • CTC breakdown
     • Company policies
  ✅ Offer letter marked as "Sent"
  ✅ Employee can download and print
```

---

## 💼 HR WORKFLOWS

Most HR workflows are **identical to Admin**, except:
- ❌ Cannot create other admins
- ❌ Cannot view audit logs
- ✅ All employee, payroll, performance, leave, attendance workflows available

The key difference:

```
ADMIN page: /admin/employees → Manages all employees
HR page: /hr/employees → Manages employees (same)

ADMIN page: /admin/performance → Full control
HR page: /hr/performance → Full control

ADMIN page: /admin/audit-logs → VIEW SYSTEM LOGS
HR page: NOT AVAILABLE
```

---

## 👨‍💻 EMPLOYEE WORKFLOWS

### 📝 Workflow #1: Apply for Leave

You're an EMPLOYEE

**Step 1: Go to Apply Leave**
```
LEFT SIDEBAR → Click "Apply Leave"
You see: Form with fields:

✏️ Leave Type (Dropdown):
  • Annual Leave
  • Sick Leave
  • Casual Leave
  • Maternity Leave
  • Unpaid Leave
  
✏️ Start Date (Date picker)
✏️ End Date (Date picker)
✏️ Reason (Text area)

You also see:
  📊 Leave Balance shown:
    • Annual: 12 days available
    • Sick: 8 days available
    • Casual: 5 days available
```

**Step 2: Fill Form**
```
Select Leave Type: Annual Leave
Start Date: 2024-03-15
End Date: 2024-03-20

System CALCULATES: 6 days requested
Shows: "You have 12 days available. ✅ Sufficient balance"

Reason: "Family vacation"

Click "SUBMIT"

Result:
  ✅ Request created with status: "PENDING"
  ✅ Email sent to your reporting manager
  ✅ Toast shows: "Leave request submitted successfully"
```

**Step 3: Check Status**
```
Go back to "Apply Leave" page
You see table of YOUR requests:

| Type   | Start Date | End Date | Days | Status   |
| Annual | Mar 15     | Mar 20   | 6    | ⏳ PENDING |

After HR approves:
| Annual | Mar 15     | Mar 20   | 6    | ✅ APPROVED |

Or after rejection:
| Annual | Mar 15     | Mar 20   | 6    | ❌ REJECTED |
```

**Step 4: See Impact**
```
Go to: LEFT SIDEBAR → Click "My Dashboard"
You see card showing:
  "Upcoming Leaves: Mar 15-20 (6 days)"

Go to: LEFT SIDEBAR → Click "Calendar"
The dates Mar 15-20 are highlighted in YELLOW
Shows: "On Leave"

Your attendance status for those days:
  LEFT SIDEBAR → Click "My Attendance"
  Those dates show: "L" (Leave) marker
```

---

### 📋 Workflow #2: View Payslip & Download

You're an EMPLOYEE

**Step 1: Go to My Payslips**
```
LEFT SIDEBAR → Click "My Payslips"
You see: Table of your monthly slips

| Month     | Gross | Deductions | Net    | Download |
| Jan 2024  | 60k   | 8k         | 52k    | ⬇️       |
| Feb 2024  | 60k   | 8k         | 52k    | ⬇️       |
| Mar 2024  | 60k   | 8k         | 52k    | ⬇️       |
```

**Step 2: Download Slip**
```
Click "DOWNLOAD" button for January 2024

PDF file generated and automatically downloads:
  salary_slip_john_doe_jan_2024.pdf

PDF contains:
  ┌─────────────────────────────────┐
  │      INDUSINNOVATE HRMS         │
  │     SALARY SLIP - JAN 2024      │
  ├─────────────────────────────────┤
  │ Employee: John Doe              │
  │ ID: EMP-001                     │
  │ Designation: Senior Developer   │
  │ Department: Engineering         │
  ├─────────────────────────────────┤
  │ EARNINGS                        │
  │   Base Salary: 50,000           │
  │   Allowances: 10,000            │
  │   ─────────────                 │
  │   Gross: 60,000                 │
  ├─────────────────────────────────┤
  │ DEDUCTIONS                      │
  │   P.F.: 5,000                   │
  │   Income Tax: 3,000             │
  │   ─────────────                 │
  │   Total Deductions: 8,000       │
  ├─────────────────────────────────┤
  │ NET SALARY: 52,000              │
  │ Mode: Bank Transfer             │
  └─────────────────────────────────┘
```

**Step 3: Check Salary Structure**
```
LEFT SIDEBAR → Click "Salary Structure"
You see: Breakdown of fixed & variable components

What you see:
  FIXED COMPONENTS:
    • Base: 50,000
    • DA: 10,000
    • HRA: 5,000
  
  VARIABLE COMPONENTS:
    • Bonus: (0 currently)
    • Incentive: (0 currently)
  
  DEDUCTIONS:
    • P.F.: 5,000
    • TDS/Income Tax: Variable
    • Health Insurance: 2,000
  
You can EDIT tax declarations here too
```

---

### ⭐ Workflow #3: Set Goals & Self-Appraisal

You're an EMPLOYEE

**Step 1: Check if Cycle Active**
```
LEFT SIDEBAR → Click "Performance"
You see a message:
  "Current cycle: Q2 FY2024 Review"
  "Period: Jan 15 - Mar 31"
  
If NO active cycle:
  "No active appraisal cycle right now"
  (Can't do anything, waiting for HR to create)

If ACTIVE cycle exists:
  You see multiple sections...
```

**Step 2: Add Goals**
```
Section 1: "MY GOALS"

You see: Form to add goals
  ✏️ Goal Title (e.g., "Complete AWS certification")
  ✏️ Description (e.g., "Get certified in AWS Solutions Architect")
  ✏️ Target (e.g., "Pass exam by Feb 2024")

Fill & click "ADD GOAL"

Result: Goal appears in list:
  ┌─────────────────────────────────┐
  │ GOAL 1: Complete AWS Cert       │
  │ Target: Pass exam by Feb 2024   │
  │ Progress: 0% ▌░░░░░░░░░░        │
  │ [Update Progress]               │
  └─────────────────────────────────┘
```

**Step 3: Update Goal Progress**
```
For each goal: Click "UPDATE PROGRESS"
Modal asks: "Progress percentage?"
  (Slider 0-100%)

Set to 50% (work in progress)
Click "SAVE"

Goal now shows:
  Progress: 50% ▌▌▌▌▌░░░░░░
```

**Step 4: Submit Self-Appraisal**
```
Section 2: "SELF-APPRAISAL"
  
You see: List of your goals with rating fields:

For each goal:
  ✏️ Rating (1-5 stars or scale)
  ✏️ Comment (e.g., "Worked hard, completed 80%")

Fill all → At bottom → Text area: "Overall comment"
  (Narrative about your performance)

Click "SUBMIT SELF-APPRAISAL"

Result:
  ✅ Submission locked
  ✅ Status shows: "✅ Self-Appraisal Completed"
  ✅ Manager gets notification to review
```

**Step 5: Give Peer Feedback**
```
Section 3: "PEER FEEDBACK"

Dropdown: Select colleague
  (Shows list of employees in same cycle)

Select: "Jane Smith"

Form appears:
  ✏️ Rating (1-5 scale)
  ✏️ Comment (What they did well, improvements needed)
  ☐ Anonymous? (Check to hide your name)

Fill → Click "SUBMIT PEER FEEDBACK"

Result:
  ✅ Feedback recorded
  ✅ If anonymous: Jane sees feedback but not from whom
```

**Step 6: Receive Manager Feedback**
```
(Manager submits feedback separately)

After manager submits, you see:

Section 4: "MANAGER FEEDBACK"
  ✅ Status: Received

You can expand to see:
  • Manager comments on each goal
  • Final rating from manager
  • Improvement suggestions
```

---

### 📊 Workflow #4: View Performance Results

You're an EMPLOYEE

**Step 1: Wait for Cycle to Close**
```
HR closes the appraisal cycle
Status changes from ACTIVE → CLOSED

You see notification: "Performance cycle closed"
```

**Step 2: View Final Results**
```
RIGHT SIDEBAR of Performance page → "RESULTS"

You see:
  Self Rating Average: 4.2/5
  Manager Rating: 4.0/5
  Peer Rating Average: 3.8/5
  
  Final Score: 4.0/5 ⭐
```

---

### 🎤 Workflow #5: Fill Out Employee Survey

You're an EMPLOYEE

**Step 1: Go to Surveys**
```
LEFT SIDEBAR → Click "Surveys"
You see: List of survey(s) available

Example:
  📋 "Employee Engagement Survey"
  Period: Active until Mar 31
  Status: Not Filled
  [START SURVEY]
```

**Step 2: Fill Survey**
```
Click "START SURVEY"
QUESTIONNAIRE appears:

Q1: "Rate your job satisfaction" (1-5 scale)
Q2: "Do you have the tools needed?" (Yes/No)
Q3: "How is your work-life balance?" (Text box)
Q4: "Any improvement suggestions?" (Long text)

Fill all questions → Scroll to bottom → Click "SUBMIT"

Result:
  ✅ Status changes: Not Filled → ✅ Completed
  ✅ Your responses recorded
  ✅ Anonymous, so HR can't identify you
```

---

### 📱 Workflow #6: Download ID Card

You're an EMPLOYEE

**Step 1: Go to My ID Card**
```
LEFT SIDEBAR → Click "My ID Card"
You see: Digital ID card displayed:

┌────────────────────────────────────┐
│        INDUSINNOVATE INC           │
│      EMPLOYEE ID CARD              │
├────────────────────────────────────┤
│ [PHOTO]                            │
│                                    │
│ Name:      John Doe                │
│ ID:        EMP-001                 │
│ Dept:      Engineering             │
│ Desg:      Senior Developer        │
│ DOJ:       Jan 15, 2024            │
│ Manager:   Mike Johnson            │
│ Email:     john.doe@company.com    │
│ Phone:     9876543210              │
│                                    │
│ Valid from: Jan 15, 2024           │
│           to: Jan 14, 2025         │
└────────────────────────────────────┘
```

**Step 2: Download**
```
Click "DOWNLOAD PDF" button
File saved: employee_id_john_doe.pdf

You can:
  • Print it
  • Save digitally
  • Use for access control
```

---

### 📧 Workflow #7: Submit Complaint

You're an EMPLOYEE

**Step 1: Go to Complaint Box**
```
LEFT SIDEBAR → Click "Complaint Box"
You see: Form + list of your past complaints
```

**Step 2: Submit Complaint**
```
FORM fields:
  ✏️ Title (e.g., "Harassment by Manager")
  ✏️ Category (Dropdown):
    • Harassment
    • Discrimination
    • Unsafe Working Conditions
    • Salary Issues
    • Other
  
  ✏️ Description (Detailed account)
  ☐ Anonymous? (Check to hide your name)

Click "SUBMIT"

Result:
  ✅ Complaint recorded
  ✅ ID assigned (e.g., "COMP-001")
  ✅ Status: "OPEN"
  ✅ Email sent to HR
```

**Step 3: Track Complaint**
```
Appears in your complaints list:

| ID      | Title           | Status | Submitted | Last Update |
| COMP-001| Harassment      | OPEN   | Mar 10    | Mar 10      |

You can click to expand and see:
  • HR comments
  • Status updates
  • Actions taken
```

---

### 💬 Workflow #8: Use Chat & Messaging

You're an EMPLOYEE

**Step 1: Go to Chat**
```
LEFT SIDEBAR → Click "Chat"
You see: TWO PANELS
  LEFT: List of conversations
  RIGHT: Chat window
```

**Step 2: Start Conversation**
```
Click "+" button or "NEW CHAT"

Modal appears: "Who do you want to message?"
  (Search employee name or department)

Select: "Jane Smith" (Colleague)

Result:
  New chat window opens
  Empty, ready for messages
```

**Step 3: Send Messages**
```
Type at bottom: "Hi Jane, can we discuss the project?"
Click SEND (Paper plane icon)

Message appears:
  ► YOU: "Hi Jane, can we discuss the project?" (right side, blue)
  
Jane replies (if online):
  ◄ JANE: "Sure, let's talk at 3 PM" (left side, gray)
```

**Step 4: Share Files**
```
Click ATTACHMENT ICON in chat
Select file from computer (PDF, image, doc, etc.)

Result:
  File sent in chat
  Jane can DOWNLOAD
```

**Step 5: Create Group Chat**
```
Click "NEW GROUP CHAT"
Modal: Select multiple employees:
  ☐ Jane Smith
  ☐ Mike Johnson
  ☐ Sarah Williams
  
Enter Group Name: "Engineering Team"
Click "CREATE"

Result:
  Group chat opens
  All can see & reply
  Files shared with all
```

---

### 📹 Workflow #9: Join Meeting

You're an EMPLOYEE

**Step 1: Go to Meetings**
```
LEFT SIDEBAR → Click "Meetings"
You see: List of scheduled meetings

| Meeting    | Date       | Time  | Organizer     | Status       |
| Project X  | Mar 15     | 2 PM  | Mike Johnson  | In 10 mins   |
| Team Sync  | Mar 15     | 3 PM  | Jane Smith    | Later today  |
```

**Step 2: Join Upcoming Meeting**
```
For "Project X" meeting:
  Status shows: "In 10 mins"
  
Click "JOIN" button

Meeting room opens:
  VIDEO window (webcam)
  SCREEN SHARING option
  CHAT box on right
  PARTICIPANTS list
  
Meeting starts...
  You can:
    • Speak & be heard
    • See others' video
    • Share your screen
    • Chat
    • Record (if organizer allows)
```

---

## 🔄 TYPICAL DAILY WORKFLOWS

### Admin/HR Daily Routine
```
9:00 AM
  └─ Login → Dashboard
     View KPIs:
       • 5 leave requests pending
       • 2 new employees to onboard
       • 15 attendances not marked

9:15 AM
  └─ Go to Employees
     • Create 2 new employees
     • Send welcome emails

9:45 AM
  └─ Go to Attendance
     • Mark attendance for team

10:00 AM
  └─ Go to Leave Requests
     • Approve 3 leaves
     • Reject 2 (insufficient balance)

11:00 AM
  └─ Go to Payroll
     • Adjust salary for 1 employee promotion
     • Generate monthly slips

12:00 PM
  └─ Go to Performance
     • Check cycle completion: 70% done
     • Send reminders to non-submitted employees

4:00 PM
  └─ Go to Complaints
     • Review new complaint submitted
     • Assign to manager for action

5:00 PM
  └─ Go to Audit Logs (Admin only)
     • Check system activity
     • Verify all changes made today
```

### Employee Daily Routine
```
9:00 AM
  └─ Login → My Dashboard
     See:
       • Leave balance: 10 days
       • Attendance: Present ✅
       • Upcoming leave: Mar 15-20
       • Performance cycle: 65% complete

10:00 AM
  └─ Go to My Attendance
     • Check-in marked: 9:00 AM

3:00 PM
  └─ Join Team Meeting
     • Via Meetings page
     • 30 min sync with team

4:00 PM
  └─ Update Performance Goals
     └─ Go to Performance
        • Update goal progress: 60%
        • Add comment: "Completed module 1, awaiting review"

5:00 PM
  └─ Check Chat
     • Message from Jane: "Can you review my code?"
     • Reply: "Sure, I'll look at it tonight"

Before leaving:
  └─ Apply for Leave (next month)
     └─ Go to Apply Leave
        • Request: Annual leave Apr 1-5
        • Reason: Personal trip
        • Submit
```

---

## 🎯 KEY NAVIGATION TIPS

### From Any Page, You Can:

```
1. LOGO (Top Left) → Takes you to Role Dashboard
   • Admin logo → /admin/dashboard
   • HR logo → /hr/dashboard
   • Employee logo → /employee/dashboard

2. SIDEBAR (Left) → Navigate to any page you have access to
   • Click menu item → Instant navigation
   • Active page highlighted in BLUE

3. USER AVATAR (Top Right) → Account options
   • My Profile → Edit personal info
   • Settings → Change theme, notifications
   • Logout → Exit application

4. NOTIFICATIONS (Bell icon) → See updates
   • New leave pending approval
   • New message
   • Performance cycle opened
   • Complaint status changed

5. SEARCH (Top Center) → Quick search
   • Search employee names
   • Search documents
   • Search previous conversations
```

---

## ⚠️ COMMON PITFALLS & FIXES

### Problem: "Employee created but not activated"
```
Reason: Employee hasn't clicked reset link in welcome email
Solution:
  • Employee checks their email (might be in spam)
  • Clicks password reset link
  • Sets new password
  • Account becomes ACTIVE
  • Can now login
```

### Problem: "Can't create employee - email already exists"
```
Reason: Email already used in system
Solution:
  • Use different email
  • OR delete that employee first (be careful!)
  • OR contact admin to merge accounts
```

### Problem: "Leave request shows 'Pending' for days"
```
Reason: Manager/HR hasn't approved yet
Solution:
  • Remind manager to approve (in Chat)
  • Or escalate to HR
  • Or reapply with different dates
```

### Problem: "Payslip shows zero salary"
```
Reason: Salary not set for that month
Solution:
  • Go to Payroll page
  • Click employee → Edit
  • Set Base Salary, Allowances, Deductions
  • Save
  • Regenerate slip
```

### Problem: "Performance cycle created but employees can't see it"
```
Reason: Cycle status is still "Draft"
Solution:
  • Go to Performance page
  • Find cycle → Click status dropdown
  • Change from "Draft" to "Active"
  • Save
  • Now employees can see & participate
```

---

## 📱 Mobile Usage

All workflows work on MOBILE (responsive design):

```
ON PHONE:
  • SIDEBAR collapses (hamburger menu ☰)
  • Tap ☰ to open
  • Tables scroll horizontally
  • Forms stack vertically
  • Buttons larger & touch-friendly
  • Same workflows, just formatted for small screens
```

---

This guide shows you **what actually happens** when you click buttons and fill forms. Reference this when you're using the application!

