/*
  Warnings:

  - The primary key for the `CustomField` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "CustomFieldValue" DROP CONSTRAINT "CustomFieldValue_customFieldId_fkey";

-- AlterTable
ALTER TABLE "CustomField" DROP CONSTRAINT "CustomField_pkey",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CustomField_id_seq";

-- AlterTable
ALTER TABLE "CustomFieldValue" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ALTER COLUMN "customFieldId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Customer_sync" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
