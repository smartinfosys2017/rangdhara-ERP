-- CreateTable
CREATE TABLE "employee_candidate_status" (
    "id" TEXT NOT NULL,
    "StatusName" VARCHAR(255) NOT NULL,
    "CategoryName" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "mode" VARCHAR(255) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "employee_candidate_status_pkey" PRIMARY KEY ("id")
);
