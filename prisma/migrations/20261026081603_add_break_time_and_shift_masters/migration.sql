-- CreateTable
CREATE TABLE "BreakTime" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fromTime" VARCHAR(5) NOT NULL,
    "toTime" VARCHAR(5) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "BreakTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "inTime" VARCHAR(5) NOT NULL,
    "outTime" VARCHAR(5) NOT NULL,
    "graceTime" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(1000),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreakTime_name_idx" ON "BreakTime"("name");

-- CreateIndex
CREATE INDEX "BreakTime_status_idx" ON "BreakTime"("status");

-- CreateIndex
CREATE INDEX "BreakTime_deletedAt_idx" ON "BreakTime"("deletedAt");

-- CreateIndex
CREATE INDEX "BreakTime_createdAt_idx" ON "BreakTime"("createdAt");

-- CreateIndex
CREATE INDEX "Shift_name_idx" ON "Shift"("name");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "Shift_deletedAt_idx" ON "Shift"("deletedAt");

-- CreateIndex
CREATE INDEX "Shift_createdAt_idx" ON "Shift"("createdAt");