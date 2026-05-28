ALTER TABLE `surveys`
    ADD COLUMN IF NOT EXISTS `survey_type` TEXT NULL AFTER `deadline`;

CREATE TABLE IF NOT EXISTS `contact_submissions` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `company` VARCHAR(190) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
);

CREATE INDEX `idx_contact_submissions_created_at`
    ON `contact_submissions`(`created_at` DESC);
