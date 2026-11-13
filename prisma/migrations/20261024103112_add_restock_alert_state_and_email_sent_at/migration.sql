-- AlterTable
ALTER TABLE "EmailQueue" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RestockAlertState" (
    "id" TEXT NOT NULL,
    "itemMasterId" TEXT NOT NULL,
    "isBelowRestock" BOOLEAN NOT NULL DEFAULT false,
    "lastTriggeredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestockAlertState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestockAlertState_itemMasterId_key" ON "RestockAlertState"("itemMasterId");

-- CreateIndex
CREATE INDEX "RestockAlertState_isBelowRestock_idx" ON "RestockAlertState"("isBelowRestock");
