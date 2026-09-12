import { prisma } from "@/lib/db/prisma";
import { provisionKeycloakAccountForPlayer } from "@/lib/keycloak/provisioning";

/** Provisions (or re-provisions) a Keycloak login for an existing Player row and
 *  persists the returned Keycloak user id. Safe to call more than once for the same
 *  player - createKeycloakUser/assignRealmRole/sendExecuteActionsEmail are all
 *  idempotent, so this doubles as a "resend welcome email" action. */
export async function provisionPlayerKeycloakAccount(player: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ keycloakId: string }> {
  const { keycloakId } = await provisionKeycloakAccountForPlayer({
    email: player.email,
    firstName: player.firstName,
    lastName: player.lastName,
  });
  await prisma.player.update({ where: { id: player.id }, data: { keycloakId } });
  return { keycloakId };
}
