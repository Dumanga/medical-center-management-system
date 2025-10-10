-- AlterTable
-- MySQL on Linux can be case-sensitive for table names; the model is `Appointment`
ALTER TABLE `Appointment` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';
