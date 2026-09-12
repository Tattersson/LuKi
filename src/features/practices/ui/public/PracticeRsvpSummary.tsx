import Link from "next/link";
import type { RsvpStatus, RsvpSummary } from "../../domain/types";
import { RsvpButtons } from "./RsvpButtons";

/** Compact, counts-only summary for the practice list/calendar - the full IN/OUT
 *  name breakdown lives on the practice detail page instead. Counts (and RSVP'ing
 *  itself) are only ever shown to a signed-in visitor - the underlying data isn't
 *  even fetched for an anonymous one, see practices/page.tsx. */
export function PracticeRsvpSummary({
  practiceId,
  isSignedIn,
  canRsvp,
  summary,
  myStatus,
}: {
  practiceId: string;
  isSignedIn: boolean;
  canRsvp: boolean;
  summary: RsvpSummary;
  myStatus: RsvpStatus | null;
}) {
  if (!isSignedIn) {
    return (
      <div className="mt-2">
        <Link
          href="/api/auth/signin"
          className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          Sign in to view RSVP details
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span>
          Goalies IN: {summary.goalkeepers.in.length} · OUT: {summary.goalkeepers.out.length}
        </span>
        <span>
          Players IN: {summary.players.in.length} · OUT: {summary.players.out.length}
        </span>
      </div>

      <RsvpButtons practiceId={practiceId} canRsvp={canRsvp} myStatus={myStatus} size="md" fullWidth />
    </div>
  );
}
