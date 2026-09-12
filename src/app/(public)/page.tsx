import { listUpcomingGames } from "@/features/games/server/game-repository";
import { GamesSection } from "@/features/games/ui/public/GamesSection";
import type { TeamGame } from "@/features/games/domain/types";

async function getUpcomingGamesOrEmpty(): Promise<TeamGame[]> {
  try {
    return await listUpcomingGames();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const games = await getUpcomingGamesOrEmpty();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <GamesSection games={games} />
    </main>
  );
}
