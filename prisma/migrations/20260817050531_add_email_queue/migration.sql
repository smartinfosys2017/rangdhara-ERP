-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" SERIAL NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailQueue_status_idx" ON "EmailQueue"("status");

-- CreateIndex
CREATE INDEX "EmailQueue_createdAt_idx" ON "EmailQueue"("createdAt");
