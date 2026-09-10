/**
 * Lets the admin area work without a real Keycloak login, for local development
 * only. Requires BOTH conditions so it can never activate in a real deployment:
 * NODE_ENV is never "production" in dev (and the Docker image always sets it to
 * "production"), and the env var is an explicit, separate opt-in.
 */
export function isAdminAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_ADMIN_AUTH === "true";
}

export const DEV_BYPASS_ADMIN_EMAIL = "dev-bypass@localhost";
