-- CreateTable
CREATE TABLE "EstimateRequestForm" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicToken" VARCHAR(64) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 2,
    "language" TEXT NOT NULL DEFAULT 'english',
    "responsible" INTEGER,
    "submitButtonText" TEXT NOT NULL DEFAULT 'Submit',
    "submitButtonBgColor" TEXT NOT NULL DEFAULT '#84c529',
    "submitButtonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "submitAction" INTEGER NOT NULL DEFAULT 0,
    "successSubmitMessage" TEXT NOT NULL DEFAULT 'Thank You',
    "submitRedirectUrl" TEXT,
    "notifyRequestSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "notifyType" TEXT NOT NULL DEFAULT 'specific_staff',
    "notifyStaffIds" JSONB,
    "notifyRoleIds" JSONB,
    "fields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateRequestForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateRequest" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "publicToken" VARCHAR(64) NOT NULL,
    "data" JSONB NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstimateRequestForm_slug_key" ON "EstimateRequestForm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateRequestForm_publicToken_key" ON "EstimateRequestForm"("publicToken");

-- CreateIndex
CREATE INDEX "EstimateRequestForm_status_idx" ON "EstimateRequestForm"("status");

-- CreateIndex
CREATE INDEX "EstimateRequestForm_responsible_idx" ON "EstimateRequestForm"("responsible");

-- CreateIndex
CREATE INDEX "EstimateRequest_formId_idx" ON "EstimateRequest"("formId");

-- CreateIndex
CREATE INDEX "EstimateRequest_publicToken_idx" ON "EstimateRequest"("publicToken");

-- CreateIndex
CREATE INDEX "EstimateRequest_status_idx" ON "EstimateRequest"("status");
