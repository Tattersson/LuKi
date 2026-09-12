import { prisma } from "@/lib/db/prisma";
import { playerDisplayName } from "@/features/players/format";
import { PracticeNotFoundError } from "../domain/errors";
import type { RsvpStatus, RsvpSummary } from "../domain/types";

/**
 * Read side only for now - built ahead of the write path (which needs member login,
 * see the practices feature's README-equivalent note in actions.ts) so it's ready to
 * wire into the public UI as soon as a member can be identified.
 */
export async function getRsvpSummary(practiceId: string): Promise<RsvpSummary> {
  const rows = await prisma.practiceRsvp.findMany({
    where: { practiceId },
    select: {
      status: true,
      player: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
    orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
  });

  const summary: RsvpSummary = {
    goalkeepers: { in: [], out: [] },
    players: { in: [], out: [] },
  };

  for (const row of rows) {
    const bucket = row.player.position === "MV" ? summary.goalkeepers : summary.players;
    const list = row.status === "IN" ? bucket.in : bucket.out;
    list.push({ playerId: row.player.id, displayName: playerDisplayName(row.player) });
  }

  return summary;
}

export async function getRsvpForPlayer(
  practiceId: string,
  playerId: string,
): Promise<RsvpStatus | null> {
  const row = await prisma.practiceRsvp.findUnique({
    where: { practiceId_playerId: { practiceId, playerId } },
    select: { status: true },
  });
  return row?.status ?? null;
}

/** Rejects RSVPs on a cancelled practice; otherwise creates or updates the player's
 *  RSVP for it. */
export async function upsertRsvp(params: {
  practiceId: string;
  playerId: string;
  status: RsvpStatus;
}): Promise<void> {
  const practice = await prisma.practice.findUnique({
    where: { id: params.practiceId },
    select: { status: true },
  });
  if (!practice || practice.status === "CANCELLED") {
    throw new PracticeNotFoundError();
  }

  await prisma.practiceRsvp.upsert({
    where: { practiceId_playerId: { practiceId: params.practiceId, playerId: params.playerId } },
    create: params,
    update: { status: params.status },
  });
}
