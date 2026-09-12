export class LeijonatApiError extends Error {
  constructor(status: number) {
    super(`Leijonat tulospalvelu API responded with status ${status}.`);
    this.name = "LeijonatApiError";
  }
}
