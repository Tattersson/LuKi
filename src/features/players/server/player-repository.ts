import { prisma } from "@/lib/db/prisma";
import { PlayerNotFoundError } from "../domain/errors";
import type { PlayerPosition, StickSide } from "../domain/types";

export async function listPlayers() {
  return prisma.player.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getPlayerById(id: string) {
  return prisma.player.findUnique({ where: { id } });
}

export async function countPlayers(): Promise<number> {
  return prisma.player.count();
}

/** Admin correction of a player's own details. Email is never editable here - it's
 *  only ever set once, via self-service verification. */
export async function updatePlayer(params: {
  playerId: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  heightCm: number | null;
  weightKg: number | null;
  stickSide: StickSide;
  birthDate: Date;
}) {
  const { playerId, ...data } = params;

  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });
  if (!existing) {
    throw new PlayerNotFoundError();
  }

  return prisma.player.update({ where: { id: playerId }, data });
}
