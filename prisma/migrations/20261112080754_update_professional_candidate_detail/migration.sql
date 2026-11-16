/*
  Warnings:

  - You are about to drop the column `employmentStatus` on the `professional_candidate_detail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "professional_candidate_detail" DROP COLUMN "employmentStatus",
ADD COLUMN     "interviewConductedAt" TEXT,
ADD COLUMN     "salaryBeingDrawn" TEXT;
