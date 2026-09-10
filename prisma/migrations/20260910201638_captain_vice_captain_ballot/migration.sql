/*
  Warnings:

  - You are about to drop the column `maxVotesPerVoter` on the `Election` table. All the data in the column will be lost.
  - Added the required column `position` to the `Vote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `VotedEmail` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VotePosition" AS ENUM ('CAPTAIN', 'VICE_CAPTAIN');

-- AlterTable
ALTER TABLE "Election" DROP COLUMN "maxVotesPerVoter",
ADD COLUMN     "closesAt" TIMESTAMP(3),
ADD COLUMN     "resultsEmailSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "position" "VotePosition" NOT NULL;

-- AlterTable
ALTER TABLE "VotedEmail" ADD COLUMN     "email" TEXT NOT NULL;
