-- Add explicit attendance date so sessions can be grouped by selected day
ALTER TABLE `attendance`
    ADD COLUMN `attendance_date` DATE NULL AFTER `employee_id`;

-- Backfill existing rows from the stored check-in timestamp
UPDATE `attendance`
SET `attendance_date` = DATE(`check_in`)
WHERE `attendance_date` IS NULL;

-- Make the column required for future writes after the backfill
ALTER TABLE `attendance`
    MODIFY `attendance_date` DATE NOT NULL;

CREATE INDEX `attendance_attendance_date_idx` ON `attendance`(`attendance_date`);