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
import { deletePlayer, getPlayerById, updatePlayer } from "./player-repository";
import { provisionPlayerKeycloakAccount } from "./keycloak-provisioning";
import { deleteKeycloakUser } from "@/lib/keycloak/admin-client";
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

/** Creates a Keycloak login for a player who doesn't have one yet (e.g. registered
 *  before this feature existed, or auto-provisioning failed at registration time), or
 *  re-sends the completion email for one who already does - both cases are the same
 *  idempotent call. */
export async function createPlayerLoginAction(
  playerId: string,
): Promise<ActionResult<{ keycloakId: string }>> {
  await requireAdmin();

  const player = await getPlayerById(playerId);
  if (!player) {
    return { ok: false, error: "Player not found." };
  }

  try {
    const { keycloakId } = await provisionPlayerKeycloakAccount(player);
    revalidatePath(`/admin/players/${playerId}`);
    return { ok: true, data: { keycloakId } };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: "Could not create a login for this player. Check Keycloak connectivity and try again.",
    };
  }
}

/** Deletes the player's Keycloak login first, then their player card. If the
 *  Keycloak deletion fails, the player card is deliberately left in place - a "delete"
 *  that removed the DB row but left a live Keycloak login behind would silently fail
 *  the "also remove Keycloak access" half of this action, so the admin needs to see
 *  the error and retry rather than get a false success. */
export async function deletePlayerAction(playerId: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const player = await getPlayerById(playerId);
  if (!player) {
    return { ok: false, error: "Player not found." };
  }

  if (player.keycloakId) {
    try {
      await deleteKeycloakUser(player.keycloakId);
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        error: "Could not remove this player's Keycloak login. Check Keycloak connectivity and try again.",
      };
    }
  }

  try {
    await deletePlayer(playerId);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/admin/players");
  return { ok: true, data: { id: playerId } };
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
