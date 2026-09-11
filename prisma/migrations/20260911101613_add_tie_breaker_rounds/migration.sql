-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "sourceCandidateId" TEXT;

-- AlterTable
ALTER TABLE "Election" ADD COLUMN     "parentElectionId" TEXT,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tieBreakerPosition" "VotePosition",
ADD COLUMN     "tieBreakerSlots" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Election_parentElectionId_tieBreakerPosition_key" ON "Election"("parentElectionId", "tieBreakerPosition");

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_parentElectionId_fkey" FOREIGN KEY ("parentElectionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
