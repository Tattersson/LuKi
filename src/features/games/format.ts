import type { TeamGame } from "./domain/types";

export function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Shared between the calendar view (event title/tooltip) and the ICS export (SUMMARY),
 *  so both surfaces describe a game the same way. */
export function gameEventTitle(game: TeamGame): string {
  return `${game.teamLabel}: ${game.isHome ? "Home" : "Away"} vs ${game.opponent}`;
}

/** Extra facts about a game beyond its title/location - the same ones GameRow already
 *  shows in the list view (score, conflicts). Used for the calendar's hover tooltip and
 *  the ICS export's DESCRIPTION; each line is only included when it's actually known. */
export function gameDetailLines(game: TeamGame): string[] {
  const lines: string[] = [];

  if (game.time) lines.push(`Time: ${game.time.slice(0, 5)}`);

  if (game.status !== "upcoming") {
    lines.push(`Score: ${game.homeGoals} - ${game.awayGoals}${game.status === "live" ? " (live)" : ""}`);
  }

  if (game.conflict === "overlap") lines.push("Overlaps with the other team's game (same start time)");
  else if (game.conflict === "same-day") lines.push("Also a game day for the other team");

  return lines;
}
