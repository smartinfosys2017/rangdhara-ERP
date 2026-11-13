-- CreateTable
CREATE TABLE "IssueReceipt" (
    "id" TEXT NOT NULL,
    "ItemGroupid" VARCHAR(36) NOT NULL,
    "ItemMasterid" VARCHAR(36) NOT NULL,
    "ItemTypeid" VARCHAR(36) NOT NULL,
    "TransactionTypeid" VARCHAR(36) NOT NULL,
    "IssueDate" DATE NOT NULL,
    "Qty" INTEGER NOT NULL,
    "PreviousBalance" INTEGER NOT NULL DEFAULT 0,
    "Price" DECIMAL(12,2),
    "Particuler" TEXT,
    "Balance" INTEGER NOT NULL DEFAULT 0,
    "Issue_by" VARCHAR(36) NOT NULL,
    "GetPassNo" VARCHAR(100),
    "DateOfRecive" DATE,
    "ReciptChallanNo" VARCHAR(100),
    "RecivedBy" VARCHAR(36) NOT NULL,
    "Comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IssueReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IssueReceipt_ItemGroupid_idx" ON "IssueReceipt"("ItemGroupid");

-- CreateIndex
CREATE INDEX "IssueReceipt_ItemMasterid_idx" ON "IssueReceipt"("ItemMasterid");

-- CreateIndex
CREATE INDEX "IssueReceipt_ItemTypeid_idx" ON "IssueReceipt"("ItemTypeid");

-- CreateIndex
CREATE INDEX "IssueReceipt_TransactionTypeid_idx" ON "IssueReceipt"("TransactionTypeid");

-- CreateIndex
CREATE INDEX "IssueReceipt_Issue_by_idx" ON "IssueReceipt"("Issue_by");

-- CreateIndex
CREATE INDEX "IssueReceipt_RecivedBy_idx" ON "IssueReceipt"("RecivedBy");

-- CreateIndex
CREATE INDEX "IssueReceipt_IssueDate_idx" ON "IssueReceipt"("IssueDate");
