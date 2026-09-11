"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MAX_VICE_CAPTAIN_VOTES } from "../../constants";
import type { CandidateView, VotePosition } from "../../domain/types";

export function VoteStep({
  candidates,
  tieBreakerPosition,
  tieBreakerSlots,
  onSubmit,
  pending,
  error,
}: {
  candidates: CandidateView[];
  tieBreakerPosition: VotePosition | null;
  tieBreakerSlots: number | null;
  onSubmit: (params: {
    captainCandidateId?: string;
    viceCaptainCandidateIds: string[];
  }) => void;
  pending: boolean;
  error: string | null;
}) {
  const showCaptain = tieBreakerPosition !== "VICE_CAPTAIN";
  const showViceCaptain = tieBreakerPosition !== "CAPTAIN";
  const viceCaptainLimit =
    tieBreakerPosition === "VICE_CAPTAIN" ? (tieBreakerSlots ?? 1) : MAX_VICE_CAPTAIN_VOTES;
  // In a normal election, up to viceCaptainLimit VC picks are allowed but none are
  // required; a Vice-Captain tie-breaker exists specifically to fill open seats, so
  // at least one pick is required there.
  const viceCaptainRequired = tieBreakerPosition === "VICE_CAPTAIN";

  const [captainId, setCaptainId] = useState<string>("");
  const [viceCaptainIds, setViceCaptainIds] = useState<string[]>([]);
  const atLimit = viceCaptainIds.length >= viceCaptainLimit;

  function toggleViceCaptain(candidateId: string) {
    setViceCaptainIds((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }
      if (current.length >= viceCaptainLimit) {
        return current;
      }
      return [...current, candidateId];
    });
  }

  const canSubmit =
    (!showCaptain || captainId) && (!viceCaptainRequired || viceCaptainIds.length >= 1);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          captainCandidateId: showCaptain ? captainId : undefined,
          viceCaptainCandidateIds: showViceCaptain ? viceCaptainIds : [],
        });
      }}
    >
      <p className="text-sm text-green-700 dark:text-green-400">
        Code verified. {tieBreakerPosition ? "Cast your tie-breaker vote to finish." : "Choose your Captain and Vice-Captain picks to finish voting."}
      </p>

      {showCaptain && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Captain</legend>
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <label
                key={candidate.id}
                className="flex items-center gap-3 rounded-md border border-neutral-200 p-3 has-[:checked]:border-neutral-900 dark:border-neutral-800 dark:has-[:checked]:border-white"
              >
                <input
                  type="radio"
                  name="captainCandidateId"
                  value={candidate.id}
                  required
                  checked={captainId === candidate.id}
                  onChange={() => setCaptainId(candidate.id)}
                />
                <span>
                  <span className="block font-medium">{candidate.name}</span>
                  {candidate.description && (
                    <span className="block text-xs text-neutral-500">
                      {candidate.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showViceCaptain && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">
            Vice-Captain (choose {viceCaptainRequired ? "" : "up to "}
            {viceCaptainLimit})
          </legend>
          <p className="mb-2 text-xs text-neutral-500">
            {viceCaptainIds.length} of {viceCaptainLimit} selected
          </p>
          <div className="space-y-2">
            {candidates.map((candidate) => {
              const isChecked = viceCaptainIds.includes(candidate.id);
              return (
                <label
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-md border border-neutral-200 p-3 has-[:checked]:border-neutral-900 dark:border-neutral-800 dark:has-[:checked]:border-white"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isChecked && atLimit}
                    onChange={() => toggleViceCaptain(candidate.id)}
                  />
                  <span>
                    <span className="block font-medium">{candidate.name}</span>
                    {candidate.description && (
                      <span className="block text-xs text-neutral-500">
                        {candidate.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" disabled={pending || !canSubmit} className="w-full">
        {pending ? "Submitting..." : "Cast vote"}
      </Button>
    </form>
  );
}
