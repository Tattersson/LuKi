import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPlayerById } from "@/features/players/server/player-repository";
import { getPlayerKeycloakStatus } from "@/features/players/server/keycloak-status";
import { CreatePlayerLoginButton } from "@/features/players/ui/admin/CreatePlayerLoginButton";
import { DeletePlayerButton } from "@/features/players/ui/admin/DeletePlayerButton";
import { PlayerKeycloakStatus } from "@/features/players/ui/PlayerKeycloakStatus";
import { POSITION_LABELS, STICK_SIDE_LABELS } from "@/features/players/constants";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayerById(id);

  if (!player) {
    notFound();
  }

  const keycloakStatus = await getPlayerKeycloakStatus(player.keycloakId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {player.firstName} {player.lastName}
        </h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/players/${player.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <CreatePlayerLoginButton
            playerId={player.id}
            hasKeycloakAccount={player.keycloakId !== null}
          />
          <DeletePlayerButton playerId={player.id} />
        </div>
      </div>

      <PlayerKeycloakStatus status={keycloakStatus} />

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Position</dt>
            <dd>{POSITION_LABELS[player.position]}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Stick side</dt>
            <dd>{STICK_SIDE_LABELS[player.stickSide]}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Height</dt>
            <dd>{player.heightCm !== null ? `${player.heightCm} cm` : "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Weight</dt>
            <dd>{player.weightKg !== null ? `${player.weightKg} kg` : "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Birthdate</dt>
            <dd>{player.birthDate.toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd>{player.email}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Verified</dt>
            <dd>{player.emailVerifiedAt.toLocaleString()}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
