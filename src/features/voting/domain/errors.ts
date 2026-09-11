export class AlreadyVotedError extends Error {
  constructor() {
    super("This email has already voted in this election.");
    this.name = "AlreadyVotedError";
  }
}

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

export class ElectionNotOpenError extends Error {
  constructor() {
    super("This election is not currently open for voting.");
    this.name = "ElectionNotOpenError";
  }
}

export class InvalidCandidateError extends Error {
  constructor() {
    super("One of the selected candidates is not part of this election.");
    this.name = "InvalidCandidateError";
  }
}

/** Covers ballot-shape problems: missing Captain pick, duplicate/too-many Vice-Captain picks. */
export class InvalidBallotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBallotError";
  }
}

export class ElectionNotDraftError extends Error {
  constructor() {
    super("This election can only be edited while it's still a draft.");
    this.name = "ElectionNotDraftError";
  }
}

export class AddCandidateNotAllowedError extends Error {
  constructor() {
    super("Candidates can only be added while the election is open.");
    this.name = "AddCandidateNotAllowedError";
  }
}

export class ElectionNotClosedError extends Error {
  constructor() {
    super("This election must be closed before starting a tie-breaker round.");
    this.name = "ElectionNotClosedError";
  }
}

export class NoTieToBreakError extends Error {
  constructor() {
    super("This position isn't currently tied - there's nothing to break.");
    this.name = "NoTieToBreakError";
  }
}
