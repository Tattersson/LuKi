import { Card } from "@/components/ui/card";
import { listPlayers } from "@/features/players/server/player-repository";
import { PlayerList } from "@/features/players/ui/admin/PlayerList";

export default async function AdminPlayersPage() {
  const players = await listPlayers();
  const registrationUrl = `${process.env.APP_BASE_URL ?? ""}/players/register`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Players</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Players register themselves - share this link for them to create their own
          player card:
        </p>
        <a href={registrationUrl} className="break-all text-sm underline">
          {registrationUrl}
        </a>
      </div>
      <Card>
        <PlayerList players={players} />
      </Card>
    </div>
  );
}
