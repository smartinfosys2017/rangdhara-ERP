-- CreateTable
CREATE TABLE "professional_candidate_detail" (
    "id" TEXT NOT NULL,
    "appliedDate" TEXT,
    "applyForPost" TEXT,
    "totalExperience" TEXT,
    "employmentStatus" TEXT,
    "skills" JSONB,
    "referenceName" TEXT,
    "remarks" TEXT,
    "previousEmployeeDetails" JSONB,
    "documentDetails" JSONB,
    "customFields" JSONB,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "professional_candidate_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_candidate_detail_candidateId_key" ON "professional_candidate_detail"("candidateId");

-- AddForeignKey
ALTER TABLE "professional_candidate_detail" ADD CONSTRAINT "professional_candidate_detail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
