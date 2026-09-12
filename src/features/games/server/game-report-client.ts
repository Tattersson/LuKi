import { GAME_REPORT_BASE_URL } from "../constants";
import { LeijonatApiError } from "../domain/errors";
import type { LiveGameReport } from "../domain/types";
import { deriveGameStatus } from "./leijonat-client";

interface LeijonatGameReportResponse {
  GamesUpdate: Array<{
    Id: number;
    GameTime: number;
    HomeTeam: { Goals: number };
    AwayTeam: { Goals: number };
    GameStatus: number;
    FinishedType: number;
  }>;
  PeriodSummary?: { PlayedPeriods: number };
}

export async function fetchGameReport(gameId: number, season: number): Promise<LiveGameReport> {
  const url = new URL(GAME_REPORT_BASE_URL);
  url.searchParams.set("gameid", String(gameId));
  url.searchParams.set("season", String(season));

  // Always fresh: this is only called (via the live-report route) for games the schedule
  // already flagged as live, on a short client-side polling cadence.
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new LeijonatApiError(response.status);
  }

  const data: LeijonatGameReportResponse = await response.json();
  const game = data.GamesUpdate[0];

  return {
    gameId: game.Id,
    status: deriveGameStatus(game.GameStatus, game.FinishedType),
    homeGoals: game.HomeTeam.Goals,
    awayGoals: game.AwayTeam.Goals,
    currentPeriod: data.PeriodSummary?.PlayedPeriods ?? 0,
    elapsedSeconds: game.GameTime,
  };
}
