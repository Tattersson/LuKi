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

const playerDetailsSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  position: z.enum(["MV", "FW", "D"]),
  heightCm: z.coerce.number().int().min(MIN_HEIGHT_CM).max(MAX_HEIGHT_CM),
  weightKg: z.coerce.number().int().min(MIN_WEIGHT_KG).max(MAX_WEIGHT_KG),
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
