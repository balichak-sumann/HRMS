# IndusInnovate HR Suite - Complete Technical Documentation

**Generated:** March 20, 2026  
**Project:** IndusInnovate Technologies HR Suite  
**Repository Structure:** Full-stack MERN (Express + React + PostgreSQL)

---

## TABLE OF CONTENTS
1. [Technology Stack](#technology-stack)
2. [Database Schema](#database-schema)
3. [API Routes & Endpoints](#api-routes--endpoints)
4. [Authentication & Security](#authentication--security)
5. [Real-time Features (Socket.IO)](#real-time-features)
6. [File Upload Management](#file-upload-management)
7. [PDF Generation Features](#pdf-generation-features)
8. [Frontend Pages & Routes](#frontend-pages--routes)
9. [Environment Configuration](#environment-configuration)
10. [Startup & Build Commands](#startup--build-commands)

---

## TECHNOLOGY STACK

### Frontend Dependencies (package.json)
- **React:** ^19.2.0
- **React DOM:** ^19.2.0
- **React Router:** react-router-dom ^7.13.1
- **PDF Generation:** @react-pdf/renderer ^4.3.2
- **Image Conversion:** html-to-image ^1.11.13
- **QR Code:** qrcode.react ^4.2.0
- **Charts:** recharts ^3.7.0
- **UI Icons:** lucide-react ^0.577.0
- **Notifications:** react-hot-toast ^2.6.0
- **Real-time Client:** socket.io-client ^4.8.3
- **Build Tool:** Vite ^7.3.1
- **Linter:** ESLint ^9.39.1

### Backend Dependencies (server/package.json)
- **Runtime:** Node.js (CommonJS)
- **Framework:** Express ^5.2.1
- **Database:** PostgreSQL via pg ^8.20.0
- **Authentication:** jsonwebtoken ^9.0.3
- **Password Hashing:** bcryptjs ^3.0.3
- **File Upload:** multer ^2.1.1
- **Real-time:** socket.io ^4.8.3
- **Email Service:** nodemailer ^8.0.1
- **Task Scheduling:** node-cron ^4.2.1
- **Environment:** dotenv ^17.3.1
- **CORS:** cors ^2.8.6
- **HTTP:** node-fetch ^2.7.0

---

## DATABASE SCHEMA

### Core Tables (31 Total)

#### 1. **profiles** (Authentication & User Accounts)
- `id` (UUID) - Primary Key
- `email` (TEXT UNIQUE) - Login identifier
- `role` (TEXT) - 'hr' or 'employee'
- `password_hash` (TEXT) - bcrypt hashed
- `employee_id` (TEXT UNIQUE) - Link to employee record
- `is_first_login` (BOOLEAN) - Change password on first login
- `failed_login_attempts` (INT) - Lockout counter (max 5)
- `locked_at` (TIMESTAMP) - Account lock time
- `status` (TEXT) - 'active' or 'inactive'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 2. **employees** (Employee Master Data)
- `id` (UUID) - Primary Key
- `full_name` (TEXT)
- `email` (TEXT UNIQUE)
- `role` (TEXT)
- `department` (TEXT)
- `phone` (TEXT)
- `joining_date` (DATE)
- `salary` (NUMERIC) - Base salary
- `status` (TEXT) - 'Active' | 'Inactive'
- `avatar_url` (TEXT) - Profile picture path
- `designation` (TEXT)
- `reporting_manager_id` (UUID) - Self-reference FK
- `manager_id` (UUID) - Manager assignment
- `department_id` (UUID) - FK to departments
- `employee_id` (TEXT UNIQUE) - Employee ID code
- `dob` (DATE) - Date of birth
- `pan` (TEXT) - PAN number
- `bank_account` (TEXT) - Bank account number
- `bank_name` (TEXT)
- `location` (TEXT)
- `address` (TEXT)
- `salary_revision_history_enabled` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 3. **departments** (Organization Structure)
- `id` (UUID)
- `name` (TEXT UNIQUE)
- `description` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Seeded Departments:**
- Engineering
- Sales
- Marketing
- Design
- Human Resources

#### 4. **leaves** (Leave Requests)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `leave_type` (TEXT) - 'Sick' | 'Casual' | 'Earned' | 'Comp-Off'
- `start_date` (DATE)
- `end_date` (DATE)
- `days` (NUMERIC)
- `reason` (TEXT)
- `status` (TEXT) - 'Pending' | 'Approved' | 'Rejected'
- `attachment_url` (TEXT)
- `reviewed_by` (UUID) - FK to employees
- `reviewed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

#### 5. **leave_balances** (Annual Leave Allocation)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `year` (INT)
- `casual_total` (INT) - Default: 12
- `casual_used` (INT)
- `casual_encashed` (INT)
- `sick_total` (INT) - Default: 12
- `sick_used` (INT)
- `sick_encashed` (INT)
- `earned_total` (INT) - Default: 15
- `earned_used` (INT)
- `earned_encashed` (INT)
- `comp_off_total` (INT)
- `comp_off_used` (INT)
- `comp_off_encashed` (INT)
- UNIQUE(employee_id, year)

#### 6. **holidays** (Company Calendar)
- `id` (UUID)
- `name` (TEXT)
- `date` (DATE)
- `type` (TEXT) - 'National'
- `label` (TEXT)
- `created_at` (TIMESTAMP)

#### 7. **attendance** (Daily Check-in/out)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `check_in` (TIMESTAMP)
- `check_out` (TIMESTAMP)
- `status` (TEXT) - 'Present' | 'On Leave' | 'Late' | 'Half-Day'
- `hours_worked` (NUMERIC)
- `location` (TEXT)
- `created_at` (TIMESTAMP)

#### 8. **shifts** (Shift Templates)
- `id` (UUID)
- `name` (TEXT UNIQUE)
- `start_time` (TIME)
- `end_time` (TIME)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 9. **employee_shift_assignments** (Shift Allocation)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `shift_id` (UUID) - FK
- `effective_from` (DATE)
- `effective_to` (DATE)
- `assigned_by` (UUID) - FK to employees
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- INDEX: (employee_id, effective_from, effective_to)

#### 10. **payroll** (Monthly Payroll Records)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `month` (TEXT)
- `year` (INTEGER)
- `basic_salary` (NUMERIC)
- `hra` (NUMERIC)
- `allowances` (NUMERIC)
- `conveyance` (NUMERIC)
- `special_allowance` (NUMERIC)
- `pf` (NUMERIC) - Provident Fund
- `pf_employee` (NUMERIC)
- `pf_employer` (NUMERIC)
- `esi_employee` (NUMERIC)
- `esi_employer` (NUMERIC)
- `tds` (NUMERIC)
- `ptax` (NUMERIC)
- `gross_salary` (NUMERIC)
- `deductions` (NUMERIC)
- `net_salary` (NUMERIC)
- `status` (TEXT) - 'Pending' | 'Generated'
- `emp_code` (TEXT)
- `designation` (TEXT)
- `department` (TEXT)
- `location` (TEXT)
- `processed_days` (INT) - Default: 31
- `paid_days` (INT) - Default: 31
- `pan_no` (TEXT)
- `bank_account` (TEXT)
- `bank_name` (TEXT)
- `reimbursements` (NUMERIC)
- `leave_encashment` (NUMERIC)
- `generated_by` (UUID) - FK
- `sent_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

#### 11. **payroll_statutory_settings** (Tax Configuration)
- `id` (UUID)
- `pf_employee_rate` (NUMERIC) - Default: 12%
- `pf_employer_rate` (NUMERIC) - Default: 12%
- `esi_employee_rate` (NUMERIC) - Default: 0.75%
- `esi_employer_rate` (NUMERIC) - Default: 3.25%
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 12. **payroll_tds_slabs** (Income Tax Slabs)
- `id` (UUID)
- `income_from` (NUMERIC)
- `income_to` (NUMERIC)
- `rate` (NUMERIC) - Tax rate %
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Default TDS Slabs:**
- 0 - 3,00,000: 0%
- 3,00,000 - 6,00,000: 5%
- 6,00,000 - 9,00,000: 10%
- 9,00,000 - 12,00,000: 15%
- 12,00,000 - 15,00,000: 20%
- 15,00,000+: 30%

#### 13. **income_tax_declarations** (Employee Tax Planning)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `financial_year` (TEXT)
- `status` (TEXT) - 'draft' | 'submitted' | 'reviewed'
- `submitted_at` (TIMESTAMP)
- `reviewed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE(employee_id, financial_year)

#### 14. **income_tax_declaration_items** (Deduction Items)
- `id` (UUID)
- `declaration_id` (UUID) - FK
- `section_code` (TEXT) - '80C' | 'HRA' | 'HOME_LOAN_INTEREST' | 'STANDARD_DEDUCTION' | 'OTHER'
- `item_label` (TEXT)
- `declared_amount` (NUMERIC)
- `approved_amount` (NUMERIC)
- `status` (TEXT) - 'pending' | 'approved' | 'rejected'
- `hr_comment` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 15. **income_tax_declaration_proofs** (Supporting Documents)
- `id` (UUID)
- `item_id` (UUID) - FK
- `file_path` (TEXT)
- `file_name` (TEXT)
- `file_size` (BIGINT)
- `uploaded_by` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 16. **salary_revisions** (Salary Adjustment Workflow)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `effective_date` (DATE)
- `proposed_basic_salary` (NUMERIC)
- `proposed_hra` (NUMERIC)
- `proposed_allowances` (NUMERIC)
- `proposed_total_ctc` (NUMERIC)
- `status` (TEXT) - 'pending' | 'approved' | 'rejected'
- `initiated_by` (UUID) - FK
- `approved_by` (UUID) - FK
- `approver_comment` (TEXT)
- `initiated_at` (TIMESTAMP)
- `approved_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- INDEX: (employee_id, effective_date DESC, created_at DESC)

#### 17. **leave_encashment_policy** (Encashment Rules)
- `id` (UUID)
- `encashable_leave_types` (TEXT[]) - Array of leave types
- `max_days_per_year` (INT) - Default: 10
- `payout_formula` (TEXT) - 'BASIC_PER_DAY'
- `updated_by` (UUID)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 18. **leave_encashment_requests** (Leave Payout Requests)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `leave_type` (TEXT)
- `days_requested` (INT)
- `encashment_amount` (NUMERIC)
- `request_year` (INT)
- `status` (TEXT) - 'Pending' | 'Approved' | 'Rejected'
- `reviewer_id` (UUID)
- `reviewer_comment` (TEXT)
- `reviewed_at` (TIMESTAMP)
- `reimbursed_payroll_id` (UUID) - FK
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- INDEX: (employee_id, request_year)

#### 19. **expense_claims** (Reimbursement Requests)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `category` (TEXT) - 'Travel' | 'Food' | 'Equipment' | 'Other'
- `amount` (NUMERIC)
- `expense_date` (DATE)
- `description` (TEXT)
- `receipt_url` (TEXT)
- `status` (TEXT) - 'Pending' | 'Approved' | 'Rejected'
- `reviewer_id` (UUID)
- `reviewer_comment` (TEXT)
- `reviewed_at` (TIMESTAMP)
- `reimbursed_payroll_id` (UUID) - FK
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 20. **projects** (Project Management)
- `id` (UUID)
- `name` (TEXT)
- `client` (TEXT)
- `deadline` (DATE)
- `status` (TEXT) - 'Active' | 'Completed' | 'On-Hold'
- `progress` (INTEGER) - 0-100
- `description` (TEXT)
- `start_date` (DATE)
- `created_by` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 21. **project_members** (Team Assignment)
- `project_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `role` (TEXT)
- `role_in_project` (TEXT)
- `joined_at` (TIMESTAMP)
- PRIMARY KEY (project_id, employee_id)

#### 22. **tasks** (Project Tasks)
- `id` (UUID)
- `project_id` (UUID) - FK
- `title` (TEXT)
- `assignee_id` (UUID) - FK
- `status` (TEXT) - 'todo' | 'in-progress' | 'done'
- `description` (TEXT)
- `due_date` (DATE)
- `created_at` (TIMESTAMP)

#### 23. **daily_reports** (Work Logs)
- `id` (UUID)
- `project_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `work_done` (TEXT)
- `hours` (NUMERIC)
- `blockers` (TEXT)
- `date` (DATE)
- `hours_spent` (NUMERIC)
- `created_at` (TIMESTAMP)

#### 24. **offer_letters** (Recruitment)
- `id` (UUID)
- `candidate_name` (TEXT)
- `role` (TEXT)
- `department` (TEXT)
- `ctc` (NUMERIC)
- `joining_date` (DATE)
- `status` (TEXT) - 'Generated' | 'Sent' | 'Accepted' | 'Declined'
- `email` (TEXT)
- `type` (TEXT) - 'offer' | 'joining'
- `file_path` (TEXT) - PDF storage path
- `generated_by` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 25. **complaints** (Grievance Management)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `category` (TEXT)
- `description` (TEXT)
- `attachment_url` (TEXT)
- `is_anonymous` (BOOLEAN)
- `status` (TEXT) - 'Open'
- `reviewed_by` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 26. **audit_logs** (Activity Log)
- `id` (UUID)
- `user_email` (TEXT)
- `full_name` (TEXT)
- `action` (TEXT) - Operation performed
- `module` (TEXT) - Feature area
- `ip_address` (TEXT)
- `details` (TEXT) - JSON details
- `user_id` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 27. **notifications** (Alert System)
- `id` (UUID)
- `user_id` (UUID) - FK to profiles
- `title` (TEXT)
- `message` (TEXT)
- `type` (TEXT) - 'info' | 'warning' | 'error' | 'success'
- `is_read` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 28. **token_blacklist** (Logout Invalidation)
- `id` (UUID)
- `token` (TEXT UNIQUE) - JWT token
- `invalidated_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP) - Auto-cleanup time

#### 29. **password_reset_tokens** (Password Recovery)
- `id` (UUID)
- `profile_id` (UUID) - FK
- `token` (TEXT UNIQUE)
- `expires_at` (TIMESTAMP)
- `used` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 30. **announcements** (Company News)
- `id` (UUID)
- `title` (TEXT)
- `content` (TEXT)
- `author_id` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 31. **chat_groups** (Team Chat)
- `id` (UUID)
- `name` (TEXT)
- `created_by` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 32. **chat_group_members** (Group Membership)
- `group_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `joined_at` (TIMESTAMP)
- PRIMARY KEY (group_id, employee_id)

#### 33. **messages** (Chat Messages)
- `id` (UUID)
- `sender_id` (UUID) - FK
- `receiver_id` (UUID) - FK (for 1-1 chat)
- `group_id` (UUID) - FK (for group chat)
- `content` (TEXT)
- `attachment_url` (TEXT)
- `is_read` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 34. **meetings** (Video Conference)
- `id` (UUID)
- `title` (TEXT)
- `agenda` (TEXT)
- `date_time` (TIMESTAMP)
- `duration` (INTEGER) - minutes
- `room_url` (TEXT)
- `created_by` (UUID) - FK
- `scheduled_at` (TIMESTAMP)
- `meeting_link` (TEXT)
- `status` (TEXT) - 'active' | 'scheduled'
- `meeting_type` (TEXT) - 'scheduled'
- `created_at` (TIMESTAMP)

#### 35. **meeting_participants** (Meeting Attendees)
- `meeting_id` (UUID) - FK
- `employee_id` (UUID) - FK
- PRIMARY KEY (meeting_id, employee_id)

#### 36. **folders** (Cloud Drive)
- `id` (UUID)
- `name` (TEXT)
- `parent_id` (UUID) - FK (self-reference)
- `owner_id` (UUID) - FK
- `is_company` (BOOLEAN)
- `is_hr_only` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 37. **files** (Cloud Files)
- `id` (UUID)
- `name` (TEXT)
- `folder_id` (UUID) - FK
- `owner_id` (UUID) - FK
- `size` (BIGINT)
- `mime_type` (TEXT)
- `storage_path` (TEXT)
- `is_shared` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 38. **file_shares** (File Permission)
- `file_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `shared_by` (UUID) - FK
- `shared_at` (TIMESTAMP)
- PRIMARY KEY (file_id, employee_id)

#### 39. **assets** (Equipment Management)
- `id` (UUID)
- `name` (TEXT)
- `asset_type` (TEXT) - 'Laptop' | 'Phone' | 'Monitor' | 'Access Card' | 'Other'
- `serial_number` (TEXT UNIQUE)
- `purchase_date` (DATE)
- `asset_value` (NUMERIC)
- `status` (TEXT) - 'available' | 'assigned' | 'damaged' | 'retired'
- `created_by` (UUID) - FK
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 40. **asset_assignments** (Asset Allocation)
- `id` (UUID)
- `asset_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `assigned_date` (DATE)
- `return_date` (DATE)
- `condition_notes` (TEXT)
- `assigned_by` (UUID) - FK
- `returned_by` (UUID) - FK
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE INDEX: (asset_id) WHERE return_date IS NULL

#### 41. **appraisal_cycles** (Performance Reviews)
- `id` (UUID)
- `name` (TEXT)
- `start_date` (DATE)
- `end_date` (DATE)
- `status` (TEXT) - 'draft' | 'active' | 'closed'
- `created_by` (UUID)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 42. **goals** (Appraisal Goals)
- `id` (UUID)
- `cycle_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `title` (TEXT)
- `description` (TEXT)
- `target` (TEXT)
- `progress` (INTEGER) - 0-100
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 43. **self_appraisals** (Employee Self-Review)
- `id` (UUID)
- `cycle_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `overall_comment` (TEXT)
- `submitted_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- UNIQUE(cycle_id, employee_id)

#### 44. **self_appraisal_items** (Goal Ratings)
- `id` (UUID)
- `self_appraisal_id` (UUID) - FK
- `goal_id` (UUID) - FK
- `rating` (INTEGER) - 1-5
- `comment` (TEXT)
- `created_at` (TIMESTAMP)

#### 45. **manager_appraisals** (Manager Feedback)
- `id` (UUID)
- `cycle_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `manager_id` (UUID) - FK
- `feedback` (TEXT)
- `submitted_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- UNIQUE(cycle_id, employee_id, manager_id)

#### 46. **manager_appraisal_items** (Manager Ratings)
- `id` (UUID)
- `manager_appraisal_id` (UUID) - FK
- `goal_id` (UUID) - FK
- `rating` (INTEGER) - 1-5
- `comment` (TEXT)
- `created_at` (TIMESTAMP)

#### 47. **peer_feedback** (360 Reviews)
- `id` (UUID)
- `cycle_id` (UUID) - FK
- `employee_id` (UUID) - FK
- `reviewer_id` (UUID) - FK
- `rating` (INTEGER) - 1-5
- `comment` (TEXT)
- `is_anonymous` (BOOLEAN)
- `created_at` (TIMESTAMP)
- UNIQUE(cycle_id, employee_id, reviewer_id)

#### 48. **onboarding_templates** (Checklist Templates)
- `id` (UUID)
- `name` (TEXT)
- `description` (TEXT)
- `created_by` (UUID)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 49. **onboarding_template_tasks** (Template Items)
- `id` (UUID)
- `template_id` (UUID) - FK
- `title` (TEXT)
- `description` (TEXT)
- `requires_document` (BOOLEAN)
- `sort_order` (INTEGER)
- `created_at` (TIMESTAMP)

#### 50. **onboarding_cases** (Employee Onboarding)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `template_id` (UUID) - FK
- `status` (TEXT) - 'active' | 'completed'
- `assigned_by` (UUID)
- `started_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE INDEX: (employee_id) WHERE status = 'active'

#### 51. **onboarding_case_tasks** (Onboarding Checklist)
- `id` (UUID)
- `case_id` (UUID) - FK
- `template_task_id` (UUID) - FK
- `title` (TEXT)
- `description` (TEXT)
- `requires_document` (BOOLEAN)
- `is_completed` (BOOLEAN)
- `completed_at` (TIMESTAMP)
- `completed_by` (UUID)
- `document_url` (TEXT)
- `sort_order` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 52. **offboarding_cases** (Employee Exit)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `last_working_date` (DATE)
- `reason` (TEXT) - 'resignation' | 'termination' | 'contract_end'
- `reason_details` (TEXT)
- `status` (TEXT) - 'in_progress' | 'completed' | 'cancelled'
- `started_by` (UUID)
- `finalized_by` (UUID)
- `finalized_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE INDEX: (employee_id) WHERE status = 'in_progress'

#### 53. **offboarding_checklist_items** (Exit Checklist)
- `id` (UUID)
- `case_id` (UUID) - FK
- `task_code` (TEXT)
- `task_title` (TEXT)
- `assigned_role` (TEXT) - 'IT' | 'Finance' | 'HR'
- `assigned_to` (UUID)
- `is_cleared` (BOOLEAN)
- `cleared_by` (UUID)
- `cleared_at` (TIMESTAMP)
- `notes` (TEXT)
- `sort_order` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE(case_id, task_code)

#### 54. **offboarding_exit_interviews** (Exit Feedback)
- `id` (UUID)
- `case_id` (UUID UNIQUE) - FK
- `employee_id` (UUID) - FK
- `reason_for_leaving` (TEXT)
- `experience_rating` (INTEGER) - 1-5
- `feedback` (TEXT)
- `submitted_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 55. **helpdesk_tickets** (Support Tickets)
- `id` (UUID)
- `employee_id` (UUID) - FK
- `category` (TEXT) - 'IT Issue' | 'Payroll Query' | 'Leave Issue' | 'General HR' | 'Grievance'
- `subject` (TEXT)
- `description` (TEXT)
- `priority` (TEXT) - 'low' | 'medium' | 'high'
- `status` (TEXT) - 'open' | 'in_progress' | 'resolved' | 'closed'
- `assigned_to` (UUID)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `resolved_at` (TIMESTAMP)
- `closed_at` (TIMESTAMP)

#### 56. **helpdesk_comments** (Ticket Updates)
- `id` (UUID)
- `ticket_id` (UUID) - FK
- `user_id` (UUID) - FK
- `comment_text` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 57. **helpdesk_attachments** (Ticket Files)
- `id` (UUID)
- `ticket_id` (UUID) - FK
- `file_path` (TEXT)
- `file_name` (TEXT)
- `file_size` (BIGINT)
- `created_at` (TIMESTAMP)

#### 58. **documents** (Document Management)
- `id` (UUID)
- `name` (TEXT)
- `type` (TEXT)
- `file_url` (TEXT)
- `employee_id` (UUID) - FK
- `status` (TEXT) - 'Pending'
- `uploaded_by` (UUID)
- `file_path` (TEXT)
- `created_at` (TIMESTAMP)

#### 59. **surveys** (Employee Surveys)
- `id` (UUID)
- `title` (TEXT)
- `description` (TEXT)
- `status` (TEXT) - 'draft' | 'published' | 'closed'
- `created_by` (UUID) - FK
- `created_at` (TIMESTAMP)

#### 60. **survey_responses** (Survey Answers)
- `id` (UUID)
- `survey_id` (UUID) - FK
- `respondent_id` (UUID) - FK
- `submitted_at` (TIMESTAMP)

---

## API ROUTES & ENDPOINTS

### Authentication Routes
**Base URL:** `/api/auth`

| Method | Endpoint | Role | Purpose | Headers |
|--------|----------|------|---------|---------|
| POST | `/signup` | Public | Account creation (disabled) | - |
| POST | `/login` | Public | User authentication | `Content-Type: application/json` |
| POST | `/logout` | Authenticated | Invalidate JWT token | `Authorization: Bearer {token}` |
| POST | `/change-password` | Authenticated | Update password | `Authorization: Bearer {token}` |
| POST | `/forgot-password` | Public | Request password reset | `Content-Type: application/json` |
| POST | `/reset-password` | Public | Reset with token | `Content-Type: application/json` |
| GET | `/me` | Authenticated | Current user profile | `Authorization: Bearer {token}` |

**Login Request Body:**
```json
{
  "email": "user@indusinnovate.com",
  "password": "securePassword123"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@indusinnovate.com",
    "role": "hr|employee",
    "full_name": "Name",
    "employee_id": "EMP001",
    "employee_uuid": "uuid",
    "is_first_login": true,
    "status": "active"
  }
}
```

### Employee Management Routes
**Base URL:** `/api/employees`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| GET | `/dashboard-stats` | Any | Dashboard metrics | No |
| GET | `/` | Any | List all employees | No |
| GET | `/:id` | Any | Get single employee | No |
| POST | `/` | HR | Create new employee | Yes (avatar) |
| PATCH | `/:id` | HR | Update employee | Yes (avatar) |
| DELETE | `/:id` | HR | Soft-delete employee | No |

**Create Employee Payload:**
```
Form Data:
- full_name (text)
- email (text, unique)
- role (text)
- department (text)
- phone (text)
- joining_date (date)
- salary (decimal)
- avatar (file, image only, max 5MB)
```

### Leave Management Routes
**Base URL:** `/api/leaves`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| GET | `/` | Any | Get leaves (filtered by role) | No |
| POST | `/` | Employee | Request leave | Yes (attachment) |
| PATCH | `/:id` | HR | Approve/reject leave | No |

**Create Leave Payload:**
```
Form Data:
- leave_type (text): 'Sick', 'Casual', 'Earned', 'Comp-Off'
- start_date (date)
- end_date (date)
- days (number)
- reason (text)
- attachment (file, optional)
```

### Payroll Routes
**Base URL:** `/api/payroll`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/` | Any | Get payroll records |
| GET | `/attendance-metrics` | HR | Attendance summary |
| GET | `/statutory-settings` | HR | Tax configuration |
| PUT | `/statutory-settings` | HR | Update tax rates |
| GET | `/compliance-report` | HR | Monthly compliance |
| POST | `/` | HR | Generate payroll |
| POST | `/:id/send` | HR | Send payslip to employee |

**Query Parameters for Compliance Report:**
```
- month (string): 'January' - 'December'
- year (number): 2026
```

### Leave Encashment Routes
**Base URL:** `/api/leave-encashment`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/my/balance` | Employee | Get encashment balance |
| POST | `/my/request` | Employee | Request encashment |
| GET | `/hr/requests` | HR | All encashment requests |
| PATCH | `/:id` | HR | Approve/reject request |

### Income Tax Routes
**Base URL:** `/api/income-tax`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| GET | `/my` | Employee | My tax declaration | No |
| PUT | `/my` | Employee | Save declaration | No |
| POST | `/my/submit` | Employee | Submit for review | No |
| POST | `/my/items/:itemId/proofs` | Employee | Upload proof | Yes |
| GET | `/my/form16` | Employee | Download Form 16 | No |
| GET | `/hr/declarations` | HR | All declarations | No |
| GET | `/hr/declarations/:id` | HR | Declaration details | No |
| PATCH | `/hr/items/:itemId/review` | HR | Review & approve | No |
| GET | `/hr/form16/:employeeId` | HR | Generate Form 16 | No |

### Salary Revision Routes
**Base URL:** `/api/salary-revisions`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/my` | Employee | My salary history |
| POST | `/` | HR | Initiate revision |
| PATCH | `/:id` | HR | Approve revision |

### Expense Claims Routes
**Base URL:** `/api/expenses`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| POST | `/submit` | Employee | Submit expense | Yes (receipt) |
| GET | `/my` | Employee | My claims | No |
| GET | `/` | HR | All claims | No |
| PATCH | `/:id` | HR | Approve claim | No |

**Allowed Receipt Types:** JPG, PNG, WEBP, PDF (max 5MB)

### Attendance Routes
**Base URL:** `/api/attendance`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/` | Any | Get attendance records |
| GET | `/monthly-summary` | Any | Monthly attendance |
| POST | `/check-in` | Employee | Record check-in |
| POST | `/:id/check-out` | Employee | Record check-out |

### Shift Management Routes
**Base URL:** `/api/shifts`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/` | Any | List all shifts |
| POST | `/` | HR | Create shift |
| PATCH | `/:id` | HR | Update shift |
| DELETE | `/:id` | HR | Delete shift |
| POST | `/assign` | HR | Assign to employee |

### Performance Routes
**Base URL:** `/api/performance`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/cycles` | Any | Appraisal cycles |
| POST | `/cycles` | HR | Create cycle |
| GET | `/goals` | Any | Goals list |
| POST | `/appraisals` | Employee | Self-appraisal |
| GET | `/appraisals/:cycleId` | Any | Cycle feedback |
| PATCH | `/appraisals/:id` | Any | Update appraisal |

### Onboarding Routes
**Base URL:** `/api/onboarding`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| GET | `/templates` | HR | Template list | No |
| POST | `/templates` | HR | Create template | No |
| POST | `/cases` | HR | Assign onboarding | No |
| GET | `/my/case` | Employee | My checklist | No |
| PATCH | `/my/tasks/:id` | Employee | Complete task | Yes (document) |

### Offboarding Routes
**Base URL:** `/api/offboarding`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/` | HR | Initiate exit |
| GET | `/` | HR | Exit cases |
| GET | `/my` | Employee | Exit interview |
| POST | `/my/interview` | Employee | Submit feedback |
| PATCH | `/:id/checklist` | HR | Mark item cleared |

### Helpdesk Routes
**Base URL:** `/api/helpdesk`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| POST | `/` | Employee | Create ticket | No |
| GET | `/my/tickets` | Employee | My tickets | No |
| GET | `/hr/all` | HR | All tickets | No |
| GET | `/hr/dashboard` | HR | Dashboard stats | No |
| PATCH | `/:ticketId/assign` | HR | Assign ticket | No |
| PATCH | `/:ticketId/status` | HR | Update status | No |
| POST | `/:ticketId/comments` | Any | Add comment | No |
| POST | `/:ticketId/attachments` | Any | Upload file | Yes |
| GET | `/attachments/:id/download` | Any | Download file | No |

**Allowed Attachments:** PDF, JPG, PNG, WEBP (max 10MB)

### Asset Management Routes
**Base URL:** `/api/assets`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/my` | Employee | My assigned assets |
| GET | `/` | HR | All assets inventory |
| POST | `/` | HR | Create asset |
| POST | `/:id/assign` | HR | Assign to employee |
| POST | `/:id/return` | HR | Mark returned |

### Chat Routes
**Base URL:** `/api/chat`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| GET | `/contacts` | Any | Contacts list | No |
| GET | `/groups` | Any | Chat groups | No |
| GET | `/groups/:groupId/members` | Any | Group members | No |
| POST | `/create-group` | Any | Create group | No |
| POST | `/add-members` | Any | Add members | No |
| POST | `/leave-group` | Any | Leave group | No |
| GET | `/history/:targetId` | Any | Chat history | No |
| DELETE | `/history/:targetId` | Any | Clear history | No |
| POST | `/message` | Any | Send message | No |
| POST | `/upload` | Any | Upload file | Yes |

### Drive (Cloud Storage) Routes
**Base URL:** `/api/drive`

| Method | Endpoint | Role | Purpose | Multipart |
|--------|----------|------|---------|-----------|
| GET | `/contents` | Any | List drive contents | No |
| POST | `/upload` | Any | Upload file | Yes |
| POST | `/folder` | Any | Create folder | No |
| DELETE | `/files/:id` | Any | Delete file | No |
| GET | `/download/:id` | Any | Download file | No |

### Meetings Routes
**Base URL:** `/api/meetings`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/` | Any | Create meeting |
| GET | `/` | Any | List meetings |
| GET | `/:id` | Any | Meeting details |
| PUT | `/:id/end` | Any | End meeting |
| POST | `/:id/add-participant` | Any | Add participant |

### Notifications Routes
**Base URL:** `/api/notifications`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/` | Authenticated | Get notifications |
| PATCH | `/read` | Authenticated | Mark all read |
| PATCH | `/:id/read` | Authenticated | Mark one read |

### User Profile Routes
**Base URL:** `/api/user`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/me` | Authenticated | Current profile |
| PUT | `/me` | Authenticated | Update profile |
| GET | `/:id` | Any | Any user profile |

### Asset Management Routes
**Base URL:** `/api/assets`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/my` | Employee | My assets |
| GET | `/` | HR | All assets |
| POST | `/` | HR | Create asset |
| POST | `/:id/assign` | HR | Assign asset |
| POST | `/:id/return` | HR | Return asset |

### Departments Routes
**Base URL:** `/api/departments`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/` | Any | List departments |
| POST | `/` | HR | Create department |
| PUT | `/:id` | HR | Update department |

### Surveys Routes
**Base URL:** `/api/surveys`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/` | Any | List surveys |
| POST | `/` | HR | Create survey |
| POST | `/:id/publish` | HR | Publish survey |
| POST | `/:id/respond` | Employee | Submit response |
| GET | `/:id/results` | HR | View results |

### Analytics & Audit Routes
**Base URL:** `/api/analytics` & `/api/audit`

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/analytics` | HR | Dashboard metrics |
| GET | `/audit` | HR | Activity logs |

---

## AUTHENTICATION & SECURITY

### JWT Flow

**Token Structure:**
```javascript
{
  "id": "profile_uuid",
  "role": "hr|employee",
  "email": "user@indusinnovate.com",
  "name": "Full Name",
  "employee_id": "EMP001",
  "employee_uuid": "employee_uuid",
  "iat": 1234567890,
  "exp": 1234571490  // 8 hours from issuance
}
```

**Configuration (from authController.js):**
- **JWT_SECRET:** Environment variable (required)
- **JWT_EXPIRES_IN:** Default `'8h'` (can be overridden)
- **Algorithm:** HS256

### Token Storage (Client-side)
- Tokens stored in **localStorage** under key `'auth_token'`
- Retrieved on app load via `AuthContext.jsx`
- Automatically appended as `Authorization: Bearer {token}` header

### Token Blacklisting (Logout)
**Mechanism:**
- On logout, token added to `token_blacklist` table
- Blacklist checked in `auth.js` middleware on each request
- Blacklist entry expires when token naturally expires
- Automatic cleanup via application logic

**Database Query:**
```javascript
const blacklisted = await pool.query(
    'SELECT id FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
    [token]
);
if (blacklisted.rows.length > 0) {
    return res.status(401).json({ error: 'Token has been invalidated' });
}
```

### Account Lockout Policy
- **Max Failed Attempts:** 5 consecutive incorrect password entries
- **Lockout Duration:** 30 minutes (`30 * 60 * 1000` ms)
- **Reset:** Automatic unlock after 30 minutes OR by HR manually
- **Fields Updated:**
  - `locked_at` → TIMESTAMP
  - `failed_login_attempts` → Counter

**Lockout Prevention Endpoints:**
- `/api/auth/change-password` - First-login password change (no current pwd required)
- `/api/auth/forgot-password` - Password reset flow
- `/api/auth/reset-password` - Token-based reset

### First-Login Flag
- **Use Case:** Force password change on first login
- **Field:** `profiles.is_first_login` (BOOLEAN, default TRUE)
- **Flow:**
  1. Admin creates employee account with temporary password
  2. Employee logs in - token includes `is_first_login: true`
  3. Frontend redirects to password change page
  4. After change, flag set to FALSE via `UPDATE profiles SET is_first_login = FALSE`

### Role-Based Authorization
**Middleware:** `authorize(roles = [])`

**Roles:**
- `'hr'` - Full admin access
- `'employee'` - Limited self-service access

**Usage in Routes:**
```javascript
router.post('/:id', auth, authorize(['hr']), controllerMethod);
```

### Password Security
- **Hashing:** bcryptjs with 10 salt rounds
- **Minimum Length:** 8 characters
- **Validation:**
  - `bcrypt.genSalt(10)` - Generate salt
  - `bcrypt.hash(password, salt)` - Hash password
  - `bcrypt.compare(input, hash)` - Verify password

### CORS Configuration
```javascript
cors({
    origin: "*",  // Allow all origins in dev
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
})
```

---

## REAL-TIME FEATURES

### Socket.IO Events

**Server Configuration (server/index.js):**
```javascript
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
```

**Port:** 5001 (shared with HTTP server)

### Socket Events Reference

#### Connection Management
| Event | From | To | Payload |
|-------|------|-----|---------|
| `identify` | Client | Server | `{ userId: string }` |
| `user_online` | Server | All | `userId: string` |
| `join_room` | Client | Server | `{ roomId: string, userId: string, name?: string }` |
| `user_joined` | Server | Room | `{ userId: string, socketId: string, name: string }` |
| `leave_room` | Client | Server | `{ roomId: string, userId?: string }` |
| `user_left` | Server | Room | `userId: string` |

#### Messaging
| Event | From | To | Payload |
|-------|------|-----|---------|
| `send_message` | Client | Server | `{ roomId: string, content: string, sender: object }` |
| `receive_message` | Server | Room | Same as send |
| `send_meeting_chat` | Client | Server | `{ roomId: string, content: string }` |
| `receive_meeting_chat` | Server | Room | Same as send |

#### Voice/Video Calls
| Event | From | To | Payload |
|-------|------|-----|---------|
| `call_user` | Client | Server | `{ from: string, to: string, offer: WebRTC, type: 'voice'\|'video', caller_name: string }` |
| `incoming_call` | Server | Recipient | Same structure |
| `answer_call` | Client | Server | `{ from: string, to: string, answer: WebRTC }` |
| `call_answered` | Server | Caller | `{ answer: WebRTC, from: string }` |

### WebRTC Implementation
- **Signaling:** Socket.IO for WebRTC offer/answer exchange
- **ICE Candidates:** Handled via Socket.IO
- **Room-based:** Each meeting = unique room ID (format: `meeting_uuid`)

### Real-time Chat Architecture
**Components Using Socket.IO:**
- [src/pages/ChatPage.jsx](src/pages/ChatPage.jsx) - Group & 1-1 chat
- [src/pages/MeetingRoomPage.jsx](src/pages/MeetingRoomPage.jsx) - Meeting chat & WebRTC
- Notifications pushed to all connected clients

**Data Binding:**
- Socket events → React state updates
- No polling required for chat messages
- Meeting join automatically broadcasts user presence

---

## FILE UPLOAD MANAGEMENT

### Upload Directories Structure
```
server/uploads/
├── avatars/          - Employee profile pictures
├── leaves/           - Leave attachment documents
├── expenses/         - Receipt images/PDFs
├── tax-declarations/ - ITR supporting documents
├── onboarding/       - Onboarding checklist docs
├── helpdesk/         - Support ticket attachments
├── chat/             - Chat file uploads
└── drive/            - Cloud drive files
```

### File Upload Routes & Configuration

#### 1. **Employee Avatar Upload**
**Route:** `PATCH /api/employees/:id`  
**Multer Config:**
```javascript
{
    storage: diskStorage({ destination: 'uploads/avatars' }),
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
    }
}
```
**File Access:** `/uploads/avatars/{filename}`

#### 2. **Leave Attachment**
**Route:** `POST /api/leaves`  
**Max Size:** Configurable (default: no limit specified)  
**Storage:** `uploads/leaves/`  
**File Access:** `/uploads/leaves/{filename}`

#### 3. **Expense Receipt Upload**
**Route:** `POST /api/expenses/submit`  
**Multer Config:**
```javascript
{
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
    fileFilter: (_, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) 
            return cb(new Error('Only JPG, PNG, WEBP, and PDF allowed'));
    }
}
```
**Storage:** `uploads/expenses/`

#### 4. **Tax Declaration Proof Upload**
**Route:** `POST /api/income-tax/my/items/:itemId/proofs`  
**Multer Config:**
```javascript
{
    limits: { fileSize: 8 * 1024 * 1024 },  // 8MB
    destination: 'uploads/tax-declarations/'
}
```
**File Path Pattern:** `/uploads/tax-declarations/tax-proof-{timestamp}-{random}.{ext}`

#### 5. **Onboarding Document**
**Route:** `PATCH /api/onboarding/my/tasks/:id`  
**Multer Config:** `diskStorage` to `uploads/onboarding/`  
**File Access:** `/uploads/onboarding/{filename}`

#### 6. **Helpdesk Ticket Attachment**
**Route:** `POST /api/helpdesk/:ticketId/attachments`  
**Multer Config:**
```javascript
{
    limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
    destination: 'uploads/helpdesk/'
}
```
**Database:** Stored in `helpdesk_attachments` table with path & metadata

#### 7. **Chat File Upload**
**Route:** `POST /api/chat/upload`  
**Storage:** `uploads/chat/`  
**Response:** `{ url: '/uploads/chat/{filename}' }`

#### 8. **Drive File Upload**
**Route:** `POST /api/drive/upload`  
**Multer Config:** `diskStorage` to `uploads/drive/`  
**Database:** Stored in `files` table with `storage_path`

### File Serving (Static Routes)
**Express Configuration (server/index.js):**
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

**Vite Dev Proxy (vite.config.js):**
```javascript
server: {
    proxy: {
        '/uploads': {
            target: 'http://localhost:5001',
            changeOrigin: true
        }
    }
}
```

### File Download Endpoints
- **Helpdesk Attachments:** `GET /api/helpdesk/attachments/:id/download`
- **Drive Files:** `GET /api/drive/download/:id`
- **Direct URL:** Accessible via `/uploads/{path}`

### Security Considerations
- File type validation via MIME type checking
- File size limits per endpoint (5-10MB)
- Uploaded files stored outside web root initially
- Access control via API endpoints (authentication required)

---

## PDF GENERATION FEATURES

### React PDF Library
**Package:** @react-pdf/renderer ^4.3.2

### PDF Generation Components

#### 1. **Form 16 (Tax Certificate)**
**Component:** [src/components/Payroll/Form16SummaryPDF.jsx](src/components/Payroll/Form16SummaryPDF.jsx)

**Used By:**
- [src/pages/HRForm16Page.jsx](src/pages/HRForm16Page.jsx) - HR Download
- [src/pages/EmployeeForm16Page.jsx](src/pages/EmployeeForm16Page.jsx) - Employee Download

**Features:**
- Employee details & PAN
- Income summary (gross, deductions, tax)
- Professional styling

**Download Link:**
```jsx
<PDFDownloadLink 
    document={<Form16SummaryPDF data={summaryData} />}
    fileName={`Form16_${employee_name}_${financial_year}.pdf`}
>
    {({ blob, url, loading, error }) => (
        loading ? 'Generating...' : 'Download PDF'
    )}
</PDFDownloadLink>
```

#### 2. **Statutory Compliance Report**
**Component:** [src/components/Payroll/StatutoryCompliancePDF.jsx](src/components/Payroll/StatutoryCompliancePDF.jsx)

**Used By:** [src/pages/HRStatutoryCompliancePage.jsx](src/pages/HRStatutoryCompliancePage.jsx)

**Contents:**
- PF employee/employer contributions
- ESI calculations
- TDS breakdown
- Monthly summary table

**Query Parameter:** `/api/payroll/compliance-report?month=March&year=2026`

#### 3. **Reimbursement Summary**
**Component:** [src/components/Payroll/ReimbursementSummaryPDF.jsx](src/components/Payroll/ReimbursementSummaryPDF.jsx)

**Used By:** [src/pages/HRReimbursementSummaryPage.jsx](src/pages/HRReimbursementSummaryPage.jsx)

**Data:**
- Approved expense claims
- Leave encashment payouts
- Aggregated by employee & category

#### 4. **Relieving Letter (Offboarding)**
**Component:** Inline JSX in [src/pages/HROffboardingPage.jsx](src/pages/HROffboardingPage.jsx)

**Template:**
```jsx
<Document>
    <Page>
        <Text>RELIEVING LETTER</Text>
        <Text>{employee_name}</Text>
        <Text>Last Working Date: {last_working_date}</Text>
    </Page>
</Document>
```

**File Name:** `relieving_letter_{employee_name}.pdf`

### PDF Styling Pattern
```jsx
const styles = StyleSheet.create({
    page: { padding: 20 },
    title: { fontSize: 18, marginBottom: 10 },
    section: { marginBottom: 10 },
    row: { display: 'flex', flexDirection: 'row' },
    cell: { flex: 1 }
});
```

### Image Export (html-to-image)
**Package:** html-to-image ^1.11.13

**Usage:** Not yet implemented in codebase but available for future ID card exports

---

## FRONTEND PAGES & ROUTES

### Route Structure (src/App.jsx)

#### HR Portal Routes

**Dashboard & Core:**
- `/hr/dashboard` → [HRDashboard.jsx](src/pages/HRDashboard.jsx) - Overview metrics
- `/hr/profile/:id` → [EmployeeProfilePage.jsx](src/pages/EmployeeProfilePage.jsx) - Employee details

**Employee Management:**
- `/hr/employees` → [EmployeesPage.jsx](src/pages/EmployeesPage.jsx) - Employee directory with CRUD
- `/hr/org-chart` → [HROrgChartPage.jsx](src/pages/HROrgChartPage.jsx) - Organizational structure
- `/hr/departments` → [HRDepartmentsPage.jsx](src/pages/HRDepartmentsPage.jsx) - Department management

**Attendance:**
- `/hr/attendance` → [HRAttendancePage.jsx](src/pages/HRAttendancePage.jsx) - Attendance tracking

**Leave Management:**
- `/hr/leaves` → [HRLeavesPage.jsx](src/pages/HRLeavesPage.jsx) - Leave approval
- `/hr/shift-management` → [HRShiftManagementPage.jsx](src/pages/HRShiftManagementPage.jsx) - Shift assignment

**Payroll & Tax:**
- `/hr/payroll` → [HRPayrollPage.jsx](src/pages/HRPayrollPage.jsx) - Payroll generation
- `/hr/payroll/employee/:id` → [HRPayrollEmployeePage.jsx](src/pages/HRPayrollEmployeePage.jsx) - Employee payslip
- `/hr/payroll/leave-encashment` → [HRLeaveEncashmentPage.jsx](src/pages/HRLeaveEncashmentPage.jsx) - Encashment approval
- `/hr/payroll/salary-revisions` → [HRSalaryRevisionsPage.jsx](src/pages/HRSalaryRevisionsPage.jsx) - Salary adjustments
- `/hr/payroll/statutory-settings` → [HRStatutorySettingsPage.jsx](src/pages/HRStatutorySettingsPage.jsx) - Tax configuration
- `/hr/payroll/statutory-compliance` → [HRStatutoryCompliancePage.jsx](src/pages/HRStatutoryCompliancePage.jsx) - Compliance report
- `/hr/tax-declarations` → [HRTaxDeclarationPage.jsx](src/pages/HRTaxDeclarationPage.jsx) - Tax declaration review
- `/hr/form16` → [HRForm16Page.jsx](src/pages/HRForm16Page.jsx) - Form 16 generation
- `/hr/reimbursement-summary` → [HRReimbursementSummaryPage.jsx](src/pages/HRReimbursementSummaryPage.jsx) - Expense summary
- `/hr/expense-approvals` → [HRExpenseApprovalsPage.jsx](src/pages/HRExpenseApprovalsPage.jsx) - Expense claim approval

**Performance & Training:**
- `/hr/performance` → [HRPerformancePage.jsx](src/pages/HRPerformancePage.jsx) - Appraisal cycles
- `/hr/surveys` → [HRSurveysPage.jsx](src/pages/HRSurveysPage.jsx) - Survey management
- `/hr/survey-create` → [HRSurveyCreatePage.jsx](src/pages/HRSurveyCreatePage.jsx) - Survey creation
- `/hr/survey-results/:id` → [HRSurveyResultsPage.jsx](src/pages/HRSurveyResultsPage.jsx) - Results analysis

**Onboarding & Offboarding:**
- `/hr/onboarding` → [HROnboardingPage.jsx](src/pages/HROnboardingPage.jsx) - Onboarding templates & cases
- `/hr/offboarding` → [HROffboardingPage.jsx](src/pages/HROffboardingPage.jsx) - Exit management

**Support & Governance:**
- `/hr/helpdesk` → [HRHelpDeskPage.jsx](src/pages/HRHelpDeskPage.jsx) - Support tickets
- `/hr/assets` → [HRAssetsPage.jsx](src/pages/HRAssetsPage.jsx) - Equipment inventory
- `/hr/complaints` → [HRComplaintsPage.jsx](src/pages/HRComplaintsPage.jsx) - Grievances
- `/hr/audit-logs` → [HRAuditLogsPage.jsx](src/pages/HRAuditLogsPage.jsx) - Activity logs
- `/hr/analytics` → [HRAnalyticsPage.jsx](src/pages/HRAnalyticsPage.jsx) - Dashboard analytics
- `/hr/projects` → [HRProjectsPage.jsx](src/pages/HRProjectsPage.jsx) - Project management

#### Employee Portal Routes

**Self-Service:**
- `/employee/dashboard` → [EmployeeDashboard.jsx](src/pages/EmployeeDashboard.jsx) - Personal dashboard
- `/employee/profile` → [ProfilePage.jsx](src/pages/ProfilePage.jsx) - My profile
- `/employee/settings` → [SettingsPage.jsx](src/pages/SettingsPage.jsx) - Account settings

**Attendance & Leave:**
- `/employee/attendance` → [EmployeeAttendancePage.jsx](src/pages/EmployeeAttendancePage.jsx) - Attendance view
- `/employee/apply-leave` → [ApplyLeavePage.jsx](src/pages/ApplyLeavePage.jsx) - Leave request form

**Payroll & Finance:**
- `/employee/payslips` → [EmployeePayslipsPage.jsx](src/pages/EmployeePayslipsPage.jsx) - Payslip viewing
- `/employee/tax-declaration` → [EmployeeTaxDeclarationPage.jsx](src/pages/EmployeeTaxDeclarationPage.jsx) - Tax planning
- `/employee/form16` → [EmployeeForm16Page.jsx](src/pages/EmployeeForm16Page.jsx) - Form 16 download
- `/employee/leave-encashment` → [EmployeeLeaveEncashmentPage.jsx](src/pages/EmployeeLeaveEncashmentPage.jsx) - Encashment request
- `/employee/expenses` → [EmployeeExpensesPage.jsx](src/pages/EmployeeExpensesPage.jsx) - Expense submission
- `/employee/salary-structure` → [EmployeeSalaryStructurePage.jsx](src/pages/EmployeeSalaryStructurePage.jsx) - Salary details

**Performance:**
- `/employee/performance` → [EmployeePerformancePage.jsx](src/pages/EmployeePerformancePage.jsx) - Appraisal view
- `/employee/surveys` → [EmployeeSurveysPage.jsx](src/pages/EmployeeSurveysPage.jsx) - Survey list
- `/employee/survey/:id` → [EmployeeSurveyFillPage.jsx](src/pages/EmployeeSurveyFillPage.jsx) - Survey submission

**HR Services:**
- `/employee/onboarding` → [EmployeeOnboardingPage.jsx](src/pages/EmployeeOnboardingPage.jsx) - Checklist
- `/employee/exit-interview` → [EmployeeExitInterviewPage.jsx](src/pages/EmployeeExitInterviewPage.jsx) - Exit process
- `/employee/helpdesk` → [EmployeeHelpDeskPage.jsx](src/pages/EmployeeHelpDeskPage.jsx) - Support tickets
- `/employee/assets` → [EmployeeAssetsPage.jsx](src/pages/EmployeeAssetsPage.jsx) - Assigned equipment
- `/employee/complaints` → [EmployeeComplaintsPage.jsx](src/pages/EmployeeComplaintsPage.jsx) - Grievances
- `/employee/projects` → [EmployeeProjectsPage.jsx](src/pages/EmployeeProjectsPage.jsx) - Project assignment
- `/employee/id-card` → [EmployeeIDCardPage.jsx](src/pages/EmployeeIDCardPage.jsx) - Digital ID card

**Collaboration:**
- `/chat` → [ChatPage.jsx](src/pages/ChatPage.jsx) - Group & 1-1 chat (Socket.IO)
- `/meetings` → [MeetingsPage.jsx](src/pages/MeetingsPage.jsx) - Schedule meeting
- `/meeting-room/:roomId` → [MeetingRoomPage.jsx](src/pages/MeetingRoomPage.jsx) - Video conference (WebRTC)
- `/calendar` → [CalendarPage.jsx](src/pages/CalendarPage.jsx) - Company calendar
- `/drive` → [DrivePage.jsx](src/pages/DrivePage.jsx) - Cloud storage

#### Public Routes
- `/login` → [LoginPage.jsx](src/pages/LoginPage.jsx)
- `/forgot-password` → [ForgotPasswordPage.jsx](src/pages/ForgotPasswordPage.jsx)
- `/reset-password/:token` → [ResetPasswordPage.jsx](src/pages/ResetPasswordPage.jsx)
- `/profile/:id` → [ProfilePage.jsx](src/pages/ProfilePage.jsx) - Public profile

### Component Hierarchy
- **ProtectedRoute** ([src/components/ProtectedRoute.jsx](src/components/ProtectedRoute.jsx)) - Role-based access guard
- **HRLayout** ([src/components/HRLayout.jsx](src/components/HRLayout.jsx)) - HR sidebar + navigation
- **EmployeeLayout** ([src/components/EmployeeLayout.jsx](src/components/EmployeeLayout.jsx)) - Employee sidebar
- **Navbar** ([src/components/Navbar.jsx](src/components/Navbar.jsx)) - Top navigation with notifications

### Context & State Management
**AuthContext** ([src/context/AuthContext.jsx](src/context/AuthContext.jsx)):
- `profile` - Current user object
- `login(email, password)` - Authentication
- `logout()` - Logout & token blacklist
- `updateProfile()` - Profile refresh
- `isAuthenticated` - Boolean flag

### API Integration
**Centralized API Client** ([src/lib/api.js](src/lib/api.js)):
```javascript
const api = axios.create({
    baseURL: 'http://localhost:5001/api'
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

---

## ENVIRONMENT CONFIGURATION

### Backend Environment Variables (server/.env)

**Required Variables:**
```env
# Database Configuration
DATABASE_URL=postgres://username:password@localhost:5432/website

# Server
PORT=5001

# JWT Security
JWT_SECRET=your_super_secret_key_here_min_32_chars
JWT_EXPIRES_IN=8h

# Email Service (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@indusinnovate.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Frontend URL (for redirects)
CLIENT_URL=http://localhost:5173

# Node Environment
NODE_ENV=development
```

### Database Credentials

**Default PostgreSQL Setup:**
- **Host:** localhost
- **Port:** 5432
- **Database:** website
- **User:** postgres
- **Password:** (set during PostgreSQL installation)

**Connection String Format:**
```
postgres://postgres:YOUR_PASSWORD@localhost:5432/website
```

### Seed Data

**Seed User Accounts (optional, created via `npm run db:setup` only when env is provided):**

| Variable Group | Required Variables | Notes |
|-------|----------|------|
| HR Seed User | `SEED_HR_EMAIL`, `SEED_HR_EMPLOYEE_ID` | Password can be provided with `SEED_HR_PASSWORD` or auto-generated |
| Employee Seed User | `SEED_EMPLOYEE_EMAIL`, `SEED_EMPLOYEE_ID` | Password can be provided with `SEED_EMPLOYEE_PASSWORD` or auto-generated |

Set `SEED_DEFAULT_USERS=true` to enable seeding. Without this flag, no default users are created.

### Startup Configuration

**Frontend Development Port:** 5173 (Vite default)  
**Backend Production Port:** 5001  
**Database Port:** 5432

### Firebase Integration (If needed)
- Not currently configured in codebase
- Can be added via `.env` variables

---

## STARTUP & BUILD COMMANDS

### One-Command Setup (Recommended)

**From Project Root:**
```bash
npm run dev:all
```

**This command:**
1. Installs frontend dependencies
2. Installs backend dependencies in `server/`
3. Runs `npm run db:setup` (database migration)
4. Starts backend on port 5001
5. Starts frontend on port 5173
6. Opens browser to http://localhost:5173

### Individual Startup Commands

**Backend:**
```bash
cd server
npm install
npm run db:setup    # One-time: Create tables and seed data
npm start           # Start server (port 5001)
```

**Frontend:**
```bash
npm install         # One-time: Install dependencies
npm run dev         # Start development server (port 5173)
```

### Build Commands

**Frontend Production Build:**
```bash
npm run build       # Creates dist/ folder
npm run preview     # Serve built version locally
```

**Backend:**
- No build step required (Node.js runs directly)
- Production readiness: Ensure NODE_ENV=production

### Database Setup

**Initial Migration:**
```bash
cd server
npm run db:setup    # Executes server/db/setup.js
```

**What it does:**
1. Creates all tables from `server/db/init.sql`
2. Seeds default departments
3. Creates default users (hr@ and employee@)
4. Sets up indexes for performance
5. Initializes default statutory settings (PF, ESI, TDS slabs)

### Development Scripts

**ESLint Check:**
```bash
npm run lint        # Check code style
```

**Testing (configured but no tests written yet):**
```bash
npm test            # Would run test suite (currently echo error)
```

### File Structure for Startup

```
website/
├── server/
│   ├── .env                 ← Create this from setup
│   ├── package.json
│   ├── index.js             ← Main server entry
│   ├── db/
│   │   ├── init.sql         ← Database schema
│   │   └── setup.js         ← Migration script
│   ├── uploads/             ← Created automatically
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── services/
├── src/
│   ├── App.jsx
│   ├── main.jsx             ← React entry
│   ├── pages/
│   ├── components/
│   ├── context/
│   └── lib/
├── package.json
├── vite.config.js
└── eslint.config.js
```

### Port Requirements

Ensure these ports are available:
- **5001** - Backend Express server
- **5173** - Frontend Vite dev server
- **5432** - PostgreSQL database

### Troubleshooting Startup

**Port Already in Use:**
```bash
# Windows - Find process on port 5001
netstat -ano -p tcp | findstr :5001

# Kill process
taskkill /PID {PID} /F

# Unix/Mac
lsof -ti tcp:5001 | xargs kill -9
```

**Database Connection Failed:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Ensure database `website` exists
- Test connection: `psql -U postgres -c "SELECT version();"`

**Dependencies Not Installed:**
```bash
# Clean node_modules
rm -rf node_modules package-lock.json
npm install

cd server
rm -rf node_modules
npm install
```

### Production Deployment

**Backend:**
```bash
NODE_ENV=production npm start
```

**Frontend:**
```bash
npm run build       # Create optimized dist/
# Serve dist/ via nginx, vercel, or static host
```

**Vercel Deployment:**
- Configuration exists in [vercel.json](vercel.json)
- Frontend auto-deploys to Vercel
- Backend can be deployed to Heroku/AWS/DigitalOcean

---

## ADDITIONAL NOTES

### API Response Format
All endpoints return JSON with consistent structure:

**Success Response:**
```json
{
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "error": "Descriptive error message"
}
```

### Audit Log Details
Each action logged with:
- User email & name
- Action (Create, Update, Delete, Approve, etc.)
- Module (Payroll, Leave, Attendance, etc.)
- IP address
- Timestamp
- Additional context (JSON details field)

### Notification Types
- `info` - General information
- `warning` - Alerts requiring attention
- `error` - System errors
- `success` - Confirmation of actions

### Default Leave Configuration
- **Casual:** 12 days/year
- **Sick:** 12 days/year
- **Earned:** 15 days/year
- **Comp-Off:** 0 (given based on extra work)
- **Encashment:** Max 10 days/year (Earned only)

### Payroll Calculation
- **Monthly = (Gross Salary / 31) × Paid Days**
- **PF:** 12% employee + 12% employer
- **ESI:** 0.75% employee + 3.25% employer
- **TDS:** Applied based on income slabs
- **Tax Year:** April - March (Indian FY)

---

**End of Technical Documentation**
