"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MAX_VICE_CAPTAIN_VOTES } from "../../constants";
import type { CandidateView } from "../../domain/types";

export function VoteStep({
  candidates,
  onSubmit,
  pending,
  error,
}: {
  candidates: CandidateView[];
  onSubmit: (params: { captainCandidateId: string; viceCaptainCandidateIds: string[] }) => void;
  pending: boolean;
  error: string | null;
}) {
  const [captainId, setCaptainId] = useState<string>("");
  const [viceCaptainIds, setViceCaptainIds] = useState<string[]>([]);
  const atLimit = viceCaptainIds.length >= MAX_VICE_CAPTAIN_VOTES;

  function toggleViceCaptain(candidateId: string) {
    setViceCaptainIds((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }
      if (current.length >= MAX_VICE_CAPTAIN_VOTES) {
        return current;
      }
      return [...current, candidateId];
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ captainCandidateId: captainId, viceCaptainCandidateIds: viceCaptainIds });
      }}
    >
      <p className="text-sm text-green-700 dark:text-green-400">
        Code verified. Choose your Captain and Vice-Captain picks to finish voting.
      </p>

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

      <fieldset>
        <legend className="mb-1 text-sm font-medium">
          Vice-Captain (choose up to {MAX_VICE_CAPTAIN_VOTES})
        </legend>
        <p className="mb-2 text-xs text-neutral-500">
          {viceCaptainIds.length} of {MAX_VICE_CAPTAIN_VOTES} selected
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

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" disabled={pending || !captainId} className="w-full">
        {pending ? "Submitting..." : "Cast vote"}
      </Button>
    </form>
  );
}
