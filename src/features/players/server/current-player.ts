import type { Player } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { normalizeEmail } from "@/lib/security/email-hash";

/** Resolves the signed-in Keycloak session back to a Player row. Matches primarily on
 *  keycloakId (the Keycloak "sub"); falls back to email for accounts not yet linked
 *  (pre-existing players backfilled via the admin action, or a provisioning run that
 *  created the Keycloak user but failed before persisting keycloakId), opportunistically
 *  healing the link in that case. */
export async function getCurrentPlayer(): Promise<Player | null> {
  const session = await auth();
  const keycloakId = session?.user?.id;
  const email = session?.user?.email ? normalizeEmail(session.user.email) : undefined;
  if (!keycloakId && !email) return null;

  if (keycloakId) {
    const byId = await prisma.player.findUnique({ where: { keycloakId } });
    if (byId) return byId;
  }

  if (email) {
    const byEmail = await prisma.player.findUnique({ where: { email } });
    if (byEmail && keycloakId && byEmail.keycloakId !== keycloakId) {
      await prisma.player
        .update({ where: { id: byEmail.id }, data: { keycloakId } })
        .catch(() => {});
      // Reflect the just-written id rather than returning the pre-update snapshot -
      // callers (e.g. the Keycloak-link status shown on the profile page) would
      // otherwise see the stale/null keycloakId for the rest of this request.
      return { ...byEmail, keycloakId };
    }
    return byEmail;
  }

  return null;
}
