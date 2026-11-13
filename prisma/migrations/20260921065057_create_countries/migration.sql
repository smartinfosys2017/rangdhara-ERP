/*
  Warnings:

  - The primary key for the `countries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `countries` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `countries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - A unique constraint covering the columns `[iso2]` on the table `countries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[iso3]` on the table `countries` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `iso2` to the `countries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iso3` to the `countries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `countries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "countries" DROP CONSTRAINT "countries_pkey",
DROP COLUMN "code",
DROP COLUMN "status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currencyCode" CHAR(3),
ADD COLUMN     "currencyName" VARCHAR(100),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "iso2" CHAR(2) NOT NULL,
ADD COLUMN     "iso3" CHAR(3) NOT NULL,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "phoneCode" VARCHAR(10),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(150),
ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "countries_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso3_key" ON "countries"("iso3");

-- CreateIndex
CREATE INDEX "countries_name_idx" ON "countries"("name");

-- CreateIndex
CREATE INDEX "countries_isActive_idx" ON "countries"("isActive");

-- CreateIndex
CREATE INDEX "countries_updatedAt_idx" ON "countries"("updatedAt");
