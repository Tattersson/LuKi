import type { RsvpStatus, RsvpSummary } from "../../domain/types";
import { RsvpButtons } from "./RsvpButtons";

/** Compact, counts-only summary for the practice list/calendar - the full IN/OUT
 *  name breakdown lives on the practice detail page instead. */
export function PracticeRsvpSummary({
  practiceId,
  canRsvp,
  summary,
  myStatus,
}: {
  practiceId: string;
  canRsvp: boolean;
  summary: RsvpSummary;
  myStatus: RsvpStatus | null;
}) {
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
