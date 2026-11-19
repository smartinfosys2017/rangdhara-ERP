/*
  Warnings:

  - You are about to drop the column `Machineid` on the `ItemMaster` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ItemMaster" DROP COLUMN "Machineid",
ADD COLUMN     "ItemConditionid" TEXT;
