-- CreateTable
CREATE TABLE "followup_candidate_detail" (
    "id" TEXT NOT NULL,
    "followupDate" TIMESTAMP(3),
    "followupResponse" TEXT,
    "appointmentDate" TIMESTAMP(3),
    "appointmentResponse" TEXT,
    "interviewConductedBy" TEXT,
    "mode" TEXT,
    "status" TEXT,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "followup_candidate_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_candidate_detail" (
    "id" TEXT NOT NULL,
    "questionCategory" TEXT NOT NULL,
    "questionName" TEXT NOT NULL,
    "questionnaireID" TEXT NOT NULL,
    "questionAnswer" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "questionnaire_candidate_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "followup_candidate_detail_candidateId_key" ON "followup_candidate_detail"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_candidate_detail_candidateId_key" ON "questionnaire_candidate_detail"("candidateId");

-- AddForeignKey
ALTER TABLE "followup_candidate_detail" ADD CONSTRAINT "followup_candidate_detail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_candidate_detail" ADD CONSTRAINT "questionnaire_candidate_detail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
