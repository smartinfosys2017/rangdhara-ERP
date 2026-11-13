/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `CustomField` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `CustomField` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CustomField_fieldOrder_idx";

-- DropIndex
DROP INDEX "CustomField_fieldto_idx";

-- DropIndex
DROP INDEX "CustomField_type_idx";

-- AlterTable
ALTER TABLE "CustomField" ADD COLUMN     "slug" TEXT NOT NULL,
ALTER COLUMN "fieldOrder" DROP NOT NULL,
ALTER COLUMN "bsColumn" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" SERIAL NOT NULL,
    "customFieldId" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityType_entityId_idx" ON "CustomFieldValue"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_customFieldId_entityType_entityId_key" ON "CustomFieldValue"("customFieldId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_slug_key" ON "CustomField"("slug");

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
