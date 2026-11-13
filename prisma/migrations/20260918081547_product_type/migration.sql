-- CreateTable
CREATE TABLE "PtoductType" (
    "id" TEXT NOT NULL,
    "ProductType" VARCHAR(255) NOT NULL,
    "Description" VARCHAR(255) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "PtoductType_pkey" PRIMARY KEY ("id")
);
