-- CreateTable
CREATE TABLE "BrandManufacturer" (
    "id" TEXT NOT NULL,
    "brandName" VARCHAR(255) NOT NULL,
    "manufacturerName" VARCHAR(255) NOT NULL,
    "websiteURL" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createby" TEXT,
    "updateby" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "customFields" JSONB DEFAULT '{}',

    CONSTRAINT "BrandManufacturer_pkey" PRIMARY KEY ("id")
);
