-- CreateTable
CREATE TABLE "InventoryChangeLog" (
    "id" TEXT NOT NULL,
    "IssueReceiptId" VARCHAR(36),
    "UserId" VARCHAR(36),
    "UserName" VARCHAR(255) NOT NULL,
    "Action" VARCHAR(50) NOT NULL,
    "ItemMasterid" VARCHAR(36),
    "ItemName" VARCHAR(255),
    "ItemTypeid" VARCHAR(36),
    "ItemType" VARCHAR(255),
    "Details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryChangeLog_IssueReceiptId_idx" ON "InventoryChangeLog"("IssueReceiptId");

-- CreateIndex
CREATE INDEX "InventoryChangeLog_UserId_idx" ON "InventoryChangeLog"("UserId");

-- CreateIndex
CREATE INDEX "InventoryChangeLog_ItemMasterid_idx" ON "InventoryChangeLog"("ItemMasterid");

-- CreateIndex
CREATE INDEX "InventoryChangeLog_ItemTypeid_idx" ON "InventoryChangeLog"("ItemTypeid");

-- CreateIndex
CREATE INDEX "InventoryChangeLog_Action_idx" ON "InventoryChangeLog"("Action");

-- CreateIndex
CREATE INDEX "InventoryChangeLog_createdAt_idx" ON "InventoryChangeLog"("createdAt");
