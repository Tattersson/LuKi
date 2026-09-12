import { auth } from "@/lib/auth/auth";
import { hasAnyRole, PLAYER_ROLE_NAME } from "@/lib/auth/rbac";
import { getCurrentPlayer } from "@/features/players/server/current-player";
import { listUpcomingPractices } from "@/features/practices/server/practice-repository";
import { getRsvpForPlayer, getRsvpSummary } from "@/features/practices/server/rsvp-repository";
import { PracticesSection } from "@/features/practices/ui/public/PracticesSection";
import type { Practice, RsvpData } from "@/features/practices/domain/types";

async function getUpcomingPracticesOrEmpty(): Promise<Practice[]> {
  try {
    return await listUpcomingPractices();
  } catch {
    return [];
  }
}

async function getRsvpDataByPracticeId(
  practices: Practice[],
): Promise<{ canRsvp: boolean; rsvpByPracticeId: Record<string, RsvpData> }> {
  const session = await auth();
  const canRsvp = hasAnyRole(session, [PLAYER_ROLE_NAME]);
  const player = canRsvp ? await getCurrentPlayer() : null;

  const entries = await Promise.all(
    practices.map(async (practice): Promise<[string, RsvpData]> => {
      const [summary, myStatus] = await Promise.all([
        getRsvpSummary(practice.id),
        player ? getRsvpForPlayer(practice.id, player.id) : Promise.resolve(null),
      ]);
      return [practice.id, { summary, myStatus }];
    }),
  );

  return { canRsvp, rsvpByPracticeId: Object.fromEntries(entries) };
}

export default async function PracticesPage() {
  const practices = await getUpcomingPracticesOrEmpty();
  const { canRsvp, rsvpByPracticeId } = await getRsvpDataByPracticeId(practices);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PracticesSection practices={practices} canRsvp={canRsvp} rsvpByPracticeId={rsvpByPracticeId} />
    </main>
  );
}
