/*
  Warnings:

  - A unique constraint covering the columns `[SKU]` on the table `ItemMaster` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[Barcode]` on the table `ItemMaster` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ItemMaster" ADD COLUMN     "Barcode" VARCHAR(100),
ADD COLUMN     "SKU" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaster_SKU_key" ON "ItemMaster"("SKU");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaster_Barcode_key" ON "ItemMaster"("Barcode");
