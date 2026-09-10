import { z } from "zod";
import { MAX_VICE_CAPTAIN_VOTES, OTP_LENGTH } from "../constants";

export const requestOtpSchema = z.object({
  electionId: z.string().min(1),
  email: z.string().trim().email().max(254),
});

export const verifyOtpSchema = z.object({
  electionId: z.string().min(1),
  email: z.string().trim().email().max(254),
  otpCode: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
});

export const verifyOtpAndVoteSchema = z.object({
  electionId: z.string().min(1),
  email: z.string().trim().email().max(254),
  otpCode: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
  captainCandidateId: z.string().min(1),
  viceCaptainCandidateIds: z.array(z.string().min(1)).max(MAX_VICE_CAPTAIN_VOTES),
});

const closesAtSchema = z.coerce
  .date()
  .refine((date) => date.getTime() > Date.now(), "Closing date must be in the future")
  .optional();

const candidateInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export const createElectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  closesAt: closesAtSchema,
  candidates: z.array(candidateInputSchema).min(2, "An election needs at least two candidates"),
});

export const updateElectionSchema = z.object({
  electionId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  closesAt: closesAtSchema,
  candidates: z
    .array(candidateInputSchema.extend({ id: z.string().optional() }))
    .min(2, "An election needs at least two candidates"),
});
