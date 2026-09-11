import { prisma } from "@/lib/db/prisma";
import { getMailer } from "@/lib/mailer";
import { MAX_TIE_BREAKER_ROUNDS, MAX_VICE_CAPTAIN_VOTES } from "../constants";
import { ElectionNotClosedError, NoTieToBreakError } from "../domain/errors";
import type { PositionTally, VotePosition } from "../domain/types";
import { renderTieBreakerInviteEmail } from "../mailer/templates/tie-breaker-invite-email";
import { createTieBreakerElection, getElectionTallies } from "./election-repository";

export interface TieBreakInfo {
  tiedCandidateIds: string[];
  slotsToFill: number;
  decidedWinnerIds: string[];
}

/**
 * Walks the tally, bucketed by distinct vote count descending, to find whether the
 * cutoff for `requiredWinners` seats falls inside a tie. Filters out zero-vote rows
 * first (an uncontested/unvoted position never needs a runoff). Returns null when the
 * seats are cleanly decided (including when there are fewer candidates than seats).
 */
export function detectTie(tally: PositionTally[], requiredWinners: number): TieBreakInfo | null {
  const contenders = tally.filter((t) => t.votes > 0);
  const distinctCounts = [...new Set(contenders.map((t) => t.votes))].sort((a, b) => b - a);

  const decided: string[] = [];
  let remaining = requiredWinners;

  for (const count of distinctCounts) {
    const bucket = contenders.filter((t) => t.votes === count).map((t) => t.candidateId);

    if (bucket.length > remaining) {
      return { tiedCandidateIds: bucket, slotsToFill: remaining, decidedWinnerIds: decided };
    }

    decided.push(...bucket);
    remaining -= bucket.length;
    if (remaining === 0) return null;
  }

  return null;
}

/** How many winners a position needs, given the election it's being decided in. */
function requiredWinnersFor(
  position: VotePosition,
  election: { tieBreakerPosition: VotePosition | null; tieBreakerSlots: number | null },
): number {
  if (election.tieBreakerPosition) return election.tieBreakerSlots ?? 1;
  return position === "CAPTAIN" ? 1 : MAX_VICE_CAPTAIN_VOTES;
}

export interface TieOutcome {
  position: VotePosition;
  tiedCandidateNames: string[];
  slotsToFill: number;
  /** False when a tie was detected but no round was created (the round cap was hit) -
   *  an admin can resolve it manually via createManualTieBreakerRound. */
  created: boolean;
  roundId?: string;
  roundPublicSlug?: string;
}

async function sendTieBreakerInvites(params: {
  publicSlug: string;
  position: VotePosition;
  tiedCandidateNames: string[];
  parentElectionTitle: string;
  voterEmails: string[];
}): Promise<void> {
  const mailer = getMailer();
  const voteUrl = `${process.env.APP_BASE_URL ?? ""}/vote/${params.publicSlug}`;

  await Promise.allSettled(
    params.voterEmails.map((email) =>
      mailer.send(
        renderTieBreakerInviteEmail({
          to: email,
          parentElectionTitle: params.parentElectionTitle,
          position: params.position,
          tiedCandidateNames: params.tiedCandidateNames,
          voteUrl,
        }),
      ),
    ),
  );
}

/**
 * Checks a just-closed election for ties and, for each one found, opens a new
 * tie-breaker round scoped to that position and the tied candidates only. A normal
 * election is checked on both positions; a tie-breaker round closing is checked only
 * on its own position (with its own slotsToFill as the seat count), so a runoff that
 * itself ties recurses through the same path - capped at MAX_TIE_BREAKER_ROUNDS so a
 * small pool that keeps tying can't spawn rounds forever. Past the cap, the tie is
 * still reported (created: false) so the admin can resolve it manually.
 */
