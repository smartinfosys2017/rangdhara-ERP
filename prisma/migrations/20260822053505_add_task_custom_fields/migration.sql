/*
  Warnings:

  - You are about to drop the column `customField` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "customField",
ADD COLUMN     "customFields" JSONB;
