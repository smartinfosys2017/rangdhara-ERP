-- AlterTable
ALTER TABLE "IssueReceipt" ADD COLUMN     "customFields" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "ItemMaster" ADD COLUMN     "customFields" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "ItemRates" ALTER COLUMN "customFields" SET DEFAULT '{}';
