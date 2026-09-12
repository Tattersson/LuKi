import { z } from "zod";
import { MAX_HEIGHT_CM, MAX_WEIGHT_KG, MIN_HEIGHT_CM, MIN_WEIGHT_KG, OTP_LENGTH } from "../constants";

export const requestPlayerOtpSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const verifyPlayerOtpSchema = z.object({
  email: z.string().trim().email().max(254),
  otpCode: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
});

const birthDateSchema = z.coerce
  .date()
  .refine((date) => date.getTime() < Date.now(), "Birthdate must be in the past");

/** Blank ("", null, undefined) means "not provided yet" and is stored as NULL - a
 *  present value still has to fall within the sane bounds. */
function optionalMeasurement(min: number, max: number) {
  return z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.coerce.number().int().min(min).max(max).nullable(),
  );
}

const playerDetailsSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  position: z.enum(["MV", "FW", "D"]),
  heightCm: optionalMeasurement(MIN_HEIGHT_CM, MAX_HEIGHT_CM),
  weightKg: optionalMeasurement(MIN_WEIGHT_KG, MAX_WEIGHT_KG),
  stickSide: z.enum(["LEFT", "RIGHT"]),
  birthDate: birthDateSchema,
});

export const completePlayerRegistrationSchema = z.object({
  email: z.string().trim().email().max(254),
  otpCode: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
  ...playerDetailsSchema.shape,
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  ...playerDetailsSchema.shape,
});
