-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "locationName" VARCHAR(255) NOT NULL,
    "locationCode" VARCHAR(25) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_locationCode_key" ON "location"("locationCode");
