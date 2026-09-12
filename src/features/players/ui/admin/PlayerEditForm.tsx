"use client";

import { useRouter } from "next/navigation";
import { PlayerDetailsForm, type PlayerDetailsFormInitialData } from "../PlayerDetailsForm";
import { updatePlayerAction } from "../../server/actions";

export type PlayerEditFormInitialData = PlayerDetailsFormInitialData;

export function PlayerEditForm({ player }: { player: PlayerEditFormInitialData }) {
  const router = useRouter();

  return (
    <PlayerDetailsForm
      player={player}
      onSubmit={(values) => updatePlayerAction({ playerId: player.id, ...values })}
      onSuccess={() => router.push(`/admin/players/${player.id}`)}
    />
  );
}
