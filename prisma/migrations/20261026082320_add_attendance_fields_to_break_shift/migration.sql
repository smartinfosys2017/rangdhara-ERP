-- AlterTable
ALTER TABLE "BreakTime" ADD COLUMN     "breakType" VARCHAR(20) NOT NULL DEFAULT 'paid',
ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFlexible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "crossesMidnight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "earlyInMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fullDayMinutes" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "halfDayMinutes" INTEGER NOT NULL DEFAULT 240,
ADD COLUMN     "lateOutMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "BreakTime_breakType_idx" ON "BreakTime"("breakType");