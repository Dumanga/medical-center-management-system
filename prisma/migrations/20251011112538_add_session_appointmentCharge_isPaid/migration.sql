-- AlterTable (split into two statements for compatibility)
ALTER TABLE Session ADD COLUMN appointmentCharge DECIMAL(10, 2) NULL;
ALTER TABLE Session ADD COLUMN isPaid TINYINT(1) NOT NULL DEFAULT 0;
