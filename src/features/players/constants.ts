export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;

export const OTP_MAX_SENDS_PER_HOUR_PER_EMAIL = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_HOUR_PER_IP = 20;

export const POSITION_LABELS = {
  MV: "Goalkeeper",
  FW: "Forward",
  D: "Defenseman",
} as const;

export const STICK_SIDE_LABELS = {
  LEFT: "Left",
  RIGHT: "Right",
} as const;

export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 230;
export const MIN_WEIGHT_KG = 30;
export const MAX_WEIGHT_KG = 200;
