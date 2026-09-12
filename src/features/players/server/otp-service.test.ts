import { beforeEach, describe, expect, it, vi } from "vitest";
import { hmacHex } from "@/lib/security/hmac";
import { checkOtpInTransaction, verifyOtpInTransaction } from "./otp-service";
import { InvalidOrExpiredOtpError, InvalidOtpError, TooManyAttemptsError } from "../domain/errors";

const EMAIL_HASH = "some-email-hash";
const CODE = "123456";

function hashCode(code: string): string {
  return hmacHex(process.env.OTP_PEPPER!, code);
}

function fakeTx(row: Record<string, unknown> | null) {
  return {
    playerOtpRequest: {
      findFirst: vi.fn().mockResolvedValue(row),
      update: vi.fn().mockResolvedValue(undefined),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  process.env.OTP_PEPPER = "test-pepper";
});

describe("checkOtpInTransaction (peek, does not consume)", () => {
  it("throws InvalidOrExpiredOtpError when no matching request exists", async () => {
    const tx = fakeTx(null);
    await expect(
      checkOtpInTransaction(tx, { emailHash: EMAIL_HASH, otpCode: CODE }),
    ).rejects.toThrow(InvalidOrExpiredOtpError);
  });

  it("throws TooManyAttemptsError once attempts reach the limit", async () => {
    const tx = fakeTx({
      id: "otp1",
      otpHash: hashCode(CODE),
      attempts: 5,
      maxAttempts: 5,
    });
    await expect(
      checkOtpInTransaction(tx, { emailHash: EMAIL_HASH, otpCode: CODE }),
    ).rejects.toThrow(TooManyAttemptsError);
  });

  it("throws InvalidOtpError with attempts remaining on a wrong code", async () => {
    const tx = fakeTx({
      id: "otp1",
      otpHash: hashCode(CODE),
      attempts: 1,
      maxAttempts: 5,
    });
    await expect(
      checkOtpInTransaction(tx, { emailHash: EMAIL_HASH, otpCode: "000000" }),
    ).rejects.toThrow(InvalidOtpError);
    try {
      await checkOtpInTransaction(fakeTx({
        id: "otp1",
        otpHash: hashCode(CODE),
        attempts: 1,
        maxAttempts: 5,
      }), { emailHash: EMAIL_HASH, otpCode: "000000" });
    } catch (error) {
      expect((error as InvalidOtpError).attemptsRemaining).toBe(3);
    }
  });

  it("succeeds on the correct code without marking it consumed", async () => {
    const tx = fakeTx({
      id: "otp1",
      otpHash: hashCode(CODE),
      attempts: 0,
      maxAttempts: 5,
    });
    await expect(
      checkOtpInTransaction(tx, { emailHash: EMAIL_HASH, otpCode: CODE }),
    ).resolves.toBeUndefined();
    expect(tx.playerOtpRequest.update).not.toHaveBeenCalled();
  });
});

describe("verifyOtpInTransaction (consumes on success)", () => {
  it("marks the request consumed on the correct code", async () => {
    const tx = fakeTx({
      id: "otp1",
      otpHash: hashCode(CODE),
      attempts: 0,
      maxAttempts: 5,
    });
    await verifyOtpInTransaction(tx, { emailHash: EMAIL_HASH, otpCode: CODE });
    expect(tx.playerOtpRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "otp1" },
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      }),
    );
  });
});
