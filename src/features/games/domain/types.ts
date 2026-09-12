export type TeamKey = "luki-2div" | "luki-team";

export interface LeijonatGame {
  GameID: number;
  GameDate: string;
  GameDateDB: string;
  GameTime: string;
  HomeTeam: number;
  AwayTeam: number;
  HomeTeamAbbrv: string;
  AwayTeamAbbrv: string;
  HomeGoals: number;
  AwayGoals: number;
  GameStatus: number;
  FinishedType: number;
  RinkName: string;
  SubSerieName: string;
  LevelName: string;
}

export interface LeijonatLevel {
  LevelName: string;
  LevelID: number;
  Games: LeijonatGame[];
}

/** Leijonat's GameStatus is a finer-grained code than a simple 0/1/2 (a live game we
 *  checked came back as 11, not 1) - possibly period-encoded, but that's not confirmed.
 *  FinishedType is the reliable signal: 0 until the game is over, non-zero once it is
 *  (verified: an old finished game had FinishedType 1; today's live game had 0). So a
 *  game is "live" whenever it's not finished but GameStatus has moved off its 0 (not
 *  started) value. */
export type GameStatus = "upcoming" | "live" | "finished";

/** Relationship to the other team's schedule on the same date:
 *  - "overlap": the other team also plays, at the exact same start time.
 *  - "same-day": the other team also plays that day, but not at the same time
 *    (or one of the two start times isn't known yet).
 *  - null: no game from the other team on this date. */
export type GameConflict = "overlap" | "same-day" | null;

export interface TeamGame {
  id: number;
  /** Needed to poll the game report endpoint, which takes gameId + season. */
  season: number;
  dateISO: string;
  time: string | null;
  opponent: string;
  isHome: boolean;
  rinkName: string;
  status: GameStatus;
  homeGoals: number;
  awayGoals: number;
  levelName: string;
  team: TeamKey;
  teamLabel: string;
  conflict: GameConflict;
}

/** Normalized result of polling the live game report endpoint. Only meaningful while
 *  the game is live; `currentPeriod` is the period currently being played. */
export interface LiveGameReport {
  gameId: number;
  status: GameStatus;
  homeGoals: number;
  awayGoals: number;
  currentPeriod: number;
  elapsedSeconds: number;
}
