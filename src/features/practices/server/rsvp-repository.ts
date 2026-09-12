import { prisma } from "@/lib/db/prisma";
import type { RsvpSummary } from "../domain/types";

/**
 * Read side only for now - built ahead of the write path (which needs member login,
 * see the practices feature's README-equivalent note in actions.ts) so it's ready to
 * wire into the public UI as soon as a member can be identified.
 */
export async function getRsvpSummary(practiceId: string): Promise<RsvpSummary> {
  const rows = await prisma.practiceRsvp.findMany({
    where: { practiceId },
    select: { status: true, player: { select: { position: true } } },
  });

  const summary: RsvpSummary = {
    goalkeepers: { in: 0, out: 0 },
    players: { in: 0, out: 0 },
  };

  for (const row of rows) {
    const bucket = row.player.position === "MV" ? summary.goalkeepers : summary.players;
    if (row.status === "IN") bucket.in += 1;
    else bucket.out += 1;
  }

  return summary;
}
