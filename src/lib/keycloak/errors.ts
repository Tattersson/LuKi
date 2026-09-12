/** Any Keycloak admin API failure - callers treat all of these as retryable (the
 *  registration flow swallows them, and the admin "Create login" action can be
 *  clicked again). */
export class KeycloakAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeycloakAdminError";
  }
}
