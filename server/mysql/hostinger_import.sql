-- MySQL schema for the project
-- Review before importing into Hostinger phpMyAdmin.
-- Partial indexes were skipped because MySQL/MariaDB cannot import them directly in the PostgreSQL form.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `announcements` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `title` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `author_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `announcements_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `appraisal_cycles` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` TEXT DEFAULT 'draft',
    `created_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `appraisal_cycles_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `appraisal_participants` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `cycle_id` CHAR(36),
    `employee_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `appraisal_participants_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `asset_assignments` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `asset_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `assigned_date` DATE NOT NULL,
    `return_date` DATE,
    `condition_notes` TEXT,
    `assigned_by` CHAR(36),
    `returned_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `asset_assignments_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `assets` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `asset_type` TEXT NOT NULL,
    `serial_number` TEXT NOT NULL,
    `purchase_date` DATE,
    `asset_value` DECIMAL,
    `status` TEXT NOT NULL DEFAULT 'available',
    `created_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `assets_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `attendance` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36),
    `check_in` DATETIME(3) NOT NULL,
    `check_out` DATETIME(3),
    `status` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `hours_worked` DECIMAL,
    `location` TEXT,
    CONSTRAINT `attendance_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_email` TEXT NOT NULL,
    `full_name` TEXT NOT NULL,
    `action` TEXT NOT NULL,
    `module` TEXT NOT NULL,
    `ip_address` TEXT,
    `details` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `user_id` CHAR(36),
    CONSTRAINT `audit_logs_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `chat_group_members` (
    `group_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `joined_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `chat_group_members_pkey` PRIMARY KEY (`group_id`,`employee_id`)
);
CREATE TABLE `chat_groups` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `created_by` CHAR(36),
    CONSTRAINT `chat_groups_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `complaints` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36),
    `category` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `attachment_url` TEXT,
    `is_anonymous` TINYINT(1) DEFAULT false,
    `status` TEXT DEFAULT 'Open',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `reviewed_by` CHAR(36),
    `attachment` TEXT,
    CONSTRAINT `complaints_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `daily_reports` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `project_id` CHAR(36),
    `employee_id` CHAR(36),
    `work_done` TEXT NOT NULL,
    `hours` DECIMAL NOT NULL,
    `blockers` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `date` DATE DEFAULT CURRENT_DATE,
    `hours_spent` DECIMAL,
    CONSTRAINT `daily_reports_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `departments` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `description` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `departments_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `documents` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `type` TEXT,
    `file_url` TEXT NOT NULL,
    `employee_id` CHAR(36),
    `status` TEXT DEFAULT 'Pending',
    `uploaded_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `file_path` TEXT,
    CONSTRAINT `documents_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `employee_celebrations` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `celebration_type` TEXT NOT NULL,
    `celebration_date` DATE NOT NULL,
    `announcement_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `employee_celebrations_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `employee_shift_assignments` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `shift_id` CHAR(36) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE,
    `assigned_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `employee_shift_assignments_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `full_name` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `role` TEXT,
    `department` TEXT DEFAULT 'Engineering',
    `phone` TEXT,
    `joining_date` DATE,
    `salary` DECIMAL,
    `status` TEXT DEFAULT 'Active',
    `avatar_url` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `designation` TEXT,
    `reporting_manager_id` CHAR(36),
    `employee_id` TEXT,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `manager_id` CHAR(36),
    `department_id` CHAR(36),
    `dob` DATE,
    `pan` TEXT,
    `bank_account` TEXT,
    `bank_name` TEXT,
    `location` TEXT,
    `address` TEXT,
    `personal_email` TEXT,
    `emergency_contact` TEXT,
    `technology` TEXT,
    `experience_years` DECIMAL,
    `aadhaar_card` TEXT,
    `salary_revision_history_enabled` TINYINT(1) NOT NULL DEFAULT false,
    CONSTRAINT `employees_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `expense_claims` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `category` TEXT NOT NULL,
    `amount` DECIMAL NOT NULL,
    `expense_date` DATE NOT NULL,
    `description` TEXT,
    `receipt_url` TEXT,
    `status` TEXT NOT NULL DEFAULT 'Pending',
    `reviewer_id` CHAR(36),
    `reviewer_comment` TEXT,
    `reviewed_at` DATETIME(3),
    `reimbursed_payroll_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `expense_claims_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `file_shares` (
    `file_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `shared_by` CHAR(36),
    `shared_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `file_shares_pkey` PRIMARY KEY (`file_id`,`employee_id`)
);
CREATE TABLE `files` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `folder_id` CHAR(36),
    `owner_id` CHAR(36),
    `size` BIGINT NOT NULL,
    `mime_type` TEXT,
    `storage_path` TEXT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `is_shared` TINYINT(1) DEFAULT false,
    `folder` TEXT,
    CONSTRAINT `files_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `folders` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `parent_id` CHAR(36),
    `owner_id` CHAR(36),
    `is_company` TINYINT(1) DEFAULT false,
    `is_hr_only` TINYINT(1) DEFAULT false,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `folders_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `goals` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `cycle_id` CHAR(36),
    `employee_id` CHAR(36),
    `title` TEXT NOT NULL,
    `description` TEXT,
    `target` TEXT NOT NULL,
    `progress` INTEGER DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `goals_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `helpdesk_attachments` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `ticket_id` CHAR(36) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_name` TEXT NOT NULL,
    `file_size` INTEGER,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `helpdesk_attachments_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `helpdesk_comments` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `ticket_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `comment_text` TEXT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `helpdesk_comments_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `helpdesk_tickets` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `category` TEXT NOT NULL,
    `subject` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `priority` TEXT NOT NULL DEFAULT 'medium',
    `status` TEXT NOT NULL DEFAULT 'open',
    `assigned_to` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` DATETIME(3),
    `closed_at` DATETIME(3),
    CONSTRAINT `helpdesk_tickets_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `holidays` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `date` DATE NOT NULL,
    `type` TEXT DEFAULT 'National',
    `label` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `holidays_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `income_tax_declaration_items` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `declaration_id` CHAR(36) NOT NULL,
    `section_code` TEXT NOT NULL,
    `item_label` TEXT NOT NULL,
    `declared_amount` DECIMAL NOT NULL DEFAULT 0,
    `approved_amount` DECIMAL,
    `status` TEXT NOT NULL DEFAULT 'pending',
    `hr_comment` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `income_tax_declaration_items_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `income_tax_declaration_proofs` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `item_id` CHAR(36) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_name` TEXT NOT NULL,
    `file_size` BIGINT,
    `uploaded_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `income_tax_declaration_proofs_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `income_tax_declarations` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `financial_year` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'draft',
    `submitted_at` DATETIME(3),
    `reviewed_at` DATETIME(3),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `version` INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT `income_tax_declarations_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `leave_balances` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36),
    `year` INTEGER NOT NULL,
    `casual_total` INTEGER DEFAULT 12,
    `casual_used` INTEGER DEFAULT 0,
    `sick_total` INTEGER DEFAULT 12,
    `sick_used` INTEGER DEFAULT 0,
    `earned_total` INTEGER DEFAULT 15,
    `earned_used` INTEGER DEFAULT 0,
    `comp_off_total` INTEGER DEFAULT 0,
    `comp_off_used` INTEGER DEFAULT 0,
    `casual_encashed` INTEGER DEFAULT 0,
    `sick_encashed` INTEGER DEFAULT 0,
    `earned_encashed` INTEGER DEFAULT 0,
    `comp_off_encashed` INTEGER DEFAULT 0,
    CONSTRAINT `leave_balances_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `leave_encashment_policy` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `encashable_leave_types` JSON,
    `max_days_per_year` INTEGER NOT NULL,
    `payout_formula` TEXT NOT NULL,
    `updated_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `leave_encashment_policy_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `leave_encashment_requests` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `leave_type` TEXT NOT NULL,
    `days_requested` INTEGER NOT NULL,
    `encashment_amount` DECIMAL NOT NULL DEFAULT 0,
    `request_year` INTEGER NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'Pending',
    `reviewer_id` CHAR(36),
    `reviewer_comment` TEXT,
    `reviewed_at` DATETIME(3),
    `reimbursed_payroll_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `leave_encashment_requests_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `leaves` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36),
    `leave_type` TEXT,
    `start_date` DATE,
    `end_date` DATE,
    `days` DECIMAL,
    `reason` TEXT,
    `attachment_url` TEXT,
    `status` TEXT DEFAULT 'Pending',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `reviewed_by` CHAR(36),
    `reviewed_at` DATETIME(3),
    CONSTRAINT `leaves_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `manager_appraisal_items` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `manager_appraisal_id` CHAR(36),
    `goal_id` CHAR(36),
    `rating` INTEGER NOT NULL,
    `comment` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `manager_appraisal_items_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `manager_appraisals` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `cycle_id` CHAR(36),
    `employee_id` CHAR(36),
    `manager_id` CHAR(36),
    `feedback` TEXT,
    `submitted_at` DATETIME(3),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `employee_comment` TEXT,
    `employee_comment_at` DATETIME(3),
    CONSTRAINT `manager_appraisals_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `meeting_participants` (
    `meeting_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    CONSTRAINT `meeting_participants_pkey` PRIMARY KEY (`meeting_id`,`employee_id`)
);
CREATE TABLE `meetings` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `title` TEXT NOT NULL,
    `agenda` TEXT,
    `date_time` DATETIME(3) NOT NULL,
    `duration` INTEGER DEFAULT 60,
    `room_url` TEXT,
    `created_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `scheduled_at` DATETIME(3),
    `duration_minutes` INTEGER,
    `meeting_link` TEXT,
    `status` TEXT DEFAULT 'active',
    `meeting_type` TEXT DEFAULT 'scheduled',
    `last_person_left_at` DATETIME(3),
    `first_person_joined_at` DATETIME(3),
    CONSTRAINT `meetings_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `messages` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `sender_id` CHAR(36),
    `receiver_id` CHAR(36),
    `group_id` CHAR(36),
    `content` TEXT NOT NULL,
    `attachment_url` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `is_read` TINYINT(1) DEFAULT false,
    `attachment` TEXT,
    CONSTRAINT `messages_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36),
    `title` TEXT NOT NULL,
    `message` TEXT NOT NULL,
    `type` TEXT DEFAULT 'info',
    `is_read` TINYINT(1) DEFAULT false,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `notifications_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `offboarding_cases` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `last_working_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `reason_details` TEXT,
    `status` TEXT NOT NULL DEFAULT 'in_progress',
    `started_by` CHAR(36),
    `finalized_by` CHAR(36),
    `finalized_at` DATETIME(3),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `offboarding_cases_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `offboarding_checklist_items` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `case_id` CHAR(36) NOT NULL,
    `task_code` TEXT NOT NULL,
    `task_title` TEXT NOT NULL,
    `assigned_role` TEXT NOT NULL,
    `assigned_to` CHAR(36),
    `is_cleared` TINYINT(1) NOT NULL DEFAULT false,
    `cleared_by` CHAR(36),
    `cleared_at` DATETIME(3),
    `notes` TEXT,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `offboarding_checklist_items_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `offboarding_exit_interviews` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `case_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `reason_for_leaving` TEXT NOT NULL,
    `experience_rating` INTEGER NOT NULL,
    `feedback` TEXT,
    `submitted_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `offboarding_exit_interviews_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `offer_letters` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `candidate_name` TEXT NOT NULL,
    `role` TEXT NOT NULL,
    `department` TEXT NOT NULL,
    `ctc` DECIMAL NOT NULL,
    `joining_date` DATE NOT NULL,
    `status` TEXT DEFAULT 'Generated',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `email` TEXT,
    `type` TEXT DEFAULT 'offer',
    `file_path` TEXT,
    `generated_by` CHAR(36),
    CONSTRAINT `offer_letters_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `onboarding_case_tasks` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `case_id` CHAR(36),
    `template_task_id` CHAR(36),
    `title` TEXT NOT NULL,
    `description` TEXT,
    `requires_document` TINYINT(1) DEFAULT false,
    `is_completed` TINYINT(1) DEFAULT false,
    `completed_at` DATETIME(3),
    `completed_by` CHAR(36),
    `document_url` TEXT,
    `sort_order` INTEGER DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `onboarding_case_tasks_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `onboarding_cases` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36),
    `template_id` CHAR(36),
    `status` TEXT DEFAULT 'active',
    `assigned_by` CHAR(36),
    `started_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME(3),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `onboarding_cases_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `onboarding_template_tasks` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `template_id` CHAR(36),
    `title` TEXT NOT NULL,
    `description` TEXT,
    `requires_document` TINYINT(1) DEFAULT false,
    `sort_order` INTEGER DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `onboarding_template_tasks_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `onboarding_templates` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `description` TEXT,
    `created_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `onboarding_templates_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `password_reset_tokens` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `profile_id` CHAR(36),
    `token` TEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` TINYINT(1) DEFAULT false,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `password_reset_tokens_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `payroll` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36),
    `month` TEXT NOT NULL,
    `year` INTEGER NOT NULL,
    `basic_salary` DECIMAL NOT NULL,
    `allowances` DECIMAL DEFAULT 0,
    `deductions` DECIMAL DEFAULT 0,
    `net_salary` DECIMAL NOT NULL,
    `status` TEXT DEFAULT 'Pending',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `generated_by` CHAR(36),
    `sent_at` DATETIME(3),
    `pf` DECIMAL DEFAULT 0,
    `tds` DECIMAL DEFAULT 0,
    `hra` DECIMAL DEFAULT 0,
    `ptax` DECIMAL DEFAULT 200,
    `conveyance` DECIMAL DEFAULT 0,
    `special_allowance` DECIMAL DEFAULT 0,
    `emp_code` TEXT,
    `designation` TEXT,
    `department` TEXT,
    `location` TEXT,
    `processed_days` INTEGER DEFAULT 31,
    `paid_days` INTEGER DEFAULT 31,
    `pan_no` TEXT,
    `bank_account` TEXT,
    `bank_name` TEXT,
    `pf_employee` DECIMAL DEFAULT 0,
    `pf_employer` DECIMAL DEFAULT 0,
    `esi_employee` DECIMAL DEFAULT 0,
    `esi_employer` DECIMAL DEFAULT 0,
    `reimbursements` DECIMAL DEFAULT 0,
    `leave_encashment` DECIMAL DEFAULT 0,
    CONSTRAINT `payroll_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `payroll_statutory_settings` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `pf_employee_rate` DECIMAL NOT NULL,
    `pf_employer_rate` DECIMAL NOT NULL,
    `esi_employee_rate` DECIMAL NOT NULL,
    `esi_employer_rate` DECIMAL NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `payroll_statutory_settings_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `payroll_tds_slabs` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `income_from` DECIMAL NOT NULL,
    `income_to` DECIMAL,
    `rate` DECIMAL NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `name` TEXT DEFAULT '',
    CONSTRAINT `payroll_tds_slabs_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `peer_feedback` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `cycle_id` CHAR(36),
    `employee_id` CHAR(36),
    `reviewer_id` CHAR(36),
    `rating` INTEGER NOT NULL,
    `comment` TEXT,
    `is_anonymous` TINYINT(1) DEFAULT false,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `peer_feedback_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `email` TEXT NOT NULL,
    `role` TEXT,
    `password_hash` TEXT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `employee_id` TEXT,
    `is_first_login` TINYINT(1) DEFAULT true,
    `failed_login_attempts` INTEGER DEFAULT 0,
    `locked_at` DATETIME(3),
    `status` TEXT DEFAULT 'active',
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `profiles_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `project_members` (
    `project_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `role` TEXT,
    `role_in_project` TEXT,
    `joined_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `project_members_pkey` PRIMARY KEY (`project_id`,`employee_id`)
);
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `client` TEXT NOT NULL,
    `deadline` DATE,
    `status` TEXT DEFAULT 'Active',
    `progress` INTEGER DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `description` TEXT,
    `start_date` DATE,
    `created_by` CHAR(36),
    CONSTRAINT `projects_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `salary_revisions` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `employee_id` CHAR(36) NOT NULL,
    `effective_date` DATE NOT NULL,
    `proposed_basic_salary` DECIMAL NOT NULL,
    `proposed_hra` DECIMAL NOT NULL,
    `proposed_allowances` DECIMAL NOT NULL,
    `proposed_total_ctc` DECIMAL NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'pending',
    `initiated_by` CHAR(36),
    `approved_by` CHAR(36),
    `approver_comment` TEXT,
    `initiated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `approved_at` DATETIME(3),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `salary_revisions_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `self_appraisal_items` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `self_appraisal_id` CHAR(36),
    `goal_id` CHAR(36),
    `rating` INTEGER NOT NULL,
    `comment` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `self_appraisal_items_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `self_appraisals` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `cycle_id` CHAR(36),
    `employee_id` CHAR(36),
    `overall_comment` TEXT,
    `submitted_at` DATETIME(3),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `self_appraisals_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `shifts` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` TEXT NOT NULL,
    `start_time` TIME(6) NOT NULL,
    `end_time` TIME(6) NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `shifts_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `survey_answers` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `response_id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `answer_text` TEXT NOT NULL,
    CONSTRAINT `survey_answers_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `survey_questions` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `survey_id` CHAR(36) NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_type` TEXT NOT NULL,
    `options_json` TEXT,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `survey_questions_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `survey_responses` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `survey_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36),
    `submitted_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `survey_responses_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `surveys` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `title` TEXT NOT NULL,
    `description` TEXT,
    `created_by` CHAR(36),
    `target_type` TEXT NOT NULL DEFAULT 'all',
    `target_department_id` CHAR(36),
    `is_anonymous` TINYINT(1) NOT NULL DEFAULT false,
    `deadline` DATE,
    `status` TEXT NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `surveys_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `project_id` CHAR(36),
    `title` TEXT NOT NULL,
    `assignee_id` CHAR(36),
    `status` TEXT DEFAULT 'todo',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `description` TEXT,
    `due_date` DATE,
    CONSTRAINT `tasks_pkey` PRIMARY KEY (`id`)
);
CREATE TABLE `token_blacklist` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `token` TEXT NOT NULL,
    `invalidated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME(3) NOT NULL,
    CONSTRAINT `token_blacklist_pkey` PRIMARY KEY (`id`)
);
CREATE INDEX `idx_appraisal_participants_cycle` ON `appraisal_participants`(`cycle_id`);
CREATE INDEX `idx_appraisal_participants_employee` ON `appraisal_participants`(`employee_id`);
CREATE UNIQUE INDEX `appraisal_participants_cycle_id_employee_id_key` ON `appraisal_participants`(`cycle_id`, `employee_id`);
-- Skipped unsupported partial index: CREATE UNIQUE INDEX "idx_asset_assignments_active_asset" ON "asset_assignments"("asset_id") WHERE (return_date IS NULL);
CREATE INDEX `idx_asset_assignments_employee_active` ON `asset_assignments`(`employee_id`, `return_date`);
CREATE UNIQUE INDEX `assets_serial_number_key` ON `assets`(`serial_number`(191));
CREATE INDEX `idx_assets_type_status` ON `assets`(`asset_type`(191), `status`(191));
CREATE UNIQUE INDEX `departments_name_key` ON `departments`(`name`(191));
CREATE INDEX `idx_employee_celebrations_date` ON `employee_celebrations`(`celebration_date`, `celebration_type`(191));
CREATE UNIQUE INDEX `employee_celebrations_employee_id_celebration_type_celebrat_key` ON `employee_celebrations`(`employee_id`, `celebration_type`(191), `celebration_date`);
CREATE INDEX `idx_shift_assignments_employee_dates` ON `employee_shift_assignments`(`employee_id`, `effective_from`, `effective_to`);
CREATE INDEX `idx_shift_assignments_shift` ON `employee_shift_assignments`(`shift_id`);
CREATE UNIQUE INDEX `employees_email_key` ON `employees`(`email`(191));
CREATE UNIQUE INDEX `employees_employee_id_key` ON `employees`(`employee_id`(191));
CREATE INDEX `idx_employees_department_id` ON `employees`(`department_id`);
CREATE INDEX `idx_employees_manager_id` ON `employees`(`manager_id`);
CREATE INDEX `idx_expense_claims_employee` ON `expense_claims`(`employee_id`);
CREATE INDEX `idx_expense_claims_reimbursed` ON `expense_claims`(`reimbursed_payroll_id`);
CREATE INDEX `idx_expense_claims_status` ON `expense_claims`(`status`(191));
CREATE INDEX `idx_goals_cycle_employee` ON `goals`(`cycle_id`, `employee_id`);
CREATE INDEX `idx_helpdesk_comments_ticket` ON `helpdesk_comments`(`ticket_id`, `created_at` DESC);
CREATE INDEX `idx_helpdesk_comments_user` ON `helpdesk_comments`(`user_id`);
CREATE INDEX `idx_helpdesk_tickets_assigned_to` ON `helpdesk_tickets`(`assigned_to`, `status`(191));
CREATE INDEX `idx_helpdesk_tickets_category` ON `helpdesk_tickets`(`category`(191), `status`(191), `created_at` DESC);
CREATE INDEX `idx_helpdesk_tickets_employee` ON `helpdesk_tickets`(`employee_id`);
CREATE INDEX `idx_helpdesk_tickets_status` ON `helpdesk_tickets`(`status`(191), `created_at` DESC);
CREATE INDEX `idx_income_tax_items_declaration` ON `income_tax_declaration_items`(`declaration_id`, `section_code`(191), `status`(191));
CREATE INDEX `idx_income_tax_proofs_item` ON `income_tax_declaration_proofs`(`item_id`);
CREATE INDEX `idx_income_tax_decl_employee_year` ON `income_tax_declarations`(`employee_id`, `financial_year`(191));
CREATE INDEX `idx_income_tax_decl_status` ON `income_tax_declarations`(`status`(191));
CREATE UNIQUE INDEX `idx_income_tax_decl_employee_year_version` ON `income_tax_declarations`(`employee_id`, `financial_year`(191), `version`);
CREATE INDEX `idx_leave_bal_emp_year` ON `leave_balances`(`employee_id`, `year`);
CREATE UNIQUE INDEX `leave_balances_employee_id_year_key` ON `leave_balances`(`employee_id`, `year`);
CREATE INDEX `idx_leave_encashment_requests_employee_year` ON `leave_encashment_requests`(`employee_id`, `request_year`);
CREATE INDEX `idx_leave_encashment_requests_reimbursed` ON `leave_encashment_requests`(`reimbursed_payroll_id`);
CREATE INDEX `idx_leave_encashment_requests_status` ON `leave_encashment_requests`(`status`(191));
CREATE INDEX `idx_manager_appraisals_cycle_employee` ON `manager_appraisals`(`cycle_id`, `employee_id`);
CREATE UNIQUE INDEX `manager_appraisals_cycle_id_employee_id_manager_id_key` ON `manager_appraisals`(`cycle_id`, `employee_id`, `manager_id`);
-- Skipped unsupported partial index: CREATE UNIQUE INDEX "idx_offboarding_active_case_per_employee" ON "offboarding_cases"("employee_id") WHERE (status = 'in_progress'::text);
CREATE INDEX `idx_offboarding_cases_status` ON `offboarding_cases`(`status`(191), `created_at` DESC);
CREATE INDEX `idx_offboarding_checklist_assignee` ON `offboarding_checklist_items`(`assigned_to`, `assigned_role`(191), `is_cleared`);
CREATE INDEX `idx_offboarding_checklist_case` ON `offboarding_checklist_items`(`case_id`, `sort_order`);
CREATE UNIQUE INDEX `offboarding_checklist_items_case_id_task_code_key` ON `offboarding_checklist_items`(`case_id`, `task_code`(191));
CREATE UNIQUE INDEX `offboarding_exit_interviews_case_id_key` ON `offboarding_exit_interviews`(`case_id`);
CREATE INDEX `idx_onboarding_case_tasks_case` ON `onboarding_case_tasks`(`case_id`, `sort_order`);
-- Skipped unsupported partial index: CREATE UNIQUE INDEX "idx_onboarding_active_case_per_employee" ON "onboarding_cases"("employee_id") WHERE (status = 'active'::text);
CREATE INDEX `idx_onboarding_template_tasks_template` ON `onboarding_template_tasks`(`template_id`, `sort_order`);
CREATE UNIQUE INDEX `password_reset_tokens_token_key` ON `password_reset_tokens`(`token`(191));
CREATE INDEX `idx_peer_feedback_cycle_employee` ON `peer_feedback`(`cycle_id`, `employee_id`);
CREATE UNIQUE INDEX `peer_feedback_cycle_id_employee_id_reviewer_id_key` ON `peer_feedback`(`cycle_id`, `employee_id`, `reviewer_id`);
CREATE UNIQUE INDEX `profiles_email_key` ON `profiles`(`email`(191));
CREATE UNIQUE INDEX `profiles_employee_id_key` ON `profiles`(`employee_id`(191));
CREATE INDEX `idx_salary_revisions_employee_effective` ON `salary_revisions`(`employee_id`, `effective_date` DESC, `created_at` DESC);
CREATE INDEX `idx_salary_revisions_status` ON `salary_revisions`(`status`(191), `created_at` DESC);
CREATE INDEX `idx_self_appraisals_cycle_employee` ON `self_appraisals`(`cycle_id`, `employee_id`);
CREATE UNIQUE INDEX `self_appraisals_cycle_id_employee_id_key` ON `self_appraisals`(`cycle_id`, `employee_id`);
CREATE UNIQUE INDEX `shifts_name_key` ON `shifts`(`name`(191));
CREATE INDEX `idx_survey_answers_question` ON `survey_answers`(`question_id`);
CREATE INDEX `idx_survey_questions_survey_order` ON `survey_questions`(`survey_id`, `order_index`);
CREATE INDEX `idx_survey_responses_survey` ON `survey_responses`(`survey_id`, `submitted_at` DESC);
CREATE UNIQUE INDEX `survey_responses_survey_id_employee_id_key` ON `survey_responses`(`survey_id`, `employee_id`);
CREATE INDEX `idx_surveys_status_target` ON `surveys`(`status`(191), `target_type`(191), `created_at` DESC);
CREATE UNIQUE INDEX `token_blacklist_token_key` ON `token_blacklist`(`token`(191));
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `appraisal_cycles` ADD CONSTRAINT `appraisal_cycles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `appraisal_participants` ADD CONSTRAINT `appraisal_participants_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `appraisal_participants` ADD CONSTRAINT `appraisal_participants_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_returned_by_fkey` FOREIGN KEY (`returned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `assets` ADD CONSTRAINT `assets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `chat_groups` ADD CONSTRAINT `chat_groups_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `documents` ADD CONSTRAINT `documents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `employee_celebrations` ADD CONSTRAINT `employee_celebrations_announcement_id_fkey` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `employee_celebrations` ADD CONSTRAINT `employee_celebrations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `employee_shift_assignments` ADD CONSTRAINT `employee_shift_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `employee_shift_assignments` ADD CONSTRAINT `employee_shift_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `employee_shift_assignments` ADD CONSTRAINT `employee_shift_assignments_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `employees_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `employees_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_reimbursed_payroll_id_fkey` FOREIGN KEY (`reimbursed_payroll_id`) REFERENCES `payroll`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_shared_by_fkey` FOREIGN KEY (`shared_by`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `files` ADD CONSTRAINT `files_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `files` ADD CONSTRAINT `files_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `folders` ADD CONSTRAINT `folders_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `folders` ADD CONSTRAINT `folders_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `goals` ADD CONSTRAINT `goals_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `goals` ADD CONSTRAINT `goals_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `helpdesk_attachments` ADD CONSTRAINT `helpdesk_attachments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `helpdesk_tickets`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `helpdesk_comments` ADD CONSTRAINT `helpdesk_comments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `helpdesk_tickets`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `helpdesk_comments` ADD CONSTRAINT `helpdesk_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `helpdesk_tickets` ADD CONSTRAINT `helpdesk_tickets_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `helpdesk_tickets` ADD CONSTRAINT `helpdesk_tickets_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `income_tax_declaration_items` ADD CONSTRAINT `income_tax_declaration_items_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `income_tax_declarations`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `income_tax_declaration_proofs` ADD CONSTRAINT `income_tax_declaration_proofs_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `income_tax_declaration_items`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `income_tax_declaration_proofs` ADD CONSTRAINT `income_tax_declaration_proofs_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `income_tax_declarations` ADD CONSTRAINT `income_tax_declarations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `leave_encashment_policy` ADD CONSTRAINT `leave_encashment_policy_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `leave_encashment_requests` ADD CONSTRAINT `leave_encashment_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `leave_encashment_requests` ADD CONSTRAINT `leave_encashment_requests_reimbursed_payroll_id_fkey` FOREIGN KEY (`reimbursed_payroll_id`) REFERENCES `payroll`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `leave_encashment_requests` ADD CONSTRAINT `leave_encashment_requests_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `manager_appraisal_items` ADD CONSTRAINT `manager_appraisal_items_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `manager_appraisal_items` ADD CONSTRAINT `manager_appraisal_items_manager_appraisal_id_fkey` FOREIGN KEY (`manager_appraisal_id`) REFERENCES `manager_appraisals`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `manager_appraisals` ADD CONSTRAINT `manager_appraisals_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `manager_appraisals` ADD CONSTRAINT `manager_appraisals_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `manager_appraisals` ADD CONSTRAINT `manager_appraisals_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `meeting_participants` ADD CONSTRAINT `meeting_participants_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `meeting_participants` ADD CONSTRAINT `meeting_participants_meeting_id_fkey` FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `messages` ADD CONSTRAINT `messages_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `offboarding_cases` ADD CONSTRAINT `offboarding_cases_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `offboarding_cases` ADD CONSTRAINT `offboarding_cases_finalized_by_fkey` FOREIGN KEY (`finalized_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `offboarding_cases` ADD CONSTRAINT `offboarding_cases_started_by_fkey` FOREIGN KEY (`started_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `offboarding_checklist_items` ADD CONSTRAINT `offboarding_checklist_items_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `offboarding_checklist_items` ADD CONSTRAINT `offboarding_checklist_items_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `offboarding_cases`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `offboarding_checklist_items` ADD CONSTRAINT `offboarding_checklist_items_cleared_by_fkey` FOREIGN KEY (`cleared_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `offboarding_exit_interviews` ADD CONSTRAINT `offboarding_exit_interviews_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `offboarding_cases`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `offboarding_exit_interviews` ADD CONSTRAINT `offboarding_exit_interviews_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `offer_letters` ADD CONSTRAINT `offer_letters_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `onboarding_case_tasks` ADD CONSTRAINT `onboarding_case_tasks_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `onboarding_cases`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `onboarding_case_tasks` ADD CONSTRAINT `onboarding_case_tasks_completed_by_fkey` FOREIGN KEY (`completed_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `onboarding_case_tasks` ADD CONSTRAINT `onboarding_case_tasks_template_task_id_fkey` FOREIGN KEY (`template_task_id`) REFERENCES `onboarding_template_tasks`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `onboarding_templates`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `onboarding_template_tasks` ADD CONSTRAINT `onboarding_template_tasks_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `onboarding_templates`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `onboarding_templates` ADD CONSTRAINT `onboarding_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `payroll` ADD CONSTRAINT `payroll_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `payroll` ADD CONSTRAINT `payroll_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `peer_feedback` ADD CONSTRAINT `peer_feedback_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `peer_feedback` ADD CONSTRAINT `peer_feedback_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `peer_feedback` ADD CONSTRAINT `peer_feedback_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `salary_revisions` ADD CONSTRAINT `salary_revisions_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `salary_revisions` ADD CONSTRAINT `salary_revisions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `salary_revisions` ADD CONSTRAINT `salary_revisions_initiated_by_fkey` FOREIGN KEY (`initiated_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `self_appraisal_items` ADD CONSTRAINT `self_appraisal_items_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `self_appraisal_items` ADD CONSTRAINT `self_appraisal_items_self_appraisal_id_fkey` FOREIGN KEY (`self_appraisal_id`) REFERENCES `self_appraisals`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `self_appraisals` ADD CONSTRAINT `self_appraisals_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `self_appraisals` ADD CONSTRAINT `self_appraisals_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_response_id_fkey` FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `survey_questions` ADD CONSTRAINT `survey_questions_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_target_department_id_fkey` FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;
