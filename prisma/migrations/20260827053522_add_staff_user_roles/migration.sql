-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdministrator" BOOLEAN NOT NULL DEFAULT false,
    "isNotStaff" BOOLEAN NOT NULL DEFAULT false,
    "profileImage" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "hourlyRate" DECIMAL(12,2) DEFAULT 0,
    "facebook" TEXT,
    "linkedin" TEXT,
    "skype" TEXT,
    "defaultLanguage" TEXT,
    "direction" TEXT,
    "timezone" TEXT,
    "emailSignature" TEXT,
    "sendWelcomeEmail" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUserRole" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE INDEX "StaffUser_isActive_idx" ON "StaffUser"("isActive");

-- CreateIndex
CREATE INDEX "StaffUser_isTrashed_idx" ON "StaffUser"("isTrashed");

-- CreateIndex
CREATE INDEX "StaffUser_firstName_idx" ON "StaffUser"("firstName");

-- CreateIndex
CREATE INDEX "StaffUser_lastName_idx" ON "StaffUser"("lastName");

-- CreateIndex
CREATE INDEX "StaffUserRole_staffUserId_idx" ON "StaffUserRole"("staffUserId");

-- CreateIndex
CREATE INDEX "StaffUserRole_roleId_idx" ON "StaffUserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUserRole_staffUserId_roleId_key" ON "StaffUserRole"("staffUserId", "roleId");
