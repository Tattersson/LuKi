import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getCurrentSeason } from "@/features/games/constants";
import { fetchFullGameReport } from "@/features/games/server/game-report-client";
import { GameDetailView } from "@/features/games/ui/public/GameDetailView";
import type { GameReportDetail } from "@/features/games/domain/types";

export default async function GameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { gameId: gameIdParam } = await params;
  const { season: seasonParam } = await searchParams;

  const gameId = Number(gameIdParam);
  if (!Number.isInteger(gameId)) {
    notFound();
  }

  const season = seasonParam ? Number(seasonParam) : getCurrentSeason(new Date());
  if (!Number.isInteger(season)) {
    notFound();
  }

  let report: GameReportDetail;
  try {
    report = await fetchFullGameReport(gameId, season);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="error">
          Couldn&apos;t load this game&apos;s report right now. It may not exist, or the source may be
          temporarily unavailable.
        </Alert>
      </div>
    );
  }

  return <GameDetailView gameId={gameId} season={season} initialReport={report} />;
}
