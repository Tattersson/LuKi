import Link from "next/link";
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

  if (!hasAnyRole(session, [PLAYER_ROLE_NAME])) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Alert variant="error">
          Your account doesn&apos;t have player access yet. Contact an admin if you believe this is
          a mistake.
        </Alert>
      </main>
    );
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Alert variant="error">
          We couldn&apos;t find a player record linked to your account. Contact an admin.
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
