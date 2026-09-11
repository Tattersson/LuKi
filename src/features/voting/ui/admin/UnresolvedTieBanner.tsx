"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startManualTieBreakerAction } from "../../server/actions";
import { POSITION_LABELS } from "../../constants";
import type { VotePosition } from "../../domain/types";

/**
 * Persistent reminder (unlike OpenCloseControls's just-closed modal) for a tie that
 * hit MAX_TIE_BREAKER_ROUNDS and was never auto-resolved - shown any time the admin
 * views the election, with the same manual "start another round" fallback action.
 */
export function UnresolvedTieBanner({
  electionId,
  positions,
}: {
  electionId: string;
  positions: VotePosition[];
}) {
  const router = useRouter();
  const [startingPosition, setStartingPosition] = useState<VotePosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(position: VotePosition) {
    setStartingPosition(position);
    setError(null);
    const result = await startManualTieBreakerAction({ electionId, position });
    setStartingPosition(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Alert variant="error">
      <div className="space-y-2">
        <p>
          {positions.map((p) => POSITION_LABELS[p]).join(" and ")} ended in a tie that
          wasn&apos;t automatically resolved (the tie-breaker round limit was reached). This
          needs manual resolution.
        </p>
        <div className="flex flex-wrap gap-2">
          {positions.map((position) => (
            <Button
              key={position}
              variant="secondary"
              disabled={startingPosition === position}
              onClick={() => handleStart(position)}
            >
              {startingPosition === position
                ? "Starting..."
                : `Start another round for ${POSITION_LABELS[position]}`}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm">{error}</p>}
      </div>
    </Alert>
  );
}
