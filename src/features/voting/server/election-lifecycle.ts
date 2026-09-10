import { prisma } from "@/lib/db/prisma";
import { getMailer } from "@/lib/mailer";
import { renderResultsEmail } from "../mailer/templates/results-email";

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
 * Closes an election (if not already closed) and emails every voter the winners.
 * Safe to call more than once (e.g. an admin closing right as the scheduler fires) -
 * the guarded update only succeeds once, and only the caller that actually flipped
 * the status computes results and sends mail.
 *
 * Voter emails come from VotedEmail.email - the one deliberate exception to this
 * project's "never persist a plaintext voter email" rule, kept solely for this.
 */
export async function closeElectionAndNotify(electionId: string): Promise<void> {
  const { count } = await prisma.election.updateMany({
    where: { id: electionId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  if (count === 0) {
    return; // already closed (or never open) - nothing to do
  }

  const [election, tallies, voters] = await Promise.all([
    prisma.election.findUniqueOrThrow({
      where: { id: electionId },
      select: { title: true },
    }),
    prisma.vote.groupBy({
      by: ["candidateId", "position"],
      where: { electionId },
      _count: { candidateId: true },
    }),
    prisma.votedEmail.findMany({ where: { electionId }, select: { email: true } }),
  ]);

  const candidates = await prisma.candidate.findMany({
    where: { electionId },
    select: { id: true, name: true },
  });
  const nameById = new Map(candidates.map((c) => [c.id, c.name]));

  function tallyFor(position: "CAPTAIN" | "VICE_CAPTAIN") {
    return tallies
      .filter((t) => t.position === position)
      .map((t) => ({
        candidateId: t.candidateId,
        name: nameById.get(t.candidateId) ?? "Unknown",
        votes: t._count.candidateId,
      }));
  }

  const captainWinners = topNWithTies(tallyFor("CAPTAIN"), 1);
  const viceCaptainWinners = topNWithTies(tallyFor("VICE_CAPTAIN"), 2);

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
}
