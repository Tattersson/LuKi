/**
 * The club only operates in one timezone (Europe/Helsinki), and Practice rows cross a
 * real persistence boundary (unlike games, which are re-fetched fresh within a single
 * request) - so unlike GamesCalendar's "self-consistent local Date" trick, practices
 * need a convention that survives a database round-trip regardless of which timezone
 * the writing/reading process happens to run in.
 *
 * The convention: a wall-clock Europe/Helsinki date-time is encoded as a Date whose
 * *UTC* getters equal those wall-clock components (the same trick games' ICS export
 * uses for DTSTART/DTEND, see features/games/domain/ics.ts) - applied consistently
 * everywhere a Practice's startAt/endAt is written or read, so it never depends on the
 * host's own timezone. Always go through these helpers rather than touching a
 * Practice's startAt/endAt with local Date getters/setters or date-fns `format`
 * directly.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parses a `<input type="datetime-local">` value (or a `${date}T00:00` built from a
 *  plain `<input type="date">`) into the wall-clock-encoded Date convention above. */
export function datetimeLocalToWallClockDate(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

/** Inverse of datetimeLocalToWallClockDate - formats a wall-clock-encoded Date back
 *  into a `<input type="datetime-local">` value. */
export function wallClockDateToDatetimeLocal(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  );
}

/** Re-anchors a wall-clock-encoded Date onto the equivalent *local* Date object, so
 *  display code that reads local getters (date-fns `format`, react-big-calendar) shows
 *  the intended wall-clock time regardless of the host process's own timezone. */
export function toLocalDisplayDate(date: Date): Date {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}
