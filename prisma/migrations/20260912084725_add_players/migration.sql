-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('MV', 'FW', 'D');

-- CreateEnum
CREATE TYPE "StickSide" AS ENUM ('LEFT', 'RIGHT');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" "PlayerPosition" NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "stickSide" "StickSide" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerOtpRequest" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerOtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerOtpSendLog" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerOtpSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE INDEX "PlayerOtpRequest_emailHash_consumedAt_expiresAt_idx" ON "PlayerOtpRequest"("emailHash", "consumedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "PlayerOtpSendLog_emailHash_createdAt_idx" ON "PlayerOtpSendLog"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerOtpSendLog_ipHash_createdAt_idx" ON "PlayerOtpSendLog"("ipHash", "createdAt");
