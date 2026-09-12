export class PracticeNotFoundError extends Error {
  constructor() {
    super("Practice not found.");
    this.name = "PracticeNotFoundError";
  }
}
