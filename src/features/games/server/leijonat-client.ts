import { format } from "date-fns";
import { API_BASE_URL, TEAMS, getCurrentSeason } from "../constants";
import { LeijonatApiError } from "../domain/errors";
import type { GameStatus, LeijonatGame, LeijonatLevel, TeamGame, TeamKey } from "../domain/types";

/** Shared with game-report-client.ts, whose response uses the same GameStatus/FinishedType
 *  fields for the same meaning. See the GameStatus doc comment in domain/types.ts. */
export function deriveGameStatus(gameStatus: number, finishedType: number): GameStatus {
  if (finishedType !== 0) return "finished";
  if (gameStatus !== 0) return "live";
  return "upcoming";
}

export function mapLeijonatGame(game: LeijonatGame, team: TeamKey, season: number): TeamGame {
  const { teamId, label } = TEAMS[team];
  const isHome = game.HomeTeam === teamId;

  return {
    id: game.GameID,
    season,
    dateISO: game.GameDateDB,
    time: game.GameTime || null,
    opponent: isHome ? game.AwayTeamAbbrv : game.HomeTeamAbbrv,
    isHome,
    rinkName: game.RinkName,
    status: deriveGameStatus(game.GameStatus, game.FinishedType),
    homeGoals: game.HomeGoals,
    awayGoals: game.AwayGoals,
    levelName: game.LevelName,
    team,
    teamLabel: label,
    conflict: null,
  };
}

export async function fetchTeamGames(team: TeamKey, now: Date = new Date()): Promise<TeamGame[]> {
  const { teamId, subSerieId } = TEAMS[team];
  const dog = format(now, "yyyy-MM-dd");
  const season = getCurrentSeason(now);

  const url = new URL(API_BASE_URL);
  url.searchParams.set("dwl", "0");
  url.searchParams.set("season", String(season));
  url.searchParams.set("subSerieId", String(subSerieId));
  url.searchParams.set("teamid", String(teamId));
  url.searchParams.set("districtid", "0");
  url.searchParams.set("gamedays", "3");
  url.searchParams.set("dog", dog);
  url.searchParams.set("levelid", "-1");

  // Short revalidate window: the front page shows a live-game indicator, so a full
  // hour of staleness (fine for a fixed schedule) would leave it visibly wrong.
  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new LeijonatApiError(response.status);
  }

  const levels: LeijonatLevel[] = await response.json();
  return levels.flatMap((level) => level.Games.map((game) => mapLeijonatGame(game, team, season)));
}
