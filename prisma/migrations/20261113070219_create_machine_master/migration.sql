-- CreateTable
CREATE TABLE "machine_master" (
    "id" VARCHAR(36) NOT NULL,
    "machineNumber" VARCHAR(255) NOT NULL,
    "machineName" VARCHAR(255) NOT NULL,
    "machineCode" VARCHAR(25) NOT NULL,
    "ipAddress" VARCHAR(45),
    "GroupName" VARCHAR(255) NOT NULL,
    "comment" TEXT,
    "OperateId" VARCHAR(255) NOT NULL,
    "Specification" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "machine_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_item_details" (
    "id" VARCHAR(36) NOT NULL,
    "machineId" VARCHAR(36) NOT NULL,
    "SelectedGroupName" VARCHAR(255) NOT NULL,
    "Selecteditem" VARCHAR(255) NOT NULL,
    "itemUnit" VARCHAR(255) NOT NULL,
    "itemQty" VARCHAR(255) NOT NULL,
    "itemdescription" VARCHAR(255),
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "machine_item_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_change_log" (
    "id" VARCHAR(36) NOT NULL,
    "machineId" VARCHAR(36),
    "UserId" VARCHAR(36),
    "UserName" VARCHAR(255) NOT NULL,
    "Action" VARCHAR(50) NOT NULL,
    "Selecteditem" VARCHAR(255),
    "Details" TEXT,
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "machine_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_master_machineNumber_key" ON "machine_master"("machineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "machine_master_machineCode_key" ON "machine_master"("machineCode");

-- CreateIndex
CREATE INDEX "machine_master_machineName_idx" ON "machine_master"("machineName");

-- CreateIndex
CREATE INDEX "machine_master_OperateId_idx" ON "machine_master"("OperateId");

-- CreateIndex
CREATE INDEX "machine_master_status_idx" ON "machine_master"("status");

-- CreateIndex
CREATE INDEX "machine_master_deletedAt_idx" ON "machine_master"("deletedAt");

-- CreateIndex
CREATE INDEX "machine_item_details_machineId_idx" ON "machine_item_details"("machineId");

-- CreateIndex
CREATE INDEX "machine_item_details_SelectedGroupName_idx" ON "machine_item_details"("SelectedGroupName");

-- CreateIndex
CREATE INDEX "machine_item_details_Selecteditem_idx" ON "machine_item_details"("Selecteditem");

-- CreateIndex
CREATE INDEX "machine_item_details_deletedAt_idx" ON "machine_item_details"("deletedAt");

-- CreateIndex
CREATE INDEX "machine_change_log_machineId_idx" ON "machine_change_log"("machineId");

-- CreateIndex
CREATE INDEX "machine_change_log_UserId_idx" ON "machine_change_log"("UserId");

-- CreateIndex
CREATE INDEX "machine_change_log_Action_idx" ON "machine_change_log"("Action");

-- CreateIndex
CREATE INDEX "machine_change_log_createdAt_idx" ON "machine_change_log"("createdAt");

-- CreateIndex
CREATE INDEX "machine_change_log_deletedAt_idx" ON "machine_change_log"("deletedAt");

-- AddForeignKey
ALTER TABLE "machine_item_details" ADD CONSTRAINT "machine_item_details_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machine_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_change_log" ADD CONSTRAINT "machine_change_log_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machine_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
