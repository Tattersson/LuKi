import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getPlayerById } from "@/features/players/server/player-repository";
import { PlayerEditForm } from "@/features/players/ui/admin/PlayerEditForm";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayerById(id);

  if (!player) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Edit {player.firstName} {player.lastName}
      </h1>
      <Card>
        <PlayerEditForm player={player} />
      </Card>
    </div>
  );
}
