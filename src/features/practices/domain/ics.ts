import { practiceDetailLines, practiceEventTitle } from "../format";
import type { Practice } from "./types";

const FOLD_LENGTH = 75;

/** RFC5545 line folding: lines longer than 75 octets are split across multiple physical
 *  lines, each continuation prefixed by a single space. Approximated here using JS string
 *  length (UTF-16 code units) rather than true UTF-8 octet count - matches the same
 *  simplification games' ICS export makes (see features/games/domain/ics.ts). */
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

/** Formats a Date using its UTC getters as an ICS local date-time (no trailing Z) -
 *  Practice.startAt/endAt are already encoded so their UTC getters equal the intended
 *  Europe/Helsinki wall-clock time (see domain/datetime.ts), so this is pure component
 *  formatting, independent of the server process's own timezone. */
function toICSDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

/** Builds an RFC5545 VCALENDAR feed, one VEVENT per practice occurrence. Times are
 *  emitted with `TZID=Europe/Helsinki` and no `VTIMEZONE` block - the same deliberate
 *  simplification games' ICS export makes, short of full RFC5545 compliance.
 *
 *  Unlike games (never edited locally, so SEQUENCE is hardcoded to 0), practices are
 *  admin-edited, so SEQUENCE is the row's real `version` - this is what makes a
 *  subscribed calendar app treat an edited occurrence as updated rather than a
 *  duplicate. A cancelled occurrence is kept in the feed (not dropped) with
 *  STATUS:CANCELLED, so subscribers see the cancellation rather than the event just
 *  silently disappearing on next refresh. */
export function practicesToICS(practices: Practice[]): string {
  const dtstamp = toICSDateTime(new Date()) + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//LuKi//Practices Calendar//EN",
    "X-WR-CALNAME:LuKi Practices",
    // Refresh-interval hint - many clients (notably Google Calendar) ignore it and re-fetch
    // on their own schedule instead, so this is best-effort, not a guarantee.
    "X-PUBLISHED-TTL:PT30M",
  ];

  for (const practice of practices) {
    const detailLines = practiceDetailLines(practice);

    lines.push(
      "BEGIN:VEVENT",
      `UID:practice-${practice.id}@luki`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Helsinki:${toICSDateTime(practice.startAt)}`,
      `DTEND;TZID=Europe/Helsinki:${toICSDateTime(practice.endAt)}`,
      `SUMMARY:${escapeText(practiceEventTitle(practice))}`,
      `LOCATION:${escapeText(practice.locationName)}`,
    );
    if (detailLines.length > 0) lines.push(`DESCRIPTION:${escapeText(detailLines.join("\n"))}`);
    lines.push(
      `SEQUENCE:${practice.version}`,
      `STATUS:${practice.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
