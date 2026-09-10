import { randomInt } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getMailer } from "@/lib/mailer";
import { hmacEquals, hmacHex } from "@/lib/security/hmac";
import { OTP_LENGTH, OTP_TTL_MINUTES } from "../constants";
import {
  InvalidOrExpiredOtpError,
  InvalidOtpError,
  TooManyAttemptsError,
} from "../domain/errors";
import { renderOtpEmail } from "../mailer/templates/otp-email";
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

/** Sends a fresh OTP for (electionId, email), after rate-limit checks. Never call this
 *  if the email has already voted - callers must check VotedEmail first. */
export async function sendOtp(params: {
  electionId: string;
  email: string;
  emailHash: string;
  ipHash: string;
  electionTitle: string;
}): Promise<void> {
  const { electionId, email, emailHash, ipHash, electionTitle } = params;

  await assertOtpSendAllowed({ electionId, emailHash, ipHash });

  const code = generateOtpCode();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.otpRequest.create({
      data: { electionId, emailHash, otpHash, expiresAt },
    }),
    prisma.otpSendLog.create({
      data: { electionId, emailHash, ipHash },
    }),
  ]);

  const mailer = getMailer();
  await mailer.send(
    renderOtpEmail({ to: email, code, electionTitle, ttlMinutes: OTP_TTL_MINUTES }),
  );
}

/**
 * Checks the OTP code within an existing transaction, enforcing expiry and the
 * attempt limit the same way regardless of caller. Throws
 * InvalidOrExpiredOtpError / TooManyAttemptsError / InvalidOtpError.
 *
 * `consume: false` (used by the standalone "verify code" screen) leaves the
 * OTP request usable so the later vote-casting step can check it again -
 * a correct code never increments `attempts`, so checking it twice is free.
 * `consume: true` marks it used so it can't be replayed, and must run in the
 * same transaction as the VotedEmail/Vote writes so eligibility-check-and-cast
 * is atomic.
 */
async function checkOtpCode(
  tx: Prisma.TransactionClient | PrismaClient,
  params: { electionId: string; emailHash: string; otpCode: string },
  options: { consume: boolean },
): Promise<void> {
  const { electionId, emailHash, otpCode } = params;

  const otpRequest = await tx.otpRequest.findFirst({
    where: {
      electionId,
      emailHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRequest) {
    throw new InvalidOrExpiredOtpError();
  }

  if (otpRequest.attempts >= otpRequest.maxAttempts) {
    await tx.otpRequest.update({
      where: { id: otpRequest.id },
      data: { expiresAt: new Date() },
    });
    throw new TooManyAttemptsError();
  }

  if (!otpMatches(otpCode, otpRequest.otpHash)) {
    await tx.otpRequest.update({
      where: { id: otpRequest.id },
      data: { attempts: { increment: 1 } },
    });
    const attemptsRemaining = otpRequest.maxAttempts - (otpRequest.attempts + 1);
    throw new InvalidOtpError(Math.max(0, attemptsRemaining));
  }

  if (options.consume) {
    await tx.otpRequest.update({
      where: { id: otpRequest.id },
      data: { consumedAt: new Date() },
    });
  }
}

/** Validates a code without consuming it - used by the standalone verification step. */
export async function checkOtpInTransaction(
  tx: Prisma.TransactionClient | PrismaClient,
  params: { electionId: string; emailHash: string; otpCode: string },
): Promise<void> {
  return checkOtpCode(tx, params, { consume: false });
}

/** Validates a code and marks it consumed - used inside the vote-casting transaction. */
export async function verifyOtpInTransaction(
  tx: Prisma.TransactionClient | PrismaClient,
  params: { electionId: string; emailHash: string; otpCode: string },
): Promise<void> {
  return checkOtpCode(tx, params, { consume: true });
}
