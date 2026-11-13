-- CreateTable
CREATE TABLE "ExtensionModule" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "author" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "icon" TEXT NOT NULL DEFAULT 'element-11',
    "urlPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExtensionModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionModule_alias_key" ON "ExtensionModule"("alias");
