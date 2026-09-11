import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  AlreadyVotedError,
  ElectionNotOpenError,
  InvalidBallotError,
  InvalidCandidateError,
} from "../domain/errors";
import { MAX_VICE_CAPTAIN_VOTES } from "../constants";
import { hashEmail, normalizeEmail } from "./email-hash";
import { checkOtpInTransaction, sendOtp, verifyOtpInTransaction } from "./otp-service";

/**
 * Step 1 of the voting flow: checks eligibility and either reports the email
 * already voted (no email sent) or sends a fresh OTP.
 */
export async function requestVoteOtp(params: {
  electionId: string;
  email: string;
  ipHash: string;
}): Promise<{ alreadyVoted: boolean }> {
  const { electionId, email, ipHash } = params;

  const election = await prisma.election.findUniqueOrThrow({
    where: { id: electionId },
    select: { title: true, status: true },
  });

  if (election.status !== "OPEN") {
    throw new ElectionNotOpenError();
  }

  const emailHash = hashEmail(email);

  const alreadyVoted = await prisma.votedEmail.findUnique({
    where: { electionId_emailHash: { electionId, emailHash } },
    select: { id: true },
  });

  if (alreadyVoted) {
    return { alreadyVoted: true };
  }

  await sendOtp({
    electionId,
    email,
    emailHash,
    ipHash,
    electionTitle: election.title,
  });

  return { alreadyVoted: false };
}

/**
 * Step 2: verifies the OTP as its own screen, before any candidate is ever chosen.
 * Does not consume the code or write anything - the actual cast (step 3) re-checks
 * it inside its own atomic transaction, since a UI-only "verified" flag can't be
 * trusted and skipping the re-check would let a tampered client cast a vote without
 * ever passing a valid code.
 */
export async function verifyVoteOtp(params: {
  electionId: string;
  email: string;
  otpCode: string;
}): Promise<void> {
  const { electionId, email, otpCode } = params;
  const emailHash = hashEmail(email);

  await prisma.$transaction(async (tx) => {
    const election = await tx.election.findUniqueOrThrow({
      where: { id: electionId },
      select: { status: true },
    });
    if (election.status !== "OPEN") {
      throw new ElectionNotOpenError();
    }

    await checkOtpInTransaction(tx, { electionId, emailHash, otpCode });
  });
}

/**
 * Step 3: re-verifies the OTP and casts the ballot in a single transaction.
 *
 * Ballot shape depends on the election: a normal election takes exactly one
 * Captain pick plus zero to MAX_VICE_CAPTAIN_VOTES distinct Vice-Captain picks
 * (a candidate may appear as both the Captain pick and a Vice-Captain pick -
 * the two roles are independent). A tie-breaker round (election.tieBreakerPosition
 * set) only asks about that one position: a Captain tie-breaker takes exactly one
 * pick and no Vice-Captain picks; a Vice-Captain tie-breaker takes one to
 * election.tieBreakerSlots distinct picks and no Captain pick. The validation for
 * this can only happen once the election is loaded, so - unlike a normal election -
 * it lives inside the transaction rather than ahead of it.
 *
 * Anonymity guarantee: `VotedEmail` (proof this email voted) and `Vote` (each
 * anonymous ballot line) are written as independent rows with no shared id and
 * no emailHash on Vote - nothing in this function computes one row's key from
 * the other, so a normal query can never join a voter to their choices.
 * `VotedEmail.email` is the sole, explicitly-approved exception: kept only to
 * send the closing results notice, and never joined against Vote.
 */
export async function verifyOtpAndCastVote(params: {
  electionId: string;
  email: string;
  otpCode: string;
  captainCandidateId?: string;
  viceCaptainCandidateIds: string[];
}): Promise<void> {
  const { electionId, email, otpCode, captainCandidateId } = params;
  const emailHash = hashEmail(email);
  const uniqueViceCaptainIds = [...new Set(params.viceCaptainCandidateIds)];

  if (uniqueViceCaptainIds.length !== params.viceCaptainCandidateIds.length) {
    throw new InvalidBallotError("Vice-Captain picks must be different candidates.");
  }

  await prisma.$transaction(async (tx) => {
    const election = await tx.election.findUniqueOrThrow({
      where: { id: electionId },
      select: { status: true, tieBreakerPosition: true, tieBreakerSlots: true },
    });
    if (election.status !== "OPEN") {
      throw new ElectionNotOpenError();
    }

    let captainPick: string | undefined;
    let viceCaptainPicks: string[];

    if (election.tieBreakerPosition === "CAPTAIN") {
      if (!captainCandidateId) {
        throw new InvalidBallotError("Please choose a Captain.");
      }
      if (uniqueViceCaptainIds.length > 0) {
        throw new InvalidBallotError("This round only decides Captain.");
      }
      captainPick = captainCandidateId;
      viceCaptainPicks = [];
    } else if (election.tieBreakerPosition === "VICE_CAPTAIN") {
      if (captainCandidateId) {
        throw new InvalidBallotError("This round only decides Vice-Captain.");
      }
      const slots = election.tieBreakerSlots ?? 1;
      if (uniqueViceCaptainIds.length < 1 || uniqueViceCaptainIds.length > slots) {
        throw new InvalidBallotError(`Please select ${slots === 1 ? "1 Vice-Captain" : `1 to ${slots} Vice-Captains`}.`);
      }
      captainPick = undefined;
      viceCaptainPicks = uniqueViceCaptainIds;
    } else {
      if (!captainCandidateId) {
        throw new InvalidBallotError("Please choose a Captain.");
      }
      if (uniqueViceCaptainIds.length > MAX_VICE_CAPTAIN_VOTES) {
        throw new InvalidBallotError(
          `You may select at most ${MAX_VICE_CAPTAIN_VOTES} Vice-Captains.`,
        );
      }
      captainPick = captainCandidateId;
      viceCaptainPicks = uniqueViceCaptainIds;
    }

    const allCandidateIds = [...(captainPick ? [captainPick] : []), ...viceCaptainPicks];
    const matchingCandidateCount = await tx.candidate.count({
      where: { id: { in: allCandidateIds }, electionId },
    });
    if (matchingCandidateCount !== new Set(allCandidateIds).size) {
      throw new InvalidCandidateError();
    }

    await verifyOtpInTransaction(tx, { electionId, emailHash, otpCode });

    try {
      await tx.votedEmail.create({
        data: { electionId, emailHash, email: normalizeEmail(email) },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AlreadyVotedError();
      }
      throw error;
    }

    // One independent row per pick - see the module-level anonymity note above;
    // no field here ties these rows back to emailHash, to each other, or across positions.
    await tx.vote.createMany({
      data: [
        ...(captainPick
          ? [{ electionId, candidateId: captainPick, position: "CAPTAIN" as const }]
          : []),
        ...viceCaptainPicks.map((candidateId) => ({
          electionId,
          candidateId,
          position: "VICE_CAPTAIN" as const,
        })),
      ],
    });
  });
}
