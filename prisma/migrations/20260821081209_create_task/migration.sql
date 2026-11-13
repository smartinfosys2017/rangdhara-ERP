-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(12,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 2,
    "repeatEvery" TEXT,
    "repeatEveryCustom" INTEGER,
    "repeatTypeCustom" TEXT,
    "cycles" INTEGER,
    "unlimitedCycles" BOOLEAN NOT NULL DEFAULT true,
    "relType" TEXT,
    "relId" INTEGER,
    "assignees" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "followers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customField" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_name_idx" ON "Task"("name");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_startDate_idx" ON "Task"("startDate");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_relType_idx" ON "Task"("relType");

-- CreateIndex
CREATE INDEX "Task_relId_idx" ON "Task"("relId");
