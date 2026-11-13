-- CreateTable
CREATE TABLE "employee_family_detail" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fatherName" TEXT,
    "fatherDateOfBirth" TIMESTAMP(3),
    "fatherOccupation" TEXT,
    "motherName" TEXT,
    "motherDateOfBirth" TIMESTAMP(3),
    "motherOccupation" TEXT,
    "spouseName" TEXT,
    "spouseDateOfBirth" TIMESTAMP(3),
    "spouseOccupation" TEXT,
    "mobile" TEXT,
    "childrenDetails" JSONB,
    "noOfDependents" INTEGER NOT NULL DEFAULT 0,
    "nomineeName" TEXT,
    "nomineeRelationship" TEXT,
    "importantDates" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "employee_family_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_detail" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "experienceAsOn" TIMESTAMP(3),
    "joinDate" TIMESTAMP(3),
    "jobLocation" TEXT,
    "jobType" TEXT,
    "employmentStatus" TEXT,
    "shift" TEXT,
    "breakTime" TEXT,
    "skills" JSONB,
    "referenceName" TEXT,
    "probationPeriod" INTEGER,
    "appraisalApplicable" BOOLEAN NOT NULL DEFAULT false,
    "noticePeriod" INTEGER,
    "bankDetails" JSONB,
    "remarks" TEXT,
    "agreementSigningDate" TIMESTAMP(3),
    "security" TEXT,
    "previousEmployeeDetails" JSONB,
    "documentDetails" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "professional_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_detail" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "checklist_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_family_detail_employeeId_key" ON "employee_family_detail"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_detail_employeeId_key" ON "professional_detail"("employeeId");

-- CreateIndex
CREATE INDEX "checklist_detail_employeeId_idx" ON "checklist_detail"("employeeId");

-- CreateIndex
CREATE INDEX "checklist_detail_checklistId_idx" ON "checklist_detail"("checklistId");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_detail_employeeId_checklistId_key" ON "checklist_detail"("employeeId", "checklistId");

-- AddForeignKey
ALTER TABLE "employee_family_detail" ADD CONSTRAINT "employee_family_detail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_detail" ADD CONSTRAINT "professional_detail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_detail" ADD CONSTRAINT "checklist_detail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_detail" ADD CONSTRAINT "checklist_detail_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklistitem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
