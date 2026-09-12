import { Alert } from "@/components/ui/alert";
import type { PlayerKeycloakStatus } from "../server/keycloak-status";

const REQUIRED_ACTION_LABELS: Record<string, string> = {
  VERIFY_EMAIL: "verify their email",
  UPDATE_PASSWORD: "set a password",
};

function describeRequiredActions(requiredActions: string[]): string {
  if (requiredActions.length === 0) {
    return "verify their email";
  }
  return requiredActions.map((action) => REQUIRED_ACTION_LABELS[action] ?? action).join(", ");
}

export function PlayerKeycloakStatus({ status }: { status: PlayerKeycloakStatus }) {
  switch (status.state) {
    case "not_created":
      return <Alert variant="info">No login created yet.</Alert>;
    case "not_found":
      return (
        <Alert variant="error">
          Login not found in Keycloak - it may have been deleted there. Creating a new login will
          fix this.
        </Alert>
      );
    case "pending":
      return (
        <Alert variant="info">
          Login created - waiting for the player to {describeRequiredActions(status.requiredActions)}.
        </Alert>
      );
    case "active":
      return <Alert variant="success">Login active.</Alert>;
    case "unknown":
      return <Alert variant="error">Could not check Keycloak status. Keycloak may be unreachable.</Alert>;
  }
}
