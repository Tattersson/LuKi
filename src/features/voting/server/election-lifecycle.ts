import { prisma } from "@/lib/db/prisma";
import { getMailer } from "@/lib/mailer";
import { getElectionTallies } from "./election-repository";
import { renderResultsEmail } from "../mailer/templates/results-email";
import { createTieBreakerRoundsIfNeeded, type TieOutcome } from "./tie-breaker-service";
import { MAX_VICE_CAPTAIN_VOTES } from "../constants";

/**
 * Names of the top `n` vote-getters, expanding to include everyone tied at a
 * given vote count rather than cutting a tie in half (so asking for the top 2
 * can return 3+ names if there's a tie for 2nd place).
 */
function topNWithTies(
  tally: Array<{ candidateId: string; name: string; votes: number }>,
  n: number,
): string[] {
  const distinctCounts = [...new Set(tally.map((t) => t.votes))]
    .filter((v) => v > 0)
    .sort((a, b) => b - a);

  const names: string[] = [];
  for (const count of distinctCounts) {
    if (names.length >= n) break;
    names.push(...tally.filter((t) => t.votes === count).map((t) => t.name));
  }
  return names;
}

/**
 * Closes an election (if not already closed), emails every voter the winners, and -
 * if a position ended in a tie - automatically opens a linked tie-breaker round (see
 * tie-breaker-service.ts) and returns the outcome so the caller can tell the admin.
 *
 * Safe to call more than once (e.g. an admin closing right as the scheduler fires) -
 * the guarded update only succeeds once, and only the caller that actually flipped
 * the status computes results, sends mail, and checks for ties.
 *
 * Voter emails come from VotedEmail.email - the one deliberate exception to this
 * project's "never persist a plaintext voter email" rule, kept solely for this.
 */
export async function closeElectionAndNotify(electionId: string): Promise<TieOutcome[]> {
  const { count } = await prisma.election.updateMany({
    where: { id: electionId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  if (count === 0) {
    return []; // already closed (or never open) - nothing to do
  }

  const [election, { candidates, captainTally, viceCaptainTally }, voters] = await Promise.all([
    prisma.election.findUniqueOrThrow({
      where: { id: electionId },
      select: {
        title: true,
        round: true,
        createdByEmail: true,
        tieBreakerPosition: true,
        tieBreakerSlots: true,
      },
    }),
    getElectionTallies(electionId),
    prisma.votedEmail.findMany({ where: { electionId }, select: { email: true } }),
  ]);

  const captainWinners =
    election.tieBreakerPosition === "VICE_CAPTAIN" ? null : topNWithTies(captainTally, 1);
  const viceCaptainWinners =
    election.tieBreakerPosition === "CAPTAIN"
      ? null
      : topNWithTies(
          viceCaptainTally,
          election.tieBreakerPosition === "VICE_CAPTAIN"
            ? (election.tieBreakerSlots ?? 1)
            : MAX_VICE_CAPTAIN_VOTES,
        );

  const mailer = getMailer();
  await Promise.allSettled(
    voters.map((voter) =>
      mailer.send(
        renderResultsEmail({
          to: voter.email,
          electionTitle: election.title,
          captainWinners,
          viceCaptainWinners,
        }),
      ),
    ),
  );

  await prisma.election.update({
    where: { id: electionId },
    data: { resultsEmailSentAt: new Date() },
  });

  return createTieBreakerRoundsIfNeeded({
    parent: { id: electionId, ...election },
    candidates,
    captainTally,
    viceCaptainTally,
    voterEmails: voters.map((v) => v.email),
  });
}
