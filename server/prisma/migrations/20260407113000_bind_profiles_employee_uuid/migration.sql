ALTER TABLE `profiles`
ADD COLUMN `employee_uuid` CHAR(36) NULL;

UPDATE `profiles` p
LEFT JOIN `employees` e_email
  ON LOWER(TRIM(e_email.`email`)) = LOWER(TRIM(p.`email`))
LEFT JOIN `employees` e_code
  ON p.`employee_id` IS NOT NULL
 AND e_code.`employee_id` IS NOT NULL
 AND LOWER(TRIM(e_code.`employee_id`)) = LOWER(TRIM(p.`employee_id`))
SET p.`employee_uuid` = COALESCE(p.`employee_uuid`, e_email.`id`, e_code.`id`)
WHERE p.`employee_uuid` IS NULL;

UPDATE `profiles` p
JOIN `employees` e
  ON p.`employee_uuid` = e.`id`
SET p.`employee_id` = e.`employee_id`
WHERE p.`employee_id` IS NULL
  AND e.`employee_id` IS NOT NULL;

ALTER TABLE `profiles`
ADD INDEX `idx_profiles_employee_uuid`(`employee_uuid`);

ALTER TABLE `profiles`
ADD CONSTRAINT `fk_profiles_employee_uuid`
FOREIGN KEY (`employee_uuid`) REFERENCES `employees`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;
