const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface Occurrence {
  start: Date;
  end: Date;
}

/** Generates weekly occurrences starting at `start`/`end` (same duration each time),
 *  repeating every 7 days up to and including `until` (compared by start time), capped
 *  at `maxOccurrences` so an admin can't accidentally create an unbounded series. */
export function computeWeeklyOccurrences(
  start: Date,
  end: Date,
  until: Date,
  maxOccurrences: number,
): Occurrence[] {
  const durationMs = end.getTime() - start.getTime();
  const occurrences: Occurrence[] = [];

  let occurrenceStart = start.getTime();
  while (occurrenceStart <= until.getTime() && occurrences.length < maxOccurrences) {
    occurrences.push({ start: new Date(occurrenceStart), end: new Date(occurrenceStart + durationMs) });
    occurrenceStart += ONE_WEEK_MS;
  }

  return occurrences;
}
