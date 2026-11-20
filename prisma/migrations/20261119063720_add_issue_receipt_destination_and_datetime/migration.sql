/*
  Warnings:

  - A unique constraint covering the columns `[ItemName,ItemConditionid]` on the table `ItemMaster` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IssueReceipt" ADD COLUMN     "DestinationId" VARCHAR(36),
ADD COLUMN     "DestinationType" VARCHAR(20),
ADD COLUMN     "PurchaseDate" TIMESTAMP(3),
ADD COLUMN     "PurchaseNo" TEXT,
ADD COLUMN     "ReceiptDate" TIMESTAMP(3),
ADD COLUMN     "RequisitionSupplyDate" TIMESTAMP(3),
ADD COLUMN     "RequisitionSupplyNo" TEXT,
ALTER COLUMN "IssueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ReciptChallanNo" SET DATA TYPE TEXT,
ALTER COLUMN "RecivedBy" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "IssueReceipt_DestinationType_DestinationId_idx" ON "IssueReceipt"("DestinationType", "DestinationId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaster_ItemName_ItemConditionid_key" ON "ItemMaster"("ItemName", "ItemConditionid");
