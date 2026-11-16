-- CreateTable
CREATE TABLE "questionnaire_category" (
    "id" TEXT NOT NULL,
    "categoryName" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "questionnaire_category_pkey" PRIMARY KEY ("id")
);
