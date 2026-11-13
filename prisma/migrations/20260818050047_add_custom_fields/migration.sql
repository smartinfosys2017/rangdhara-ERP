-- CreateTable
CREATE TABLE "CustomField" (
    "id" SERIAL NOT NULL,
    "fieldto" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "defaultValue" TEXT,
    "fieldOrder" INTEGER NOT NULL DEFAULT 0,
    "bsColumn" INTEGER NOT NULL DEFAULT 12,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "displayInline" BOOLEAN NOT NULL DEFAULT false,
    "onlyAdmin" BOOLEAN NOT NULL DEFAULT false,
    "disallowClientToEdit" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "showOnTable" BOOLEAN NOT NULL DEFAULT false,
    "showOnPdf" BOOLEAN NOT NULL DEFAULT false,
    "showOnClientPortal" BOOLEAN NOT NULL DEFAULT false,
    "showOnTicketForm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomField_fieldto_idx" ON "CustomField"("fieldto");

-- CreateIndex
CREATE INDEX "CustomField_type_idx" ON "CustomField"("type");

-- CreateIndex
CREATE INDEX "CustomField_fieldOrder_idx" ON "CustomField"("fieldOrder");
