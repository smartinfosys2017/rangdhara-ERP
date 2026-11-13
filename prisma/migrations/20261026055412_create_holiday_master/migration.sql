-- AlterTable
ALTER TABLE "EmailQueue" ALTER COLUMN "status" SET DEFAULT 'Pending';

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "description" VARCHAR(1000),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Holiday_name_idx" ON "Holiday"("name");

-- CreateIndex
CREATE INDEX "Holiday_fromDate_toDate_idx" ON "Holiday"("fromDate", "toDate");

-- CreateIndex
CREATE INDEX "Holiday_status_idx" ON "Holiday"("status");

-- CreateIndex
CREATE INDEX "Holiday_deletedAt_idx" ON "Holiday"("deletedAt");

-- CreateIndex
CREATE INDEX "Holiday_createdAt_idx" ON "Holiday"("createdAt");