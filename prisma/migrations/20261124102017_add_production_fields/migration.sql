-- CreateTable
CREATE TABLE "Production" (
    "id" VARCHAR(36) NOT NULL,
    "productionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftId" VARCHAR(36),
    "machineId" VARCHAR(36),
    "itemId" VARCHAR(36),
    "productionQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "customFields" JSONB DEFAULT '{}',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "unitId" TEXT,

    CONSTRAINT "Production_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Production_productionDate_idx" ON "Production"("productionDate");

-- CreateIndex
CREATE INDEX "Production_shiftId_idx" ON "Production"("shiftId");

-- CreateIndex
CREATE INDEX "Production_machineId_idx" ON "Production"("machineId");

-- CreateIndex
CREATE INDEX "Production_itemId_idx" ON "Production"("itemId");

-- CreateIndex
CREATE INDEX "Production_status_idx" ON "Production"("status");

-- CreateIndex
CREATE INDEX "Production_deletedAt_idx" ON "Production"("deletedAt");

-- CreateIndex
CREATE INDEX "Production_createdAt_idx" ON "Production"("createdAt");

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machine_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
