import { prisma } from "@/lib/db/prisma";
import { RateLimitedError } from "../domain/errors";
import {
  OTP_MAX_SENDS_PER_HOUR_PER_EMAIL,
  OTP_MAX_SENDS_PER_HOUR_PER_IP,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../constants";

/** Throws RateLimitedError if this email or IP has sent too many OTP requests recently. */
export async function assertOtpSendAllowed(params: {
  emailHash: string;
  ipHash: string;
}): Promise<void> {
  const { emailHash, ipHash } = params;
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const [lastSend, sendsThisHour, ipSendsThisHour] = await Promise.all([
    prisma.playerOtpSendLog.findFirst({
      where: { emailHash },
      orderBy: { createdAt: "desc" },
    }),
    prisma.playerOtpSendLog.count({
      where: { emailHash, createdAt: { gte: hourAgo } },
    }),
    prisma.playerOtpSendLog.count({
      where: { ipHash, createdAt: { gte: hourAgo } },
    }),
  ]);

  if (lastSend) {
    const secondsSinceLastSend = (now - lastSend.createdAt.getTime()) / 1000;
    if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new RateLimitedError(
        Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend),
      );
    }
  }

  if (sendsThisHour >= OTP_MAX_SENDS_PER_HOUR_PER_EMAIL) {
    throw new RateLimitedError(3600);
  }

  if (ipSendsThisHour >= OTP_MAX_SENDS_PER_HOUR_PER_IP) {
    throw new RateLimitedError(3600);
  }
}
