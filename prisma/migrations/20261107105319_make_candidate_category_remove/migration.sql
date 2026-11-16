/*
  Warnings:

  - You are about to drop the column `categoryId` on the `candidate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "candidate" DROP CONSTRAINT "candidate_categoryId_fkey";

-- DropIndex
DROP INDEX "candidate_categoryId_idx";

-- AlterTable
ALTER TABLE "candidate" DROP COLUMN "categoryId",
ADD COLUMN     "questionnaireCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_questionnaireCategoryId_fkey" FOREIGN KEY ("questionnaireCategoryId") REFERENCES "questionnaire_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
