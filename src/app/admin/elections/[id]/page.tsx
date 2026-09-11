import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getElectionForAdmin,
  getElectionResults,
} from "@/features/voting/server/election-repository";
import { detectTie } from "@/features/voting/server/tie-breaker-service";
import { MAX_VICE_CAPTAIN_VOTES, POSITION_LABELS } from "@/features/voting/constants";
import { ElectionStatusBadge } from "@/features/voting/ui/admin/ElectionStatusBadge";
import { ElectionRoundBadge } from "@/features/voting/ui/admin/ElectionRoundBadge";
import { OpenCloseControls } from "@/features/voting/ui/admin/OpenCloseControls";
import { ElectionResults } from "@/features/voting/ui/admin/ElectionResults";
import { AddCandidateForm } from "@/features/voting/ui/admin/AddCandidateForm";
import { UnresolvedTieBanner } from "@/features/voting/ui/admin/UnresolvedTieBanner";
import type { VotePosition } from "@/features/voting/domain/types";

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [election, results] = await Promise.all([
    getElectionForAdmin(id),
    getElectionResults(id),
  ]);

  if (!election || !results) {
    notFound();
  }

  const voteUrl = `${process.env.APP_BASE_URL ?? ""}/vote/${election.publicSlug}`;

  const positionsToCheck: Array<{ position: VotePosition; requiredWinners: number }> =
    election.tieBreakerPosition
      ? [{ position: election.tieBreakerPosition, requiredWinners: election.tieBreakerSlots ?? 1 }]
      : [
          { position: "CAPTAIN", requiredWinners: 1 },
          { position: "VICE_CAPTAIN", requiredWinners: MAX_VICE_CAPTAIN_VOTES },
        ];
  const unresolvedTiePositions =
    election.status === "CLOSED"
      ? positionsToCheck
          .filter(({ position, requiredWinners }) => {
            const tally = position === "CAPTAIN" ? results.captainResults : results.viceCaptainResults;
            const hasChildForPosition = election.childElections.some(
              (c) => c.tieBreakerPosition === position,
            );
            return !hasChildForPosition && detectTie(tally, requiredWinners) !== null;
          })
          .map(({ position }) => position)
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{election.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <ElectionStatusBadge status={election.status} />
            <ElectionRoundBadge round={election.round} tieBreakerPosition={election.tieBreakerPosition} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {election.status === "DRAFT" && (
            <Link href={`/admin/elections/${election.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          )}
          <OpenCloseControls electionId={election.id} status={election.status} />
        </div>
      </div>

      {election.parentElection && (
        <Link
          href={`/admin/elections/${election.parentElection.id}`}
          className="inline-block text-sm underline"
        >
          ◂ Round {election.parentElection.round}: {election.parentElection.title}
        </Link>
      )}

      {unresolvedTiePositions.length > 0 && (
        <UnresolvedTieBanner electionId={election.id} positions={unresolvedTiePositions} />
      )}

      <Card>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Shareable link</h2>
        <a href={voteUrl} className="break-all text-sm underline">
          {voteUrl}
        </a>
      </Card>

      {election.closesAt && (
        <Card>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Closes at</h2>
          <p className="text-sm">
            {election.closesAt.toLocaleString()}
            {election.status === "OPEN" &&
              " - voting will close automatically and results will be emailed to every voter."}
          </p>
        </Card>
      )}

      {election.childElections.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Tie-breaker rounds</h2>
          <ul className="space-y-2 text-sm">
            {election.childElections.map((child) => (
              <li key={child.id} className="flex items-center justify-between gap-2">
                <Link href={`/admin/elections/${child.id}`} className="underline">
                  {child.title}
                </Link>
                <div className="flex items-center gap-2">
                  <ElectionRoundBadge round={child.round} tieBreakerPosition={child.tieBreakerPosition} />
                  <ElectionStatusBadge status={child.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Candidates</h2>
        <p className="mb-2 text-xs text-neutral-500">
          {election.tieBreakerPosition
            ? `Each voter picks their ${POSITION_LABELS[election.tieBreakerPosition]} choice from this roster to break the tie.`
            : "Each voter picks one Captain and up to two Vice-Captains from this roster."}
        </p>
        <ul className="mb-3 space-y-1 text-sm">
          {election.candidates.map((candidate) => (
            <li key={candidate.id}>{candidate.name}</li>
          ))}
        </ul>
        {election.status === "OPEN" && !election.tieBreakerPosition && (
          <AddCandidateForm electionId={election.id} />
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Results — {election._count.votedEmails}{" "}
          {election._count.votedEmails === 1 ? "voter" : "voters"}
        </h2>
        <ElectionResults results={results} tieBreakerPosition={election.tieBreakerPosition} />
      </Card>
    </div>
  );
}
