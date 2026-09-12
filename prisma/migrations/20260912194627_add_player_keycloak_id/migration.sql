-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "keycloakId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Player_keycloakId_key" ON "Player"("keycloakId");
