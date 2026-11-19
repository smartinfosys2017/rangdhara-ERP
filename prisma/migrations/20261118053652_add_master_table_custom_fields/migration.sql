-- AlterTable
ALTER TABLE "PtoductType" ADD COLUMN     "customFields" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "customFields" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "item_groups" ADD COLUMN     "customFields" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "location" ADD COLUMN     "customFields" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "machine_change_log" ADD COLUMN     "customFields" JSONB DEFAULT '{}';
