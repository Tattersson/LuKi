import type {
  ElectionResults as ElectionResultsData,
  PositionResult,
  VotePosition,
} from "../../domain/types";

function ResultsBars({ results }: { results: PositionResult[] }) {
  const maxVotes = Math.max(1, ...results.map((r) => r.votes));

  return (
    <div className="space-y-3">
      {results
        .slice()
        .sort((a, b) => b.votes - a.votes)
        .map((candidate) => (
          <div key={candidate.candidateId}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{candidate.name}</span>
              <span className="text-neutral-500">{candidate.votes}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-2 rounded-full bg-neutral-900 dark:bg-white"
                style={{ width: `${(candidate.votes / maxVotes) * 100}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

/**
 * When `tieBreakerPosition` is set, only that position's section is shown - the
 * round's candidates never competed for the other position, so it would otherwise
 * show a misleading all-zero section.
 */
export function ElectionResults({
  results,
  tieBreakerPosition,
}: {
  results: ElectionResultsData;
  tieBreakerPosition?: VotePosition | null;
}) {
  return (
    <div className="space-y-6">
      {tieBreakerPosition !== "VICE_CAPTAIN" && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Captain
          </h3>
          <ResultsBars results={results.captainResults} />
        </div>
      )}
      {tieBreakerPosition !== "CAPTAIN" && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Vice-Captain
          </h3>
          <ResultsBars results={results.viceCaptainResults} />
        </div>
      )}
    </div>
  );
}
