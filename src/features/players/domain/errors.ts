export class InvalidOrExpiredOtpError extends Error {
  constructor() {
    super("No valid verification code found. Please request a new one.");
    this.name = "InvalidOrExpiredOtpError";
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super("Too many incorrect attempts. Please request a new code.");
    this.name = "TooManyAttemptsError";
  }
}

export class InvalidOtpError extends Error {
  constructor(public readonly attemptsRemaining: number) {
    super("Incorrect verification code.");
    this.name = "InvalidOtpError";
  }
}

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitedError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("A player card already exists for this email address.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class PlayerNotFoundError extends Error {
  constructor() {
    super("Player not found.");
    this.name = "PlayerNotFoundError";
  }
}
