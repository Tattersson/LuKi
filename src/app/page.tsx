import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoteCodeCard } from "./_components/VoteCodeCard";
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">LuKi</h1>
        <p className="mt-2 text-sm text-neutral-500">Internal team tools.</p>
      </div>

      <VoteCodeCard />

      <GamesSection games={games} />

      <Card className="text-center">
        <h2 className="mb-2 text-sm font-medium">Logging in?</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Team admins can sign in to manage elections and view results.
        </p>
        <Link href="/admin">
          <Button variant="secondary" className="w-full">
            Admin login
          </Button>
        </Link>
      </Card>
    </main>
  );
}
