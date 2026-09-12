import Link from "next/link";
import { POSITION_LABELS } from "../../constants";
import type { PlayerSummary } from "../../domain/types";

export function PlayerList({ players }: { players: PlayerSummary[] }) {
  if (players.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No players have registered yet. Share the registration link to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {players.map((player) => (
        <li key={player.id} className="py-3">
          <Link
            href={`/admin/players/${player.id}`}
            className="flex items-center justify-between gap-4 hover:underline"
          >
            <span className="font-medium">
              {player.firstName} {player.lastName}
            </span>
            <span className="flex items-center gap-3 text-sm text-neutral-500">
              {POSITION_LABELS[player.position]}
              <span>{player.email}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
