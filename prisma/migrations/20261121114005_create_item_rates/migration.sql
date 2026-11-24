-- CreateTable
CREATE TABLE "ItemRates" (
    "id" VARCHAR(36) NOT NULL,
    "ItemGroupid" TEXT NOT NULL,
    "ItemMasterid" VARCHAR(36) NOT NULL,
    "BrandManufacturerid" TEXT NOT NULL,
    "ItemConditionid" TEXT NOT NULL,
    "ApplicableFromDate" TIMESTAMP(3) NOT NULL,
    "ApplicableToDate" TIMESTAMP(3),
    "Rate" DOUBLE PRECISION NOT NULL,
    "Unitid" TEXT NOT NULL,
    "Comments" TEXT,
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "customFields" JSONB,

    CONSTRAINT "ItemRates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemRates_ItemGroupid_idx" ON "ItemRates"("ItemGroupid");

-- CreateIndex
CREATE INDEX "ItemRates_ItemMasterid_idx" ON "ItemRates"("ItemMasterid");

-- CreateIndex
CREATE INDEX "ItemRates_BrandManufacturerid_idx" ON "ItemRates"("BrandManufacturerid");

-- CreateIndex
CREATE INDEX "ItemRates_ItemConditionid_idx" ON "ItemRates"("ItemConditionid");

-- CreateIndex
CREATE INDEX "ItemRates_Unitid_idx" ON "ItemRates"("Unitid");

-- CreateIndex
CREATE INDEX "ItemRates_ApplicableFromDate_idx" ON "ItemRates"("ApplicableFromDate");
