import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { DEV_BYPASS_ADMIN_EMAIL, isAdminAuthBypassEnabled } from "./dev-bypass";

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME ?? "voting-admin";
/** Realm role granting practice CRUD + full player list/edit access, in addition to
 *  the existing ADMIN_ROLE_NAME (not a replacement for it). */
export const MANAGER_ROLE_NAME = "app-luki-manager";
/** Realm role assigned to every registered player, granting RSVP access. */
export const PLAYER_ROLE_NAME = "app-luki-player";

export function hasAnyRole(session: Session | null | undefined, roles: string[]): boolean {
  const userRoles = session?.user?.roles ?? [];
  return roles.some((role) => userRoles.includes(role));
}

export function hasAdminAccess(session: Session | null | undefined): boolean {
  return hasAnyRole(session, [ADMIN_ROLE_NAME, MANAGER_ROLE_NAME]);
}

/**
 * Redirects to sign-in if unauthenticated, or /forbidden if missing admin access
 * (either ADMIN_ROLE_NAME or MANAGER_ROLE_NAME). /forbidden deliberately lives outside
 * /admin (and its layout) - redirecting into a path gated by this same check would
 * otherwise loop forever.
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
  if (!hasAdminAccess(session)) {
    redirect("/forbidden");
  }
  return session;
}

/** For nav rendering only - never redirects/throws, since a rendering decision must
 *  not blow up the page. */
export async function getNavAuthState(): Promise<{ isSignedIn: boolean; showAdminLink: boolean }> {
  if (isAdminAuthBypassEnabled()) {
    return { isSignedIn: true, showAdminLink: true };
  }
  const session = await auth();
  return { isSignedIn: !!session?.user, showAdminLink: hasAdminAccess(session) };
}
