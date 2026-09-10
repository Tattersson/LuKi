import { redirect } from "next/navigation";
import { auth } from "./auth";

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME ?? "voting-admin";

/**
 * Redirects to sign-in if unauthenticated, or /forbidden if missing the admin role.
 * /forbidden deliberately lives outside /admin (and its layout) - redirecting into a
 * path gated by this same check would otherwise loop forever.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  if (!session.user.roles?.includes(ADMIN_ROLE_NAME)) {
    redirect("/forbidden");
  }
  return session;
}
