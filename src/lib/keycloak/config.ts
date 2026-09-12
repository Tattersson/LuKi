function getIssuer(): string {
  const issuer = process.env.KEYCLOAK_ISSUER;
  if (!issuer) throw new Error("KEYCLOAK_ISSUER is not configured");
  return issuer;
}

/** Realm name, derived from the issuer URL (".../realms/{realm}") rather than a
 *  separate env var, so there's a single source of truth for it. */
export function getKeycloakRealmName(): string {
  const match = getIssuer().match(/\/realms\/([^/]+)\/?$/);
  if (!match) {
    throw new Error(`KEYCLOAK_ISSUER is not a realm URL of the form ".../realms/{realm}"`);
  }
  return match[1];
}

function getKeycloakServerRoot(): string {
  const issuer = getIssuer();
  return issuer.replace(/\/realms\/[^/]+\/?$/, "");
}

export function getKeycloakAdminBaseUrl(): string {
  return `${getKeycloakServerRoot()}/admin/realms/${getKeycloakRealmName()}`;
}

export function getKeycloakTokenUrl(): string {
  return `${getIssuer()}/protocol/openid-connect/token`;
}
