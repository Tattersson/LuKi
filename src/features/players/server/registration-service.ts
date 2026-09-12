import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashEmail, normalizeEmail } from "@/lib/security/email-hash";
import { EmailAlreadyRegisteredError } from "../domain/errors";
import { checkOtpInTransaction, sendPlayerOtp, verifyOtpInTransaction } from "./otp-service";
import type { PlayerPosition, StickSide } from "../domain/types";

/**
 * Step 1 of self-service registration: checks the email isn't already attached to a
 * player card, then sends a fresh OTP.
 */
export async function requestPlayerRegistrationOtp(params: {
  email: string;
  ipHash: string;
}): Promise<void> {
  const { email, ipHash } = params;

  const existing = await prisma.player.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true },
  });
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const emailHash = hashEmail(email);
  await sendPlayerOtp({ email, emailHash, ipHash });
}

/**
 * Step 2: verifies the OTP as its own screen, before any player details are entered.
 * Does not consume the code or write anything - the final registration step (step 3)
 * re-checks it inside its own atomic transaction, since a UI-only "verified" flag can't
 * be trusted and skipping the re-check would let a tampered client create a player card
 * without ever passing a valid code.
 */
export async function verifyPlayerRegistrationOtp(params: {
  email: string;
  otpCode: string;
}): Promise<void> {
  const { email, otpCode } = params;
  const emailHash = hashEmail(email);
  await checkOtpInTransaction(prisma, { emailHash, otpCode });
}

/** Step 3: re-verifies the OTP and creates the player card in a single transaction. */
export async function completePlayerRegistration(params: {
  email: string;
  otpCode: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  heightCm: number | null;
  weightKg: number | null;
  stickSide: StickSide;
  birthDate: Date;
}): Promise<{ id: string }> {
  const { email, otpCode, ...details } = params;
  const emailHash = hashEmail(email);

  return prisma.$transaction(async (tx) => {
    await verifyOtpInTransaction(tx, { emailHash, otpCode });

    try {
      const player = await tx.player.create({
        data: {
          ...details,
          email: normalizeEmail(email),
          emailVerifiedAt: new Date(),
        },
      });
      return { id: player.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  });
}
