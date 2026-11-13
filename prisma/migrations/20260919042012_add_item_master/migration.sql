-- CreateTable
CREATE TABLE "ItemMaster" (
    "id" TEXT NOT NULL,
    "ItemGroupid" TEXT NOT NULL,
    "ItemName" VARCHAR(255) NOT NULL,
    "Description" VARCHAR(255),
    "openingBalance" VARCHAR(255),
    "Unitid" TEXT NOT NULL,
    "rather" INTEGER NOT NULL,
    "Tax1" TEXT NOT NULL,
    "Tax2" TEXT NOT NULL,
    "ApplicableForRelocateLevel" BOOLEAN NOT NULL DEFAULT false,
    "RelocateLevel" VARCHAR(255),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "ItemMaster_pkey" PRIMARY KEY ("id")
);
