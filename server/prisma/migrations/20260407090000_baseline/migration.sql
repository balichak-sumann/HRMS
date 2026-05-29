-- CreateTable
CREATE TABLE `announcements` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `title` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `author_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `announcements_author_id_fkey`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appraisal_cycles` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` TEXT NULL DEFAULT 'draft',
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `appraisal_cycles_created_by_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appraisal_participants` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `cycle_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_appraisal_participants_cycle`(`cycle_id`),
    INDEX `idx_appraisal_participants_employee`(`employee_id`),
    UNIQUE INDEX `appraisal_participants_cycle_id_employee_id_key`(`cycle_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_assignments` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `asset_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `assigned_date` DATE NOT NULL,
    `return_date` DATE NULL,
    `condition_notes` TEXT NULL,
    `assigned_by` CHAR(36) NULL,
    `returned_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `asset_assignments_asset_id_fkey`(`asset_id`),
    INDEX `asset_assignments_assigned_by_fkey`(`assigned_by`),
    INDEX `asset_assignments_returned_by_fkey`(`returned_by`),
    INDEX `idx_asset_assignments_employee_active`(`employee_id`, `return_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `asset_type` TEXT NOT NULL,
    `serial_number` VARCHAR(191) NOT NULL,
    `purchase_date` DATE NULL,
    `asset_value` DECIMAL(10, 0) NULL,
    `status` TEXT NOT NULL DEFAULT 'available',
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `assets_serial_number_key`(`serial_number`),
    INDEX `assets_created_by_fkey`(`created_by`),
    INDEX `idx_assets_type_status`(`asset_type`(191), `status`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NULL,
    `check_in` DATETIME(3) NOT NULL,
    `check_out` DATETIME(3) NULL,
    `status` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hours_worked` DECIMAL(10, 0) NULL,
    `location` TEXT NULL,

    INDEX `attendance_employee_id_fkey`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `user_email` TEXT NOT NULL,
    `full_name` TEXT NOT NULL,
    `action` TEXT NOT NULL,
    `module` TEXT NOT NULL,
    `ip_address` TEXT NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` CHAR(36) NULL,

    INDEX `audit_logs_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_group_members` (
    `group_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `joined_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_group_members_employee_id_fkey`(`employee_id`),
    PRIMARY KEY (`group_id`, `employee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_groups` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` CHAR(36) NULL,

    INDEX `chat_groups_created_by_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaints` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NULL,
    `category` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `attachment_url` TEXT NULL,
    `is_anonymous` BOOLEAN NULL DEFAULT false,
    `status` TEXT NULL DEFAULT 'Open',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_by` CHAR(36) NULL,
    `attachment` TEXT NULL,

    INDEX `complaints_employee_id_fkey`(`employee_id`),
    INDEX `complaints_reviewed_by_fkey`(`reviewed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_reports` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `project_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `work_done` TEXT NOT NULL,
    `hours` DECIMAL(10, 0) NOT NULL,
    `blockers` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date` DATE NULL DEFAULT (curdate()),
    `hours_spent` DECIMAL(10, 0) NULL,

    INDEX `daily_reports_employee_id_fkey`(`employee_id`),
    INDEX `daily_reports_project_id_fkey`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `departments_name_key`(`name`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `type` TEXT NULL,
    `file_url` TEXT NOT NULL,
    `employee_id` CHAR(36) NULL,
    `status` TEXT NULL DEFAULT 'Pending',
    `uploaded_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `file_path` TEXT NULL,

    INDEX `documents_employee_id_fkey`(`employee_id`),
    INDEX `documents_uploaded_by_fkey`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_celebrations` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `celebration_type` TEXT NOT NULL,
    `celebration_date` DATE NOT NULL,
    `announcement_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_celebrations_announcement_id_fkey`(`announcement_id`),
    INDEX `idx_employee_celebrations_date`(`celebration_date`, `celebration_type`(191)),
    UNIQUE INDEX `employee_celebrations_employee_id_celebration_type_celebrat_key`(`employee_id`, `celebration_type`(191), `celebration_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_shift_assignments` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `shift_id` CHAR(36) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `assigned_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_shift_assignments_assigned_by_fkey`(`assigned_by`),
    INDEX `idx_shift_assignments_employee_dates`(`employee_id`, `effective_from`, `effective_to`),
    INDEX `idx_shift_assignments_shift`(`shift_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `full_name` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `role` TEXT NULL,
    `department` TEXT NULL DEFAULT 'Engineering',
    `phone` TEXT NULL,
    `joining_date` DATE NULL,
    `salary` DECIMAL(10, 0) NULL,
    `status` TEXT NULL DEFAULT 'Active',
    `avatar_url` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `designation` TEXT NULL,
    `reporting_manager_id` CHAR(36) NULL,
    `employee_id` TEXT NULL,
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `manager_id` CHAR(36) NULL,
    `department_id` CHAR(36) NULL,
    `dob` DATE NULL,
    `pan` TEXT NULL,
    `bank_account` TEXT NULL,
    `bank_name` TEXT NULL,
    `location` TEXT NULL,
    `address` TEXT NULL,
    `personal_email` TEXT NULL,
    `emergency_contact` TEXT NULL,
    `technology` TEXT NULL,
    `experience_years` DECIMAL(10, 0) NULL,
    `aadhaar_card` TEXT NULL,
    `salary_revision_history_enabled` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `employees_email_key`(`email`(191)),
    UNIQUE INDEX `employees_employee_id_key`(`employee_id`(191)),
    INDEX `employees_reporting_manager_id_fkey`(`reporting_manager_id`),
    INDEX `idx_employees_department_id`(`department_id`),
    INDEX `idx_employees_manager_id`(`manager_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_claims` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `category` TEXT NOT NULL,
    `amount` DECIMAL(10, 0) NOT NULL,
    `expense_date` DATE NOT NULL,
    `description` TEXT NULL,
    `receipt_url` TEXT NULL,
    `status` TEXT NOT NULL DEFAULT 'Pending',
    `reviewer_id` CHAR(36) NULL,
    `reviewer_comment` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reimbursed_payroll_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `expense_claims_reviewer_id_fkey`(`reviewer_id`),
    INDEX `idx_expense_claims_employee`(`employee_id`),
    INDEX `idx_expense_claims_reimbursed`(`reimbursed_payroll_id`),
    INDEX `idx_expense_claims_status`(`status`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_shares` (
    `file_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `shared_by` CHAR(36) NULL,
    `shared_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `file_shares_employee_id_fkey`(`employee_id`),
    INDEX `file_shares_shared_by_fkey`(`shared_by`),
    PRIMARY KEY (`file_id`, `employee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `folder_id` CHAR(36) NULL,
    `owner_id` CHAR(36) NULL,
    `size` BIGINT NOT NULL,
    `mime_type` TEXT NULL,
    `storage_path` TEXT NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_shared` BOOLEAN NULL DEFAULT false,
    `folder` TEXT NULL,

    INDEX `files_folder_id_fkey`(`folder_id`),
    INDEX `files_owner_id_fkey`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folders` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `parent_id` CHAR(36) NULL,
    `owner_id` CHAR(36) NULL,
    `is_company` BOOLEAN NULL DEFAULT false,
    `is_hr_only` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `folders_owner_id_fkey`(`owner_id`),
    INDEX `folders_parent_id_fkey`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goals` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `cycle_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `target` TEXT NOT NULL,
    `progress` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `goals_employee_id_fkey`(`employee_id`),
    INDEX `idx_goals_cycle_employee`(`cycle_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `helpdesk_attachments` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `ticket_id` CHAR(36) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_name` TEXT NOT NULL,
    `file_size` INTEGER NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `helpdesk_attachments_ticket_id_fkey`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `helpdesk_comments` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `ticket_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `comment_text` TEXT NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_helpdesk_comments_ticket`(`ticket_id`, `created_at` DESC),
    INDEX `idx_helpdesk_comments_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `helpdesk_tickets` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `category` TEXT NOT NULL,
    `subject` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `priority` TEXT NOT NULL DEFAULT 'medium',
    `status` TEXT NOT NULL DEFAULT 'open',
    `assigned_to` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,

    INDEX `idx_helpdesk_tickets_assigned_to`(`assigned_to`, `status`(191)),
    INDEX `idx_helpdesk_tickets_category`(`category`(191), `status`(191), `created_at` DESC),
    INDEX `idx_helpdesk_tickets_employee`(`employee_id`),
    INDEX `idx_helpdesk_tickets_status`(`status`(191), `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `date` DATE NOT NULL,
    `type` TEXT NULL DEFAULT 'National',
    `label` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_tax_declaration_items` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `declaration_id` CHAR(36) NOT NULL,
    `section_code` TEXT NOT NULL,
    `item_label` TEXT NOT NULL,
    `declared_amount` DECIMAL(10, 0) NOT NULL DEFAULT 0,
    `approved_amount` DECIMAL(10, 0) NULL,
    `status` TEXT NOT NULL DEFAULT 'pending',
    `hr_comment` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_income_tax_items_declaration`(`declaration_id`, `section_code`(191), `status`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_tax_declaration_proofs` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `item_id` CHAR(36) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_name` TEXT NOT NULL,
    `file_size` BIGINT NULL,
    `uploaded_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_income_tax_proofs_item`(`item_id`),
    INDEX `income_tax_declaration_proofs_uploaded_by_fkey`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_tax_declarations` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `financial_year` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'draft',
    `submitted_at` DATETIME(3) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `idx_income_tax_decl_employee_year`(`employee_id`, `financial_year`(191)),
    INDEX `idx_income_tax_decl_status`(`status`(191)),
    UNIQUE INDEX `idx_income_tax_decl_employee_year_version`(`employee_id`, `financial_year`(191), `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_balances` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NULL,
    `year` INTEGER NOT NULL,
    `casual_total` INTEGER NULL DEFAULT 12,
    `casual_used` INTEGER NULL DEFAULT 0,
    `sick_total` INTEGER NULL DEFAULT 12,
    `sick_used` INTEGER NULL DEFAULT 0,
    `earned_total` INTEGER NULL DEFAULT 15,
    `earned_used` INTEGER NULL DEFAULT 0,
    `comp_off_total` INTEGER NULL DEFAULT 0,
    `comp_off_used` INTEGER NULL DEFAULT 0,
    `casual_encashed` INTEGER NULL DEFAULT 0,
    `sick_encashed` INTEGER NULL DEFAULT 0,
    `earned_encashed` INTEGER NULL DEFAULT 0,
    `comp_off_encashed` INTEGER NULL DEFAULT 0,

    INDEX `idx_leave_bal_emp_year`(`employee_id`, `year`),
    UNIQUE INDEX `leave_balances_employee_id_year_key`(`employee_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_encashment_policy` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `encashable_leave_types` LONGTEXT NULL,
    `max_days_per_year` INTEGER NOT NULL,
    `payout_formula` TEXT NOT NULL,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `leave_encashment_policy_updated_by_fkey`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_encashment_requests` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `leave_type` TEXT NOT NULL,
    `days_requested` INTEGER NOT NULL,
    `encashment_amount` DECIMAL(10, 0) NOT NULL DEFAULT 0,
    `request_year` INTEGER NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'Pending',
    `reviewer_id` CHAR(36) NULL,
    `reviewer_comment` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reimbursed_payroll_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_leave_encashment_requests_employee_year`(`employee_id`, `request_year`),
    INDEX `idx_leave_encashment_requests_reimbursed`(`reimbursed_payroll_id`),
    INDEX `idx_leave_encashment_requests_status`(`status`(191)),
    INDEX `leave_encashment_requests_reviewer_id_fkey`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leaves` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NULL,
    `leave_type` TEXT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `days` DECIMAL(10, 0) NULL,
    `reason` TEXT NULL,
    `status` TEXT NULL DEFAULT 'Pending',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_by` CHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,

    INDEX `leaves_employee_id_fkey`(`employee_id`),
    INDEX `leaves_reviewed_by_fkey`(`reviewed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manager_appraisal_items` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `manager_appraisal_id` CHAR(36) NULL,
    `goal_id` CHAR(36) NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `manager_appraisal_items_goal_id_fkey`(`goal_id`),
    INDEX `manager_appraisal_items_manager_appraisal_id_fkey`(`manager_appraisal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manager_appraisals` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `cycle_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `manager_id` CHAR(36) NULL,
    `feedback` TEXT NULL,
    `submitted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employee_comment` TEXT NULL,
    `employee_comment_at` DATETIME(3) NULL,

    INDEX `idx_manager_appraisals_cycle_employee`(`cycle_id`, `employee_id`),
    INDEX `manager_appraisals_employee_id_fkey`(`employee_id`),
    INDEX `manager_appraisals_manager_id_fkey`(`manager_id`),
    UNIQUE INDEX `manager_appraisals_cycle_id_employee_id_manager_id_key`(`cycle_id`, `employee_id`, `manager_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meeting_participants` (
    `meeting_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,

    INDEX `meeting_participants_employee_id_fkey`(`employee_id`),
    PRIMARY KEY (`meeting_id`, `employee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meetings` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `title` TEXT NOT NULL,
    `agenda` TEXT NULL,
    `date_time` DATETIME(3) NOT NULL,
    `duration` INTEGER NULL DEFAULT 60,
    `room_url` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scheduled_at` DATETIME(3) NULL,
    `duration_minutes` INTEGER NULL,
    `meeting_link` TEXT NULL,
    `status` TEXT NULL DEFAULT 'active',
    `meeting_type` TEXT NULL DEFAULT 'scheduled',
    `last_person_left_at` DATETIME(3) NULL,
    `first_person_joined_at` DATETIME(3) NULL,

    INDEX `meetings_created_by_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `sender_id` CHAR(36) NULL,
    `receiver_id` CHAR(36) NULL,
    `group_id` CHAR(36) NULL,
    `content` TEXT NOT NULL,
    `attachment_url` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_read` BOOLEAN NULL DEFAULT false,
    `attachment` TEXT NULL,

    INDEX `messages_group_id_fkey`(`group_id`),
    INDEX `messages_receiver_id_fkey`(`receiver_id`),
    INDEX `messages_sender_id_fkey`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `user_id` CHAR(36) NULL,
    `title` TEXT NOT NULL,
    `message` TEXT NOT NULL,
    `type` TEXT NULL DEFAULT 'info',
    `is_read` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offboarding_cases` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `last_working_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `reason_details` TEXT NULL,
    `status` TEXT NOT NULL DEFAULT 'in_progress',
    `started_by` CHAR(36) NULL,
    `finalized_by` CHAR(36) NULL,
    `finalized_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_offboarding_cases_status`(`status`(191), `created_at` DESC),
    INDEX `offboarding_cases_employee_id_fkey`(`employee_id`),
    INDEX `offboarding_cases_finalized_by_fkey`(`finalized_by`),
    INDEX `offboarding_cases_started_by_fkey`(`started_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offboarding_checklist_items` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `case_id` CHAR(36) NOT NULL,
    `task_code` TEXT NOT NULL,
    `task_title` TEXT NOT NULL,
    `assigned_role` TEXT NOT NULL,
    `assigned_to` CHAR(36) NULL,
    `is_cleared` BOOLEAN NOT NULL DEFAULT false,
    `cleared_by` CHAR(36) NULL,
    `cleared_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_offboarding_checklist_assignee`(`assigned_to`, `assigned_role`(191), `is_cleared`),
    INDEX `idx_offboarding_checklist_case`(`case_id`, `sort_order`),
    INDEX `offboarding_checklist_items_cleared_by_fkey`(`cleared_by`),
    UNIQUE INDEX `offboarding_checklist_items_case_id_task_code_key`(`case_id`, `task_code`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offboarding_exit_interviews` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `case_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `reason_for_leaving` TEXT NOT NULL,
    `experience_rating` INTEGER NOT NULL,
    `feedback` TEXT NULL,
    `submitted_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `offboarding_exit_interviews_case_id_key`(`case_id`),
    INDEX `offboarding_exit_interviews_employee_id_fkey`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offer_letters` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `candidate_name` TEXT NOT NULL,
    `role` TEXT NOT NULL,
    `department` TEXT NOT NULL,
    `ctc` DECIMAL(10, 0) NOT NULL,
    `joining_date` DATE NOT NULL,
    `status` TEXT NULL DEFAULT 'Generated',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `email` TEXT NULL,
    `type` TEXT NULL DEFAULT 'offer',
    `file_path` TEXT NULL,
    `generated_by` CHAR(36) NULL,

    INDEX `offer_letters_generated_by_fkey`(`generated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_case_tasks` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `case_id` CHAR(36) NULL,
    `template_task_id` CHAR(36) NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `requires_document` BOOLEAN NULL DEFAULT false,
    `is_completed` BOOLEAN NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `completed_by` CHAR(36) NULL,
    `document_url` TEXT NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_onboarding_case_tasks_case`(`case_id`, `sort_order`),
    INDEX `onboarding_case_tasks_completed_by_fkey`(`completed_by`),
    INDEX `onboarding_case_tasks_template_task_id_fkey`(`template_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_cases` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NULL,
    `template_id` CHAR(36) NULL,
    `status` TEXT NULL DEFAULT 'active',
    `assigned_by` CHAR(36) NULL,
    `started_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `onboarding_cases_assigned_by_fkey`(`assigned_by`),
    INDEX `onboarding_cases_employee_id_fkey`(`employee_id`),
    INDEX `onboarding_cases_template_id_fkey`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_template_tasks` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `template_id` CHAR(36) NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `requires_document` BOOLEAN NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_onboarding_template_tasks_template`(`template_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_templates` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `description` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `onboarding_templates_created_by_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `profile_id` CHAR(36) NULL,
    `token` TEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_token_key`(`token`(191)),
    INDEX `password_reset_tokens_profile_id_fkey`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NULL,
    `month` TEXT NOT NULL,
    `year` INTEGER NOT NULL,
    `basic_salary` DECIMAL(10, 0) NOT NULL,
    `allowances` DECIMAL(10, 0) NULL DEFAULT 0,
    `deductions` DECIMAL(10, 0) NULL DEFAULT 0,
    `net_salary` DECIMAL(10, 0) NOT NULL,
    `status` TEXT NULL DEFAULT 'Pending',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `generated_by` CHAR(36) NULL,
    `sent_at` DATETIME(3) NULL,
    `pf` DECIMAL(10, 0) NULL DEFAULT 0,
    `tds` DECIMAL(10, 0) NULL DEFAULT 0,
    `hra` DECIMAL(10, 0) NULL DEFAULT 0,
    `ptax` DECIMAL(10, 0) NULL DEFAULT 200,
    `conveyance` DECIMAL(10, 0) NULL DEFAULT 0,
    `special_allowance` DECIMAL(10, 0) NULL DEFAULT 0,
    `emp_code` TEXT NULL,
    `designation` TEXT NULL,
    `department` TEXT NULL,
    `location` TEXT NULL,
    `processed_days` INTEGER NULL DEFAULT 31,
    `paid_days` INTEGER NULL DEFAULT 31,
    `pan_no` TEXT NULL,
    `bank_account` TEXT NULL,
    `bank_name` TEXT NULL,
    `pf_employee` DECIMAL(10, 0) NULL DEFAULT 0,
    `pf_employer` DECIMAL(10, 0) NULL DEFAULT 0,
    `esi_employee` DECIMAL(10, 0) NULL DEFAULT 0,
    `esi_employer` DECIMAL(10, 0) NULL DEFAULT 0,
    `reimbursements` DECIMAL(10, 0) NULL DEFAULT 0,
    `leave_encashment` DECIMAL(10, 0) NULL DEFAULT 0,

    INDEX `payroll_employee_id_fkey`(`employee_id`),
    INDEX `payroll_generated_by_fkey`(`generated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_statutory_settings` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `pf_employee_rate` DECIMAL(10, 0) NOT NULL,
    `pf_employer_rate` DECIMAL(10, 0) NOT NULL,
    `esi_employee_rate` DECIMAL(10, 0) NOT NULL,
    `esi_employer_rate` DECIMAL(10, 0) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_tds_slabs` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `income_from` DECIMAL(10, 0) NOT NULL,
    `income_to` DECIMAL(10, 0) NULL,
    `rate` DECIMAL(10, 0) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` TEXT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peer_feedback` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `cycle_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `reviewer_id` CHAR(36) NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `is_anonymous` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_peer_feedback_cycle_employee`(`cycle_id`, `employee_id`),
    INDEX `peer_feedback_employee_id_fkey`(`employee_id`),
    INDEX `peer_feedback_reviewer_id_fkey`(`reviewer_id`),
    UNIQUE INDEX `peer_feedback_cycle_id_employee_id_reviewer_id_key`(`cycle_id`, `employee_id`, `reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `email` TEXT NOT NULL,
    `role` TEXT NULL,
    `password_hash` TEXT NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employee_id` TEXT NULL,
    `is_first_login` BOOLEAN NULL DEFAULT true,
    `failed_login_attempts` INTEGER NULL DEFAULT 0,
    `locked_at` DATETIME(3) NULL,
    `status` TEXT NULL DEFAULT 'active',
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `profiles_email_key`(`email`(191)),
    UNIQUE INDEX `profiles_employee_id_key`(`employee_id`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_members` (
    `project_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `role` TEXT NULL,
    `role_in_project` TEXT NULL,
    `joined_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_members_employee_id_fkey`(`employee_id`),
    PRIMARY KEY (`project_id`, `employee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `client` TEXT NOT NULL,
    `deadline` DATE NULL,
    `status` TEXT NULL DEFAULT 'Active',
    `progress` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,
    `start_date` DATE NULL,
    `created_by` CHAR(36) NULL,

    INDEX `projects_created_by_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_revisions` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `employee_id` CHAR(36) NOT NULL,
    `effective_date` DATE NOT NULL,
    `proposed_basic_salary` DECIMAL(10, 0) NOT NULL,
    `proposed_hra` DECIMAL(10, 0) NOT NULL,
    `proposed_allowances` DECIMAL(10, 0) NOT NULL,
    `proposed_total_ctc` DECIMAL(10, 0) NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'pending',
    `initiated_by` CHAR(36) NULL,
    `approved_by` CHAR(36) NULL,
    `approver_comment` TEXT NULL,
    `initiated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_salary_revisions_employee_effective`(`employee_id`, `effective_date` DESC, `created_at` DESC),
    INDEX `idx_salary_revisions_status`(`status`(191), `created_at` DESC),
    INDEX `salary_revisions_approved_by_fkey`(`approved_by`),
    INDEX `salary_revisions_initiated_by_fkey`(`initiated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `self_appraisal_items` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `self_appraisal_id` CHAR(36) NULL,
    `goal_id` CHAR(36) NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `self_appraisal_items_goal_id_fkey`(`goal_id`),
    INDEX `self_appraisal_items_self_appraisal_id_fkey`(`self_appraisal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `self_appraisals` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `cycle_id` CHAR(36) NULL,
    `employee_id` CHAR(36) NULL,
    `overall_comment` TEXT NULL,
    `submitted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_self_appraisals_cycle_employee`(`cycle_id`, `employee_id`),
    INDEX `self_appraisals_employee_id_fkey`(`employee_id`),
    UNIQUE INDEX `self_appraisals_cycle_id_employee_id_key`(`cycle_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` TEXT NOT NULL,
    `start_time` TIME(6) NOT NULL,
    `end_time` TIME(6) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `shifts_name_key`(`name`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_answers` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `response_id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `answer_text` TEXT NOT NULL,

    INDEX `idx_survey_answers_question`(`question_id`),
    INDEX `survey_answers_response_id_fkey`(`response_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_questions` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `survey_id` CHAR(36) NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_type` TEXT NOT NULL,
    `options_json` TEXT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_survey_questions_survey_order`(`survey_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_responses` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `survey_id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NULL,
    `submitted_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_survey_responses_survey`(`survey_id`, `submitted_at` DESC),
    INDEX `survey_responses_employee_id_fkey`(`employee_id`),
    UNIQUE INDEX `survey_responses_survey_id_employee_id_key`(`survey_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surveys` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `target_type` TEXT NOT NULL DEFAULT 'all',
    `target_department_id` CHAR(36) NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `deadline` DATE NULL,
    `status` TEXT NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_surveys_status_target`(`status`(191), `target_type`(191), `created_at` DESC),
    INDEX `surveys_created_by_fkey`(`created_by`),
    INDEX `surveys_target_department_id_fkey`(`target_department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_lookups` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `category` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_system_lookups_category`(`category`, `is_active`),
    UNIQUE INDEX `idx_system_lookups_unique`(`category`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `project_id` CHAR(36) NULL,
    `title` TEXT NOT NULL,
    `assignee_id` CHAR(36) NULL,
    `status` TEXT NULL DEFAULT 'todo',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,
    `due_date` DATE NULL,

    INDEX `tasks_assignee_id_fkey`(`assignee_id`),
    INDEX `tasks_project_id_fkey`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token_blacklist` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `token` TEXT NOT NULL,
    `invalidated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `token_blacklist_token_key`(`token`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appraisal_cycles` ADD CONSTRAINT `appraisal_cycles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appraisal_participants` ADD CONSTRAINT `appraisal_participants_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appraisal_participants` ADD CONSTRAINT `appraisal_participants_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_returned_by_fkey` FOREIGN KEY (`returned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_groups` ADD CONSTRAINT `chat_groups_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `profiles`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_celebrations` ADD CONSTRAINT `employee_celebrations_announcement_id_fkey` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_celebrations` ADD CONSTRAINT `employee_celebrations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_shift_assignments` ADD CONSTRAINT `employee_shift_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_shift_assignments` ADD CONSTRAINT `employee_shift_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_shift_assignments` ADD CONSTRAINT `employee_shift_assignments_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_reimbursed_payroll_id_fkey` FOREIGN KEY (`reimbursed_payroll_id`) REFERENCES `payroll`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_claims` ADD CONSTRAINT `expense_claims_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_shared_by_fkey` FOREIGN KEY (`shared_by`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `helpdesk_attachments` ADD CONSTRAINT `helpdesk_attachments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `helpdesk_tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `helpdesk_comments` ADD CONSTRAINT `helpdesk_comments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `helpdesk_tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `helpdesk_comments` ADD CONSTRAINT `helpdesk_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `helpdesk_tickets` ADD CONSTRAINT `helpdesk_tickets_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `helpdesk_tickets` ADD CONSTRAINT `helpdesk_tickets_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `income_tax_declaration_items` ADD CONSTRAINT `income_tax_declaration_items_declaration_id_fkey` FOREIGN KEY (`declaration_id`) REFERENCES `income_tax_declarations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `income_tax_declaration_proofs` ADD CONSTRAINT `income_tax_declaration_proofs_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `income_tax_declaration_items`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `income_tax_declaration_proofs` ADD CONSTRAINT `income_tax_declaration_proofs_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `income_tax_declarations` ADD CONSTRAINT `income_tax_declarations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_encashment_policy` ADD CONSTRAINT `leave_encashment_policy_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_encashment_requests` ADD CONSTRAINT `leave_encashment_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_encashment_requests` ADD CONSTRAINT `leave_encashment_requests_reimbursed_payroll_id_fkey` FOREIGN KEY (`reimbursed_payroll_id`) REFERENCES `payroll`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_encashment_requests` ADD CONSTRAINT `leave_encashment_requests_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `manager_appraisal_items` ADD CONSTRAINT `manager_appraisal_items_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `manager_appraisal_items` ADD CONSTRAINT `manager_appraisal_items_manager_appraisal_id_fkey` FOREIGN KEY (`manager_appraisal_id`) REFERENCES `manager_appraisals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `manager_appraisals` ADD CONSTRAINT `manager_appraisals_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `manager_appraisals` ADD CONSTRAINT `manager_appraisals_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `manager_appraisals` ADD CONSTRAINT `manager_appraisals_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meeting_participants` ADD CONSTRAINT `meeting_participants_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meeting_participants` ADD CONSTRAINT `meeting_participants_meeting_id_fkey` FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_cases` ADD CONSTRAINT `offboarding_cases_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_cases` ADD CONSTRAINT `offboarding_cases_finalized_by_fkey` FOREIGN KEY (`finalized_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_cases` ADD CONSTRAINT `offboarding_cases_started_by_fkey` FOREIGN KEY (`started_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_checklist_items` ADD CONSTRAINT `offboarding_checklist_items_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_checklist_items` ADD CONSTRAINT `offboarding_checklist_items_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `offboarding_cases`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_checklist_items` ADD CONSTRAINT `offboarding_checklist_items_cleared_by_fkey` FOREIGN KEY (`cleared_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_exit_interviews` ADD CONSTRAINT `offboarding_exit_interviews_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `offboarding_cases`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offboarding_exit_interviews` ADD CONSTRAINT `offboarding_exit_interviews_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `offer_letters` ADD CONSTRAINT `offer_letters_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `profiles`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_case_tasks` ADD CONSTRAINT `onboarding_case_tasks_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `onboarding_cases`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_case_tasks` ADD CONSTRAINT `onboarding_case_tasks_completed_by_fkey` FOREIGN KEY (`completed_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_case_tasks` ADD CONSTRAINT `onboarding_case_tasks_template_task_id_fkey` FOREIGN KEY (`template_task_id`) REFERENCES `onboarding_template_tasks`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `onboarding_templates`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_template_tasks` ADD CONSTRAINT `onboarding_template_tasks_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `onboarding_templates`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `onboarding_templates` ADD CONSTRAINT `onboarding_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payroll` ADD CONSTRAINT `payroll_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payroll` ADD CONSTRAINT `payroll_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `profiles`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `peer_feedback` ADD CONSTRAINT `peer_feedback_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `peer_feedback` ADD CONSTRAINT `peer_feedback_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `peer_feedback` ADD CONSTRAINT `peer_feedback_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `salary_revisions` ADD CONSTRAINT `salary_revisions_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `salary_revisions` ADD CONSTRAINT `salary_revisions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `salary_revisions` ADD CONSTRAINT `salary_revisions_initiated_by_fkey` FOREIGN KEY (`initiated_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `self_appraisal_items` ADD CONSTRAINT `self_appraisal_items_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `self_appraisal_items` ADD CONSTRAINT `self_appraisal_items_self_appraisal_id_fkey` FOREIGN KEY (`self_appraisal_id`) REFERENCES `self_appraisals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `self_appraisals` ADD CONSTRAINT `self_appraisals_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `self_appraisals` ADD CONSTRAINT `self_appraisals_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_response_id_fkey` FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `survey_questions` ADD CONSTRAINT `survey_questions_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_target_department_id_fkey` FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

