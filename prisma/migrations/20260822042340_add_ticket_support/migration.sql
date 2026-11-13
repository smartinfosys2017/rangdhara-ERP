-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "contactId" INTEGER,
    "userId" INTEGER,
    "name" TEXT,
    "email" TEXT,
    "department" TEXT,
    "cc" TEXT,
    "tags" TEXT,
    "assigned" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "service" TEXT,
    "projectId" INTEGER,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customFields" JSONB,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_contactId_idx" ON "Ticket"("contactId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_assigned_idx" ON "Ticket"("assigned");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
