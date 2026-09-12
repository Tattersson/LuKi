import { PLAYER_ROLE_NAME } from "@/lib/auth/rbac";
import { assignRealmRole, createKeycloakUser, sendExecuteActionsEmail } from "./admin-client";

/** Creates (or finds) the Keycloak user for a player, assigns the player realm role,
 *  and sends Keycloak's own "complete your registration" email. Throws on failure -
 *  callers decide how to handle it (swallow-and-log during auto-registration, or
 *  surface as an error from the admin backfill action). */
export async function provisionKeycloakAccountForPlayer(params: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ keycloakId: string; alreadyExisted: boolean }> {
  const { id, alreadyExisted } = await createKeycloakUser(params);
  await assignRealmRole(id, PLAYER_ROLE_NAME);
  await sendExecuteActionsEmail(id);
  return { keycloakId: id, alreadyExisted };
}
