-- AlterTable
ALTER TABLE "Tax" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncAt" TIMESTAMP(3);
