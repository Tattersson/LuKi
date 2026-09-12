import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { isAdminAuthBypassEnabled } from "./dev-bypass";

/** Decodes a JWT's payload without verifying its signature - safe here because this
 *  is the access token Auth.js itself just received directly from Keycloak's token
 *  endpoint over TLS, not a token supplied by the end user. */
function decodeJwtPayload(jwt: string): Record<string, unknown> | undefined {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return undefined;
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return undefined;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      // Auth.js's default scope for this provider doesn't include "roles" - without
      // it, Keycloak won't include realm_access/resource_access in the token unless
      // the "roles" client scope is set to Default (not Optional) on the client.
      // Requesting it explicitly here works either way.
      authorization: { params: { scope: "openid email profile roles" } },
      // Historically this also made Auth.js read realm_access/resource_access from
      // the userinfo endpoint instead of the ID token. That data is read directly off
      // the access token in the jwt() callback below instead now (see
      // decodeJwtPayload) - a realm's "roles" mapper can have "Add to userinfo"/"Add
      // to ID token" turned off independently of "Add to access token", so the access
      // token is the one place this reliably shows up regardless of that setting.
      idToken: false,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account }) {
      // Read realm_access/resource_access from the access token itself rather than
      // from `profile` (userinfo/ID token) - those depend on each Keycloak role
      // mapper's separate "Add to userinfo"/"Add to ID token" toggles, which have
      // been seen disabled on some realms even though "Add to access token" (the
      // mapper default, and what any resource server relies on) stays on regardless.
      if (account?.access_token) {
        const payload = decodeJwtPayload(account.access_token);
        // ADMIN_ROLE_NAME may be a realm role (realm_access.roles) or a client role
        // (resource_access.<clientId>.roles) - accept either so it works regardless
        // of how the role was created in Keycloak.
        const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "";
        const realmAccess = payload?.realm_access as { roles?: string[] } | undefined;
        const resourceAccess = payload?.resource_access as
          | Record<string, { roles?: string[] } | undefined>
          | undefined;
        token.roles = [
          ...(realmAccess?.roles ?? []),
          ...(resourceAccess?.[clientId]?.roles ?? []),
        ];
      }
      return token;
    },
    session({ session, token }) {
      session.user.roles = (token.roles as string[] | undefined) ?? [];
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Middleware only gates authentication (must be signed in). Role-based
    // authorization for the admin area is a separate check - see rbac.ts -
    // because this callback can't distinguish "not signed in" from
    // "signed in but missing the admin role" and route them differently.
    authorized({ auth, request }) {
      const isAdminPath = request.nextUrl.pathname.startsWith("/admin");
      if (!isAdminPath) return true;
      if (isAdminAuthBypassEnabled()) return true;
      return !!auth?.user;
    },
  },
};
