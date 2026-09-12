import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { isAdminAuthBypassEnabled } from "./dev-bypass";

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
      // Newer Keycloak defaults the roles scope's mappers to "Add to ID token: off"
      // (roles go to the access token / userinfo instead, per OIDC best practice).
      // idToken:false makes Auth.js read the userinfo endpoint instead of the ID
      // token, which does include realm_access/resource_access by default.
      idToken: false,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        // ADMIN_ROLE_NAME may be a realm role (realm_access.roles) or a client role
        // (resource_access.<clientId>.roles) - accept either so it works regardless
        // of how the role was created in Keycloak.
        const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "";
        const realmAccess = profile.realm_access as { roles?: string[] } | undefined;
        const resourceAccess = profile.resource_access as
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
