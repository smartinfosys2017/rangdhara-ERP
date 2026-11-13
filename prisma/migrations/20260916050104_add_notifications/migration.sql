-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "entityName" TEXT,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "notificationKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSync" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_syncStatus_idx" ON "Notification"("syncStatus");

-- CreateIndex
CREATE INDEX "Notification_lastSyncedAt_idx" ON "Notification"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "Notification_deletedAt_idx" ON "Notification"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_notificationKey_key" ON "NotificationSetting"("userId", "notificationKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSync_eventId_key" ON "NotificationSync"("eventId");

-- CreateIndex
CREATE INDEX "NotificationSync_createdAt_idx" ON "NotificationSync"("createdAt");
