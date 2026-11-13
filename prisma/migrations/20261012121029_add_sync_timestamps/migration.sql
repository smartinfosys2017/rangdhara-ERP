-- AlterTable
ALTER TABLE "InventoryChangeLog" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "IssueReceipt" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);
