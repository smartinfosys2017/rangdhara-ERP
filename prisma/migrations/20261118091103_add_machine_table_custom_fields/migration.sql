/*
  Warnings:

  - You are about to drop the column `customFields` on the `machine_change_log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "machine_change_log" DROP COLUMN "customFields";

-- AlterTable
ALTER TABLE "machine_master" ADD COLUMN     "customFields" JSONB DEFAULT '{}';
