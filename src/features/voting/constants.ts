export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_MAX_SENDS_PER_HOUR_PER_EMAIL = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_HOUR_PER_IP = 20;

export const MAX_VICE_CAPTAIN_VOTES = 2;

/** How often the in-app scheduler checks for elections past their closesAt deadline. */
export const ELECTION_CLOSE_CHECK_INTERVAL_MS = 60_000;
