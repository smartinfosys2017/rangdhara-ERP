/*
  Warnings:

  - A unique constraint covering the columns `[empcode]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `empcode` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "empcode" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EmployeeCodeSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmployeeCodeSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_empcode_key" ON "Employee"("empcode");
