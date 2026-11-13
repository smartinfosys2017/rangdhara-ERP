/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `StaffUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "bloodGroup" TEXT,
    "emailId" TEXT,
    "maritalStatus" TEXT,
    "mobile" TEXT,
    "profilePic" TEXT,
    "signature" TEXT,
    "qualifiedForInterview" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "correspondenceAddress" TEXT,
    "correspondenceCity" TEXT,
    "correspondenceState" TEXT,
    "correspondenceCountry" TEXT,
    "correspondencePincode" TEXT,
    "permanentAddress" TEXT,
    "permanentCity" TEXT,
    "permanentState" TEXT,
    "permanentCountry" TEXT,
    "permanentPincode" TEXT,
    "permanentSameAsCorrespondence" BOOLEAN NOT NULL DEFAULT false,
    "resignationDate" TIMESTAMP(3),
    "leavingDate" TIMESTAMP(3),
    "reasonToLeave" TEXT,
    "educationDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_emailId_key" ON "Employee"("emailId");

-- CreateIndex
CREATE INDEX "Employee_firstName_idx" ON "Employee"("firstName");

-- CreateIndex
CREATE INDEX "Employee_lastName_idx" ON "Employee"("lastName");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_userId_idx" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_correspondenceCity_idx" ON "Employee"("correspondenceCity");

-- CreateIndex
CREATE INDEX "Employee_permanentCity_idx" ON "Employee"("permanentCity");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_userId_key" ON "StaffUser"("userId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
