-- AlterTable
ALTER TABLE `attendance`
    ADD COLUMN `checkin_photo` TEXT NULL,
    ADD COLUMN `checkout_photo` TEXT NULL,
    ADD COLUMN `checkout_location` TEXT NULL;

-- CreateTable
CREATE TABLE `user_settings` (
    `profile_id` CHAR(36) NOT NULL,
    `attendance_reminder` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_settings_profile_id_idx` ON `user_settings`(`profile_id`);

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
