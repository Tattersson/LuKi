import { ASSUMED_GAME_DURATION_MINUTES } from "../constants";
import { gameDetailLines, gameEventTitle } from "../format";
import type { TeamGame } from "./types";

const FOLD_LENGTH = 75;

/** RFC5545 line folding: lines longer than 75 octets are split across multiple physical
 *  lines, each continuation prefixed by a single space. Approximated here using JS string
 *  length (UTF-16 code units) rather than true UTF-8 octet count - close enough for the
 *  short, mostly-ASCII fields this feed emits (team/opponent/rink names). */
function foldLine(line: string): string {
  if (line.length <= FOLD_LENGTH) return line;

  let folded = line.slice(0, FOLD_LENGTH);
  let rest = line.slice(FOLD_LENGTH);
  const CONTINUATION_LENGTH = FOLD_LENGTH - 1; // 1 char reserved for the leading space
  while (rest.length > 0) {
    folded += "\r\n " + rest.slice(0, CONTINUATION_LENGTH);
    rest = rest.slice(CONTINUATION_LENGTH);
  }
  return folded;
}

/** Escapes a TEXT value per RFC5545 §3.3.11. Backslash must be escaped first so it
 *  doesn't double-escape the backslashes introduced by the other replacements. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formats a Date using its UTC getters as an ICS local date-time (no trailing Z). Callers
 *  that want to express the *actual* Finnish wall-clock time build the Date with
 *  `Date.UTC(...)` from the raw year/month/day/hour/minute components (see `gameStart`) so
 *  this is pure component arithmetic, independent of the server process's own timezone. */
function toICSDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

function gameStart(game: TeamGame): Date {
  const [year, month, day] = game.dateISO.split("-").map(Number);
  const [hours, minutes] = (game.time ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

function gameEnd(start: Date): Date {
  return new Date(start.getTime() + ASSUMED_GAME_DURATION_MINUTES * 60_000);
}

/** Builds an RFC5545 VCALENDAR feed, one VEVENT per game. Times are emitted with
 *  `TZID=Europe/Helsinki` and no `VTIMEZONE` block - Google/Apple/Outlook all accept a bare
 *  IANA zone id, but this is a deliberate simplification short of full RFC5545 compliance. */
export function gamesToICS(games: TeamGame[]): string {
  const dtstamp = toICSDateTime(new Date()) + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//LuKi//Games Calendar//EN",
    "X-WR-CALNAME:LuKi Games",
    // Refresh-interval hint - many clients (notably Google Calendar) ignore it and re-fetch
    // on their own schedule instead, so this is best-effort, not a guarantee.
    "X-PUBLISHED-TTL:PT30M",
  ];

  for (const game of games) {
    const start = gameStart(game);
    const end = gameEnd(start);
    const detailLines = gameDetailLines(game);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${game.team}-${game.id}@luki`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Helsinki:${toICSDateTime(start)}`,
      `DTEND;TZID=Europe/Helsinki:${toICSDateTime(end)}`,
      `SUMMARY:${escapeText(gameEventTitle(game))}`,
      `LOCATION:${escapeText(game.rinkName)}`,
    );
    if (detailLines.length > 0) lines.push(`DESCRIPTION:${escapeText(detailLines.join("\n"))}`);
    lines.push("SEQUENCE:0", "END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
