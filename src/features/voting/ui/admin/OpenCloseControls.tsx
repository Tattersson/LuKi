"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  openElectionAction,
  closeElectionAction,
  startManualTieBreakerAction,
} from "../../server/actions";
import { POSITION_LABELS } from "../../constants";
import type { ElectionStatus, VotePosition } from "../../domain/types";
import type { TieOutcome } from "../../server/tie-breaker-service";

export function OpenCloseControls({
  electionId,
  status,
}: {
  electionId: string;
  status: ElectionStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [ties, setTies] = useState<TieOutcome[] | null>(null);
  const [startingPosition, setStartingPosition] = useState<VotePosition | null>(null);

  async function handleOpen() {
    setPending(true);
    await openElectionAction(electionId);
    setPending(false);
    router.refresh();
  }

  async function handleClose() {
    setPending(true);
    const result = await closeElectionAction(electionId);
    setPending(false);
    router.refresh();
    if (result.ok && result.data.ties.length > 0) {
      setTies(result.data.ties);
    }
  }

  async function handleStartAnotherRound(position: VotePosition) {
    setStartingPosition(position);
    const result = await startManualTieBreakerAction({ electionId, position });
    setStartingPosition(null);
    if (result.ok) {
      setTies((current) =>
        current?.map((t) =>
          t.position === position ? { ...t, created: true, roundId: result.data.id } : t,
        ) ?? null,
      );
      router.refresh();
    }
  }

  return (
    <>
      {status === "DRAFT" && (
        <Button onClick={handleOpen} disabled={pending}>
          {pending ? "Opening..." : "Open voting"}
        </Button>
      )}
      {status === "OPEN" && (
        <Button variant="danger" onClick={handleClose} disabled={pending}>
          {pending ? "Closing..." : "Close voting"}
        </Button>
      )}

      <Modal open={ties !== null} onClose={() => setTies(null)} title="The results are tied">
        <div className="space-y-4">
          {ties?.map((tie) => (
            <div
              key={tie.position}
              className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <p className="mb-2">
                <strong>{POSITION_LABELS[tie.position]}</strong> ended in a tie between{" "}
                {tie.tiedCandidateNames.join(", ")}. Another round of voting is needed to decide
                it.
              </p>
              {tie.created ? (
                tie.roundId ? (
                  <Link href={`/admin/elections/${tie.roundId}`} className="text-sm underline">
                    View the new round →
                  </Link>
                ) : (
                  <p className="text-xs text-neutral-500">
                    A new round has been created and voters have been emailed.
                  </p>
                )
              ) : (
                <Button
                  variant="secondary"
                  disabled={startingPosition === tie.position}
                  onClick={() => handleStartAnotherRound(tie.position)}
                >
                  {startingPosition === tie.position ? "Starting..." : "Start another round"}
                </Button>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={() => setTies(null)} className="w-full">
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}
