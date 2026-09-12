import { format } from "date-fns";
import { fetchTeamGames } from "./leijonat-client";
import type { GameConflict, TeamGame } from "../domain/types";

function otherTeamGamesForDate(games: TeamGame[], game: TeamGame): TeamGame[] {
  return games.filter((other) => other.team !== game.team && other.dateISO === game.dateISO);
}

function conflictFor(game: TeamGame, otherTeamGamesSameDay: TeamGame[]): GameConflict {
  if (otherTeamGamesSameDay.length === 0) return null;
  const exactTimeMatch = otherTeamGamesSameDay.some(
    (other) => game.time !== null && other.time !== null && other.time === game.time,
  );
  return exactTimeMatch ? "overlap" : "same-day";
}

export function computeConflicts(games: TeamGame[]): TeamGame[] {
  return games.map((game) => ({
    ...game,
    conflict: conflictFor(game, otherTeamGamesForDate(games, game)),
  }));
}

export function sortByDateAndTime(games: TeamGame[]): TeamGame[] {
  return [...games].sort((a, b) => {
    if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1;
    const timeA = a.time ?? "";
    const timeB = b.time ?? "";
    return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
  });
}

export async function listUpcomingGames(now: Date = new Date()): Promise<TeamGame[]> {
  const [teamOneGames, teamTwoGames] = await Promise.all([
    fetchTeamGames("luki-2div", now),
    fetchTeamGames("luki-team", now),
  ]);

  const merged = computeConflicts([...teamOneGames, ...teamTwoGames]);
  const todayISO = format(now, "yyyy-MM-dd");
  return sortByDateAndTime(merged.filter((game) => game.dateISO >= todayISO));
}
