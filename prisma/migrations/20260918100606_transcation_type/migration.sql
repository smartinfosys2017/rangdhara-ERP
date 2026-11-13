-- CreateEnum
CREATE TYPE "EffectOnTransaction" AS ENUM ('addition', 'deductions');

-- CreateTable
CREATE TABLE "TransactionType" (
    "id" TEXT NOT NULL,
    "TransactionType" VARCHAR(255) NOT NULL,
    "Description" VARCHAR(255) NOT NULL,
    "EffectOnTransaction" "EffectOnTransaction" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "TransactionType_pkey" PRIMARY KEY ("id")
);
