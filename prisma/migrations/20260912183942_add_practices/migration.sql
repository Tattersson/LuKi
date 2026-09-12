-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL,
    "teamKey" TEXT NOT NULL,
    "title" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "description" TEXT,
    "seriesId" TEXT,
    "status" "PracticeStatus" NOT NULL DEFAULT 'SCHEDULED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeRsvp" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Practice_teamKey_startAt_idx" ON "Practice"("teamKey", "startAt");

-- CreateIndex
CREATE INDEX "Practice_seriesId_idx" ON "Practice"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeRsvp_practiceId_playerId_key" ON "PracticeRsvp"("practiceId", "playerId");

-- AddForeignKey
ALTER TABLE "PracticeRsvp" ADD CONSTRAINT "PracticeRsvp_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeRsvp" ADD CONSTRAINT "PracticeRsvp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
