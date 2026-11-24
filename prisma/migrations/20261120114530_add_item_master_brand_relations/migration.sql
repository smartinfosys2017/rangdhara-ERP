-- AlterTable
ALTER TABLE "IssueReceipt" ADD COLUMN     "FromId" VARCHAR(36),
ADD COLUMN     "FromType" VARCHAR(20),
ADD COLUMN     "ItemBrandid" VARCHAR(36),
ADD COLUMN     "ToId" VARCHAR(36),
ADD COLUMN     "ToType" VARCHAR(20);

-- CreateTable
CREATE TABLE "ItemMasterBrand" (
    "id" VARCHAR(36) NOT NULL,
    "ItemMasterid" TEXT NOT NULL,
    "ItemBrandid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMasterBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockBalance" (
    "id" VARCHAR(36) NOT NULL,
    "ItemMasterid" VARCHAR(36) NOT NULL,
    "ItemTypeid" VARCHAR(36) NOT NULL,
    "LocationType" VARCHAR(20) NOT NULL,
    "LocationId" VARCHAR(36) NOT NULL,
    "Quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockLedger" (
    "id" VARCHAR(36) NOT NULL,
    "IssueReceiptId" VARCHAR(36) NOT NULL,
    "ItemGroupid" VARCHAR(36) NOT NULL,
    "ItemMasterid" VARCHAR(36) NOT NULL,
    "ItemTypeid" VARCHAR(36) NOT NULL,
    "LocationType" VARCHAR(20) NOT NULL,
    "LocationId" VARCHAR(36) NOT NULL,
    "QtyIn" INTEGER NOT NULL DEFAULT 0,
    "QtyOut" INTEGER NOT NULL DEFAULT 0,
    "PreviousBalance" INTEGER NOT NULL DEFAULT 0,
    "Balance" INTEGER NOT NULL DEFAULT 0,
    "Price" DECIMAL(12,2),
    "TransactionDate" TIMESTAMP(3) NOT NULL,
    "Comment" TEXT,
    "createby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemMasterBrand_ItemMasterid_idx" ON "ItemMasterBrand"("ItemMasterid");

-- CreateIndex
CREATE INDEX "ItemMasterBrand_ItemBrandid_idx" ON "ItemMasterBrand"("ItemBrandid");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMasterBrand_ItemMasterid_ItemBrandid_key" ON "ItemMasterBrand"("ItemMasterid", "ItemBrandid");

-- CreateIndex
CREATE INDEX "InventoryStockBalance_ItemMasterid_idx" ON "InventoryStockBalance"("ItemMasterid");

-- CreateIndex
CREATE INDEX "InventoryStockBalance_LocationType_LocationId_idx" ON "InventoryStockBalance"("LocationType", "LocationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryStockBalance_ItemMasterid_ItemTypeid_LocationType__key" ON "InventoryStockBalance"("ItemMasterid", "ItemTypeid", "LocationType", "LocationId");

-- CreateIndex
CREATE INDEX "InventoryStockLedger_IssueReceiptId_idx" ON "InventoryStockLedger"("IssueReceiptId");

-- CreateIndex
CREATE INDEX "InventoryStockLedger_ItemMasterid_ItemTypeid_LocationType_L_idx" ON "InventoryStockLedger"("ItemMasterid", "ItemTypeid", "LocationType", "LocationId");

-- CreateIndex
CREATE INDEX "InventoryStockLedger_LocationType_LocationId_TransactionDat_idx" ON "InventoryStockLedger"("LocationType", "LocationId", "TransactionDate");

-- CreateIndex
CREATE INDEX "IssueReceipt_ItemBrandid_idx" ON "IssueReceipt"("ItemBrandid");

-- CreateIndex
CREATE INDEX "IssueReceipt_FromType_FromId_idx" ON "IssueReceipt"("FromType", "FromId");

-- CreateIndex
CREATE INDEX "IssueReceipt_ToType_ToId_idx" ON "IssueReceipt"("ToType", "ToId");

-- AddForeignKey
ALTER TABLE "ItemMasterBrand" ADD CONSTRAINT "ItemMasterBrand_ItemMasterid_fkey" FOREIGN KEY ("ItemMasterid") REFERENCES "ItemMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMasterBrand" ADD CONSTRAINT "ItemMasterBrand_ItemBrandid_fkey" FOREIGN KEY ("ItemBrandid") REFERENCES "BrandManufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
