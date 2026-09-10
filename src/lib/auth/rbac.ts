import { redirect } from "next/navigation";
import { auth } from "./auth";
import { DEV_BYPASS_ADMIN_EMAIL, isAdminAuthBypassEnabled } from "./dev-bypass";

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME ?? "voting-admin";

/**
 * Redirects to sign-in if unauthenticated, or /forbidden if missing the admin role.
 * /forbidden deliberately lives outside /admin (and its layout) - redirecting into a
 * path gated by this same check would otherwise loop forever.
 *
 * When isAdminAuthBypassEnabled() (local dev only - see dev-bypass.ts), skips Keycloak
 * entirely and returns a fake admin session instead.
 */
export async function requireAdmin() {
  if (isAdminAuthBypassEnabled()) {
    return {
      user: { email: DEV_BYPASS_ADMIN_EMAIL, roles: [ADMIN_ROLE_NAME] },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  if (!session.user.roles?.includes(ADMIN_ROLE_NAME)) {
    redirect("/forbidden");
  }
  return session;
}
