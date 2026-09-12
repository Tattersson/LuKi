import { describe, expect, it } from "vitest";
import { completePlayerRegistrationSchema, requestPlayerOtpSchema } from "./schemas";

const validDetails = {
  email: "player@example.com",
  otpCode: "123456",
  firstName: "Matti",
  lastName: "Meikäläinen",
  position: "FW" as const,
  heightCm: 180,
  weightKg: 80,
  stickSide: "LEFT" as const,
  birthDate: "2000-01-01",
};

describe("requestPlayerOtpSchema", () => {
  it("accepts a valid email", () => {
    expect(requestPlayerOtpSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(requestPlayerOtpSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("completePlayerRegistrationSchema", () => {
  it("accepts a fully valid submission", () => {
    expect(completePlayerRegistrationSchema.safeParse(validDetails).success).toBe(true);
  });

  it("rejects a birthdate in the future", () => {
    const result = completePlayerRegistrationSchema.safeParse({
      ...validDetails,
      birthDate: "2999-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range height", () => {
    const result = completePlayerRegistrationSchema.safeParse({
      ...validDetails,
      heightCm: 500,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range weight", () => {
    const result = completePlayerRegistrationSchema.safeParse({
      ...validDetails,
      weightKg: 5,
    });
    expect(result.success).toBe(false);
  });

  it("treats height and weight as optional - blank string, null, and omitted are all accepted as 'not provided'", () => {
    for (const heightCm of ["", null, undefined]) {
      const result = completePlayerRegistrationSchema.safeParse({
        ...validDetails,
        heightCm,
        weightKg: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.heightCm).toBeNull();
        expect(result.data.weightKg).toBeNull();
      }
    }
  });

  it("rejects an invalid position", () => {
    const result = completePlayerRegistrationSchema.safeParse({
      ...validDetails,
      position: "GOALIE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid stick side", () => {
    const result = completePlayerRegistrationSchema.safeParse({
      ...validDetails,
      stickSide: "BOTH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed OTP code", () => {
    const result = completePlayerRegistrationSchema.safeParse({
      ...validDetails,
      otpCode: "12",
    });
    expect(result.success).toBe(false);
  });
});
