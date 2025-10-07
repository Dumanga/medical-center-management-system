-- CreateTable
CREATE TABLE `SessionMedicine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SessionMedicine_medicineId_idx`(`medicineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SessionMedicine` ADD CONSTRAINT `SessionMedicine_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SessionMedicine` ADD CONSTRAINT `SessionMedicine_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `MedicineStock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
