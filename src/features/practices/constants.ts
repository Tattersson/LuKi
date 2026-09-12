export const DEFAULT_PRACTICE_DURATION_MINUTES = 60;

/** Caps how many rows one recurring "create" can materialize, so a mistyped end date
 *  (e.g. a year instead of a month out) can't generate an unbounded series. */
export const MAX_SERIES_OCCURRENCES = 52;

export const LOCATION_SEARCH_RESULT_LIMIT = 5;
