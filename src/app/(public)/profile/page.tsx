import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { hasAnyRole, PLAYER_ROLE_NAME } from "@/lib/auth/rbac";
import { getCurrentPlayer } from "@/features/players/server/current-player";
import { getPlayerKeycloakStatus } from "@/features/players/server/keycloak-status";
import { PlayerKeycloakStatus } from "@/features/players/ui/PlayerKeycloakStatus";
import { PlayerProfileEditForm } from "@/features/players/ui/public/PlayerProfileEditForm";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Alert variant="info">
          <Link href="/api/auth/signin" className="underline">
            Sign in
          </Link>{" "}
          to view your profile.
        </Alert>
      </main>
    );
  }

  // Logged in but no linked player card at all (e.g. a Keycloak account created
  // outside the self-service flow, or one that never finished it) - send them to
  // register rather than dead-ending on a "contact an admin" message, since
  // completing registration is a self-service fix (it creates the player card and,
  // for an existing Keycloak account, re-links + assigns the player role to it).
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/players/register");
  }

  if (!hasAnyRole(session, [PLAYER_ROLE_NAME])) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Alert variant="error">
          Your player role hasn&apos;t taken effect on this session yet - try signing out and back
          in. Contact an admin if that doesn&apos;t help.
        </Alert>
      </main>
    );
  }

  const keycloakStatus = await getPlayerKeycloakStatus(player.keycloakId);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Your profile</h1>

      <Card className="space-y-2">
        <div className="text-sm">
          <span className="text-neutral-500">Email: </span>
          {player.email}
        </div>
        <PlayerKeycloakStatus status={keycloakStatus} />
      </Card>

      <Card>
        <PlayerProfileEditForm player={player} />
      </Card>
    </main>
  );
}
