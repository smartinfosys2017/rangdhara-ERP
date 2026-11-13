-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150),
    "path" VARCHAR(255),
    "icon" VARCHAR(100),
    "parentId" TEXT,
    "module" VARCHAR(100),
    "permission" VARCHAR(150),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "menuType" VARCHAR(30) NOT NULL DEFAULT 'item',
    "target" VARCHAR(20) NOT NULL DEFAULT '_self',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Menu_parentId_idx" ON "Menu"("parentId");

-- CreateIndex
CREATE INDEX "Menu_module_idx" ON "Menu"("module");

-- CreateIndex
CREATE INDEX "Menu_sortOrder_idx" ON "Menu"("sortOrder");

-- CreateIndex
CREATE INDEX "Menu_status_idx" ON "Menu"("status");

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
