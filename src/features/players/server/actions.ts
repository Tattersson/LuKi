"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  requestPlayerOtpSchema,
  verifyPlayerOtpSchema,
  completePlayerRegistrationSchema,
  updatePlayerSchema,
} from "../validation/schemas";
import {
  requestPlayerRegistrationOtp,
  verifyPlayerRegistrationOtp,
  completePlayerRegistration,
} from "./registration-service";
import { updatePlayer } from "./player-repository";
import { hashIp } from "@/lib/security/email-hash";
import { requireAdmin } from "@/lib/auth/rbac";
import {
  EmailAlreadyRegisteredError,
  InvalidOrExpiredOtpError,
  InvalidOtpError,
  PlayerNotFoundError,
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

export async function requestPlayerRegistrationOtpAction(
  input: unknown,
): Promise<ActionResult<{ sent: true }>> {
  const parsed = requestPlayerOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    const ipHash = await currentIpHash();
    await requestPlayerRegistrationOtp({ email: parsed.data.email, ipHash });
    return { ok: true, data: { sent: true } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function resendPlayerRegistrationOtpAction(
  input: unknown,
): Promise<ActionResult<{ sent: true }>> {
  return requestPlayerRegistrationOtpAction(input);
}

export async function verifyPlayerRegistrationOtpAction(
  input: unknown,
): Promise<ActionResult<{ verified: true }>> {
  const parsed = verifyPlayerOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please enter the 6-digit code." };
  }

  try {
    await verifyPlayerRegistrationOtp(parsed.data);
    return { ok: true, data: { verified: true } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function completePlayerRegistrationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = completePlayerRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  try {
    const player = await completePlayerRegistration(parsed.data);
    return { ok: true, data: { id: player.id } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updatePlayerAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = updatePlayerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updatePlayer(parsed.data);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/admin/players");
  revalidatePath(`/admin/players/${parsed.data.playerId}`);
  return { ok: true, data: { id: parsed.data.playerId } };
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
    error instanceof EmailAlreadyRegisteredError ||
    error instanceof InvalidOrExpiredOtpError ||
    error instanceof TooManyAttemptsError ||
    error instanceof PlayerNotFoundError
  ) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
