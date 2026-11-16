-- CreateTable
CREATE TABLE "questionnaire_type" (
    "id" TEXT NOT NULL,
    "typeName" VARCHAR(255) NOT NULL,
    "questionnaireCategoryId" TEXT NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "questionnaire_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "questionName" VARCHAR(255) NOT NULL,
    "questionnaireTypeId" TEXT NOT NULL,
    "question" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_answer_candidate" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "question_answer_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "bloodGroup" TEXT,
    "emailId" TEXT,
    "maritalStatus" TEXT,
    "mobile" TEXT,
    "profilePic" TEXT,
    "signature" TEXT,
    "qualifiedForInterview" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "correspondenceAddress" TEXT,
    "correspondenceCity" TEXT,
    "correspondenceState" TEXT,
    "correspondenceCountry" TEXT,
    "correspondencePincode" TEXT,
    "permanentAddress" TEXT,
    "permanentCity" TEXT,
    "permanentState" TEXT,
    "permanentCountry" TEXT,
    "permanentPincode" TEXT,
    "permanentSameAsCorrespondence" BOOLEAN NOT NULL DEFAULT false,
    "resignationDate" TIMESTAMP(3),
    "leavingDate" TIMESTAMP(3),
    "reasonToLeave" TEXT,
    "educationDetails" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questionnaire_type_questionnaireCategoryId_idx" ON "questionnaire_type"("questionnaireCategoryId");

-- CreateIndex
CREATE INDEX "question_questionnaireTypeId_idx" ON "question"("questionnaireTypeId");

-- CreateIndex
CREATE INDEX "question_answer_candidate_questionId_idx" ON "question_answer_candidate"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_emailId_key" ON "candidate"("emailId");

-- CreateIndex
CREATE INDEX "candidate_categoryId_idx" ON "candidate"("categoryId");

-- AddForeignKey
ALTER TABLE "questionnaire_type" ADD CONSTRAINT "questionnaire_type_questionnaireCategoryId_fkey" FOREIGN KEY ("questionnaireCategoryId") REFERENCES "questionnaire_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_questionnaireTypeId_fkey" FOREIGN KEY ("questionnaireTypeId") REFERENCES "questionnaire_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_answer_candidate" ADD CONSTRAINT "question_answer_candidate_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "questionnaire_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
