"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  requestOtpSchema,
  verifyOtpSchema,
  verifyOtpAndVoteSchema,
  createElectionSchema,
  updateElectionSchema,
  addCandidateSchema,
} from "../validation/schemas";
import { requestVoteOtp, verifyVoteOtp, verifyOtpAndCastVote } from "./vote-service";
import { hashIp } from "./email-hash";
import {
  addCandidateToElection,
  createElection,
  openElection,
  updateElection,
} from "./election-repository";
import { closeElectionAndNotify } from "./election-lifecycle";
import { requireAdmin } from "@/lib/auth/rbac";
import {
  AddCandidateNotAllowedError,
  AlreadyVotedError,
  ElectionNotDraftError,
  ElectionNotOpenError,
  InvalidBallotError,
  InvalidCandidateError,
  InvalidOrExpiredOtpError,
  InvalidOtpError,
  RateLimitedError,
  TooManyAttemptsError,
} from "../domain/errors";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; retryAfterSeconds?: number; attemptsRemaining?: number };

async function currentIpHash(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return hashIp(ip);
}

export async function requestOtpAction(
  input: unknown,
): Promise<ActionResult<{ alreadyVoted: boolean }>> {
  const parsed = requestOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    const ipHash = await currentIpHash();
    const result = await requestVoteOtp({
      electionId: parsed.data.electionId,
      email: parsed.data.email,
      ipHash,
    });
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function resendOtpAction(
  input: unknown,
): Promise<ActionResult<{ alreadyVoted: boolean }>> {
  return requestOtpAction(input);
}

export async function verifyOtpAction(
  input: unknown,
): Promise<ActionResult<{ verified: true }>> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please enter the 6-digit code." };
  }

  try {
    await verifyVoteOtp(parsed.data);
    return { ok: true, data: { verified: true } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function verifyOtpAndCastVoteAction(
  input: unknown,
): Promise<ActionResult<{ voted: true }>> {
  const parsed = verifyOtpAndVoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the code and your selection." };
  }

  try {
    await verifyOtpAndCastVote(parsed.data);
    return { ok: true, data: { voted: true } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function createElectionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();
  const parsed = createElectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const election = await createElection({
    ...parsed.data,
    createdByEmail: session.user?.email ?? "unknown",
  });
  revalidatePath("/admin");
  return { ok: true, data: { id: election.id } };
}

export async function updateElectionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = updateElectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateElection({ ...parsed.data, id: parsed.data.electionId });
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/elections/${parsed.data.electionId}`);
  return { ok: true, data: { id: parsed.data.electionId } };
}

export async function addCandidateAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = addCandidateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const candidate = await addCandidateToElection(parsed.data);
    revalidatePath(`/admin/elections/${parsed.data.electionId}`);
    return { ok: true, data: { id: candidate.id } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function openElectionAction(electionId: string): Promise<void> {
  await requireAdmin();
  await openElection(electionId);
  revalidatePath("/admin");
  revalidatePath(`/admin/elections/${electionId}`);
}

export async function closeElectionAction(electionId: string): Promise<void> {
  await requireAdmin();
  await closeElectionAndNotify(electionId);
  revalidatePath("/admin");
  revalidatePath(`/admin/elections/${electionId}`);
}

function toErrorResult(error: unknown): {
  ok: false;
  error: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
} {
  if (error instanceof RateLimitedError) {
    return { ok: false, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
  }
  if (error instanceof InvalidOtpError) {
    return { ok: false, error: error.message, attemptsRemaining: error.attemptsRemaining };
  }
  if (
    error instanceof AlreadyVotedError ||
    error instanceof InvalidOrExpiredOtpError ||
    error instanceof TooManyAttemptsError ||
    error instanceof ElectionNotOpenError ||
    error instanceof InvalidCandidateError ||
    error instanceof InvalidBallotError ||
    error instanceof ElectionNotDraftError ||
    error instanceof AddCandidateNotAllowedError
  ) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
