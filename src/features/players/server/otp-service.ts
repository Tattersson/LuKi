import { randomInt } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getMailer } from "@/lib/mailer";
import { renderOtpEmail } from "@/lib/mailer/templates/otp-email";
import { hmacEquals, hmacHex } from "@/lib/security/hmac";
import { OTP_LENGTH, OTP_TTL_MINUTES } from "../constants";
import { InvalidOrExpiredOtpError, InvalidOtpError, TooManyAttemptsError } from "../domain/errors";
import { assertOtpSendAllowed } from "./rate-limit";

function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  return randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

function hashOtp(code: string): string {
  const secret = process.env.OTP_PEPPER;
  if (!secret) throw new Error("OTP_PEPPER is not configured");
  return hmacHex(secret, code);
}

function otpMatches(code: string, expectedHash: string): boolean {
  const secret = process.env.OTP_PEPPER;
  if (!secret) throw new Error("OTP_PEPPER is not configured");
  return hmacEquals(secret, code, expectedHash);
}

/** Sends a fresh OTP for this email, after rate-limit checks. Never call this if the
 *  email already belongs to a registered player - callers must check that first. */
export async function sendPlayerOtp(params: {
  email: string;
  emailHash: string;
  ipHash: string;
}): Promise<void> {
  const { email, emailHash, ipHash } = params;

  await assertOtpSendAllowed({ emailHash, ipHash });

  const code = generateOtpCode();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.playerOtpRequest.create({ data: { emailHash, otpHash, expiresAt } }),
    prisma.playerOtpSendLog.create({ data: { emailHash, ipHash } }),
  ]);

  const mailer = getMailer();
  await mailer.send(
    renderOtpEmail({
      to: email,
      code,
      subject: "Your verification code to create your player card",
      contextLine: "You're verifying your email to create your player card.",
      ttlMinutes: OTP_TTL_MINUTES,
    }),
  );
}

/**
 * Checks the OTP code within an existing transaction, enforcing expiry and the attempt
 * limit the same way regardless of caller. Throws InvalidOrExpiredOtpError /
 * TooManyAttemptsError / InvalidOtpError.
 *
 * `consume: false` (used by the standalone "verify code" screen) leaves the OTP request
 * usable so the later registration-completion step can check it again - a correct code
 * never increments `attempts`, so checking it twice is free. `consume: true` marks it
 * used so it can't be replayed, and must run in the same transaction as the Player
 * creation so verify-and-create is atomic.
 */
async function checkOtpCode(
  tx: Prisma.TransactionClient | PrismaClient,
  params: { emailHash: string; otpCode: string },
  options: { consume: boolean },
): Promise<void> {
  const { emailHash, otpCode } = params;

  const otpRequest = await tx.playerOtpRequest.findFirst({
    where: { emailHash, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRequest) {
    throw new InvalidOrExpiredOtpError();
  }

  if (otpRequest.attempts >= otpRequest.maxAttempts) {
    await tx.playerOtpRequest.update({
      where: { id: otpRequest.id },
      data: { expiresAt: new Date() },
    });
    throw new TooManyAttemptsError();
  }

  if (!otpMatches(otpCode, otpRequest.otpHash)) {
    await tx.playerOtpRequest.update({
      where: { id: otpRequest.id },
      data: { attempts: { increment: 1 } },
    });
    const attemptsRemaining = otpRequest.maxAttempts - (otpRequest.attempts + 1);
    throw new InvalidOtpError(Math.max(0, attemptsRemaining));
  }

  if (options.consume) {
    await tx.playerOtpRequest.update({
      where: { id: otpRequest.id },
      data: { consumedAt: new Date() },
    });
  }
}

/** Validates a code without consuming it - used by the standalone verification step. */
export async function checkOtpInTransaction(
  tx: Prisma.TransactionClient | PrismaClient,
  params: { emailHash: string; otpCode: string },
): Promise<void> {
  return checkOtpCode(tx, params, { consume: false });
}

/** Validates a code and marks it consumed - used inside the player-creation transaction. */
export async function verifyOtpInTransaction(
  tx: Prisma.TransactionClient | PrismaClient,
  params: { emailHash: string; otpCode: string },
): Promise<void> {
  return checkOtpCode(tx, params, { consume: true });
}
