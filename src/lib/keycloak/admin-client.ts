import { getKeycloakAdminBaseUrl, getKeycloakTokenUrl } from "./config";
import { KeycloakAdminError } from "./errors";

/** Keycloak error responses are small JSON bodies (e.g. {"error":"...","error_description":"..."})
 *  - surfacing them is the difference between "403" and knowing which permission is missing. */
async function describeError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text ? `${response.status}: ${text}` : `${response.status}`;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchAdminToken(): Promise<{ value: string; expiresAt: number }> {
  const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new KeycloakAdminError(
      "KEYCLOAK_ADMIN_CLIENT_ID/KEYCLOAK_ADMIN_CLIENT_SECRET are not configured",
    );
  }

  const response = await fetch(getKeycloakTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      // Explicitly request the "roles" scope - without it, Keycloak omits
      // resource_access (client role mappings, e.g. realm-management's manage-users)
      // from the token regardless of Full Scope Allowed, and the admin REST API then
      // sees no permissions at all.
      scope: "roles",
    }),
  });

  if (!response.ok) {
    throw new KeycloakAdminError(`Failed to obtain a Keycloak admin token (${await describeError(response)})`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  return { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
}

/** In-memory cache is per server process - fine here since the app runs as a
 *  long-lived container, not per-request serverless. */
async function getAdminToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 5_000) {
    return cachedToken.value;
  }
  cachedToken = await fetchAdminToken();
  return cachedToken.value;
}

async function keycloakAdminFetch(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = await getAdminToken();
  const response = await fetch(`${getKeycloakAdminBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 401 && retry) {
    cachedToken = null;
    return keycloakAdminFetch(path, init, false);
  }

  return response;
}

export interface KeycloakUserSummary {
  id: string;
  email: string | null;
  enabled: boolean;
  emailVerified: boolean;
  requiredActions: string[];
}

/** Fetches the current state of a Keycloak user directly from Keycloak (there are no
 *  webhooks, so this is the only way to know whether a player has actually finished
 *  setting up their account). Returns null if the user no longer exists in Keycloak
 *  (e.g. it was deleted there after we stored its id). */
export async function getKeycloakUserById(userId: string): Promise<KeycloakUserSummary | null> {
  const response = await keycloakAdminFetch(`/users/${userId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new KeycloakAdminError(`Failed to fetch Keycloak user (${await describeError(response)})`);
  }

  const user = (await response.json()) as {
    id: string;
    email?: string;
    enabled?: boolean;
    emailVerified?: boolean;
    requiredActions?: string[];
  };
  return {
    id: user.id,
    email: user.email ?? null,
    enabled: user.enabled ?? false,
    emailVerified: user.emailVerified ?? false,
    requiredActions: user.requiredActions ?? [],
  };
}

/** Looks a user up by username rather than the email query param - every Keycloak
 *  user this app creates has its username set equal to the player's email (see
 *  createKeycloakUser below), so this is the reliable way to find "the Keycloak user
 *  for this player's registered email" given only that email. */
export async function findKeycloakUserByUsername(username: string): Promise<{ id: string } | null> {
  const response = await keycloakAdminFetch(
    `/users?username=${encodeURIComponent(username)}&exact=true`,
  );
  if (!response.ok) {
    throw new KeycloakAdminError(`Failed to look up Keycloak user by username (${await describeError(response)})`);
  }
  const users = (await response.json()) as Array<{ id: string }>;
  return users[0] ?? null;
}

/** Creates the Keycloak user (username = email), required actions get added
 *  separately via sendExecuteActionsEmail. On a 409 (already exists - e.g. a retry
 *  after a partially-failed provisioning run), looks the user up instead of failing,
 *  so callers can treat this as idempotent. */
export async function createKeycloakUser(params: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ id: string; alreadyExisted: boolean }> {
  const response = await keycloakAdminFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      username: params.email,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      enabled: true,
      emailVerified: false,
    }),
  });

  if (response.status === 201) {
    const location = response.headers.get("Location");
    const id = location?.split("/").pop();
    if (!id) {
      throw new KeycloakAdminError("Keycloak did not return a user id for the created user");
    }
    return { id, alreadyExisted: false };
  }

  if (response.status === 409) {
    const existing = await findKeycloakUserByUsername(params.email);
    if (existing) {
      return { id: existing.id, alreadyExisted: true };
    }
  }

  throw new KeycloakAdminError(`Failed to create Keycloak user (${await describeError(response)})`);
}

/** Idempotent - re-assigning an already-mapped role is a no-op in Keycloak. */
export async function assignRealmRole(userId: string, roleName: string): Promise<void> {
  const roleResponse = await keycloakAdminFetch(`/roles/${encodeURIComponent(roleName)}`);
  if (!roleResponse.ok) {
    throw new KeycloakAdminError(
      `Failed to look up Keycloak realm role "${roleName}" (${await describeError(roleResponse)})`,
    );
  }
  const role = (await roleResponse.json()) as { id: string; name: string };

  const assignResponse = await keycloakAdminFetch(`/users/${userId}/role-mappings/realm`, {
    method: "POST",
    body: JSON.stringify([{ id: role.id, name: role.name }]),
  });
  if (!assignResponse.ok) {
    throw new KeycloakAdminError(
      `Failed to assign Keycloak realm role "${roleName}" (${await describeError(assignResponse)})`,
    );
  }
}

/** Deletes the Keycloak user, revoking their login entirely. A 404 (already gone -
 *  e.g. deleted directly in Keycloak, or a retry after a partial failure) is treated
 *  as success rather than an error, since the end state either way is "no account". */
export async function deleteKeycloakUser(userId: string): Promise<void> {
  const response = await keycloakAdminFetch(`/users/${userId}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new KeycloakAdminError(`Failed to delete Keycloak user (${await describeError(response)})`);
  }
}

/** Keycloak sends its own branded email with a secure, time-limited action-token
 *  link - no custom token/email flow needed on our side. */
export async function sendExecuteActionsEmail(
  userId: string,
  actions: string[] = ["VERIFY_EMAIL", "UPDATE_PASSWORD"],
): Promise<void> {
  const response = await keycloakAdminFetch(`/users/${userId}/execute-actions-email`, {
    method: "PUT",
    body: JSON.stringify(actions),
  });
  if (!response.ok) {
    throw new KeycloakAdminError(
      `Failed to send the Keycloak execute-actions email (${await describeError(response)})`,
    );
  }
}
