export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_MAX_SENDS_PER_HOUR_PER_EMAIL = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_HOUR_PER_IP = 20;

import type { VotePosition } from "./domain/types";

export const MAX_VICE_CAPTAIN_VOTES = 2;

export const POSITION_LABELS: Record<VotePosition, string> = {
  CAPTAIN: "Captain",
  VICE_CAPTAIN: "Vice-Captain",
};

/** How often the in-app scheduler checks for elections past their closesAt deadline. */
export const ELECTION_CLOSE_CHECK_INTERVAL_MS = 60_000;

/**
 * Caps how many rounds a tie can auto-generate (round 1 + up to this many tie-breakers)
 * before the app stops creating further rounds and leaves the tie for an admin to
 * resolve manually - a small candidate pool that keeps tying could otherwise recurse
 * forever, re-emailing every original voter each time.
 */
export const MAX_TIE_BREAKER_ROUNDS = 3;