export async function createTieBreakerRoundsIfNeeded(params: {
  parent: {
    id: string;
    title: string;
    round: number;
    createdByEmail: string;
    tieBreakerPosition: VotePosition | null;
    tieBreakerSlots: number | null;
  };
  candidates: Array<{ id: string; name: string; description: string | null }>;
  captainTally: PositionTally[];
  viceCaptainTally: PositionTally[];
  voterEmails: string[];
}): Promise<TieOutcome[]> {
  const { parent, candidates, captainTally, viceCaptainTally, voterEmails } = params;

  const capReached = parent.round >= MAX_TIE_BREAKER_ROUNDS;
  const positionsToCheck: VotePosition[] = parent.tieBreakerPosition
    ? [parent.tieBreakerPosition]
    : ["CAPTAIN", "VICE_CAPTAIN"];

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const outcomes: TieOutcome[] = [];

  for (const position of positionsToCheck) {
    const tally = position === "CAPTAIN" ? captainTally : viceCaptainTally;
    const tie = detectTie(tally, requiredWinnersFor(position, parent));
    if (!tie) continue;

    const tiedCandidateNames = tie.tiedCandidateIds
      .map((id) => candidateById.get(id)?.name)
      .filter((name): name is string => name != null);

    if (capReached) {
      outcomes.push({
        position,
        tiedCandidateNames,
        slotsToFill: tie.slotsToFill,
        created: false,
      });
      continue;
    }

    const tiedCandidates = tie.tiedCandidateIds
      .map((id) => candidateById.get(id))
      .filter((c): c is { id: string; name: string; description: string | null } => c != null);

    const round = await createTieBreakerElection({
      parentElectionId: parent.id,
      parentTitle: parent.title,
      parentRound: parent.round,
      createdByEmail: parent.createdByEmail,
      position,
      slotsToFill: tie.slotsToFill,
      candidates: tiedCandidates,
    });

    await sendTieBreakerInvites({
      publicSlug: round.publicSlug,
      position,
      tiedCandidateNames,
      parentElectionTitle: parent.title,
      voterEmails,
    });

    outcomes.push({
      position,
      tiedCandidateNames,
      slotsToFill: tie.slotsToFill,
      created: true,
      roundId: round.id,
      roundPublicSlug: round.publicSlug,
    });
  }

  return outcomes;
}

/**
 * Admin-triggered fallback for when the round cap stopped automatic creation: manually
 * opens one more tie-breaker round for a specific position on an already-closed
 * election, re-checking that it's actually still tied first. Unlike the automatic
 * path, this deliberately ignores MAX_TIE_BREAKER_ROUNDS - it's an explicit human
 * decision each time, not an automatic loop.
 */
export async function createManualTieBreakerRound(params: {
  electionId: string;
  position: VotePosition;
}): Promise<TieOutcome> {
  const { electionId, position } = params;

  const election = await prisma.election.findUniqueOrThrow({
    where: { id: electionId },
    select: {
      title: true,
      round: true,
      createdByEmail: true,
      status: true,
      tieBreakerPosition: true,
      tieBreakerSlots: true,
    },
  });

  if (election.status !== "CLOSED") {
    throw new ElectionNotClosedError();
  }
  if (election.tieBreakerPosition && election.tieBreakerPosition !== position) {
    throw new NoTieToBreakError();
  }

  const { candidates, captainTally, viceCaptainTally } = await getElectionTallies(electionId);
  const tally = position === "CAPTAIN" ? captainTally : viceCaptainTally;
  const tie = detectTie(tally, requiredWinnersFor(position, election));
  if (!tie) {
    throw new NoTieToBreakError();
  }

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const tiedCandidates = tie.tiedCandidateIds
    .map((id) => candidateById.get(id))
    .filter((c): c is { id: string; name: string; description: string | null } => c != null);
  const tiedCandidateNames = tiedCandidates.map((c) => c.name);

  const round = await createTieBreakerElection({
    parentElectionId: electionId,
    parentTitle: election.title,
    parentRound: election.round,
    createdByEmail: election.createdByEmail,
    position,
    slotsToFill: tie.slotsToFill,
    candidates: tiedCandidates,
  });

  const voters = await prisma.votedEmail.findMany({ where: { electionId }, select: { email: true } });
  await sendTieBreakerInvites({
    publicSlug: round.publicSlug,
    position,
    tiedCandidateNames,
    parentElectionTitle: election.title,
    voterEmails: voters.map((v) => v.email),
  });

  return {
    position,
    tiedCandidateNames,
    slotsToFill: tie.slotsToFill,
    created: true,
    roundId: round.id,
    roundPublicSlug: round.publicSlug,
  };
}
