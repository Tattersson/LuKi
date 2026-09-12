import { getKeycloakUserById } from "@/lib/keycloak/admin-client";

export type PlayerKeycloakStatus =
  | { state: "not_created" }
  | { state: "not_found" }
  | { state: "pending"; requiredActions: string[] }
  | { state: "active" }
  | { state: "unknown" };

/** There are no webhooks, so this is the only way to know whether a player has
 *  actually finished setting up their Keycloak login - fetches the live account state
 *  every time it's called (see the player detail page, which calls this on each
 *  load). Never throws - Keycloak being unreachable degrades to "unknown" rather than
 *  breaking the page. */
export async function getPlayerKeycloakStatus(
  keycloakId: string | null,
): Promise<PlayerKeycloakStatus> {
  if (!keycloakId) {
    return { state: "not_created" };
  }

  try {
    const user = await getKeycloakUserById(keycloakId);
    if (!user) {
      return { state: "not_found" };
    }
    if (!user.enabled || !user.emailVerified || user.requiredActions.length > 0) {
      return { state: "pending", requiredActions: user.requiredActions };
    }
    return { state: "active" };
  } catch (error) {
    console.error("Failed to check Keycloak account status for player", keycloakId, error);
    return { state: "unknown" };
  }
}
