import { POSITION_LABELS } from "../../constants";
import type { VotePosition } from "../../domain/types";

export function ElectionRoundBadge({
  round,
  tieBreakerPosition,
}: {
  round: number;
  tieBreakerPosition: VotePosition | null;
}) {
  if (round <= 1) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
      Round {round}
      {tieBreakerPosition && ` · ${POSITION_LABELS[tieBreakerPosition]} tie-breaker`}
    </span>
  );
}
