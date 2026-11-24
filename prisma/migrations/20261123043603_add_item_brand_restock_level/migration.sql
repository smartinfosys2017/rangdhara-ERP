/*
  Warnings:

  - You are about to alter the column `ItemMasterid` on the `ItemMasterBrand` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(36)`.
  - You are about to alter the column `ItemBrandid` on the `ItemMasterBrand` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(36)`.

*/
-- DropForeignKey
ALTER TABLE "ItemMasterBrand" DROP CONSTRAINT "ItemMasterBrand_ItemBrandid_fkey";

-- DropForeignKey
ALTER TABLE "ItemMasterBrand" DROP CONSTRAINT "ItemMasterBrand_ItemMasterid_fkey";

-- AlterTable
ALTER TABLE "ItemMaster" ADD COLUMN     "RestockLevelType" VARCHAR(20) NOT NULL DEFAULT 'ITEM';

-- AlterTable
ALTER TABLE "ItemMasterBrand" ADD COLUMN     "RestockLevel" VARCHAR(255),
ALTER COLUMN "ItemMasterid" SET DATA TYPE VARCHAR(36),
ALTER COLUMN "ItemBrandid" SET DATA TYPE VARCHAR(36);

-- AddForeignKey
ALTER TABLE "ItemMasterBrand" ADD CONSTRAINT "ItemMasterBrand_ItemMasterid_fkey" FOREIGN KEY ("ItemMasterid") REFERENCES "ItemMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMasterBrand" ADD CONSTRAINT "ItemMasterBrand_ItemBrandid_fkey" FOREIGN KEY ("ItemBrandid") REFERENCES "BrandManufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
