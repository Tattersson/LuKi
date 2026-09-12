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

interface GameLogEntryBase {
  /** Stable React key: derived from the raw event's own Key/index, unique per game. */
  id: string;
  period: number;
  /** Seconds elapsed within `period` when this happened. */
  gameTime: number;
  teamId: number;
}

export interface GoalLogEntry extends GameLogEntryBase {
  type: "goal";
  scorerName: string;
  scorerJersey: number;
  assist1Name: string | null;
  assist2Name: string | null;
  homeGoals: number;
  awayGoals: number;
  /** e.g. "Power play" - derived from the raw GoalType code ("YV" is the only one seen
   *  live so far); an unrecognized code is shown as-is rather than dropped. */
  situation: string | null;
}

export interface PenaltyLogEntry extends GameLogEntryBase {
  type: "penalty";
  playerName: string;
  playerJersey: number;
  minutesLabel: string;
  reason: string;
}

export interface TimeoutLogEntry extends GameLogEntryBase {
  type: "timeout";
}

export interface GoalieChangeLogEntry extends GameLogEntryBase {
  type: "goalie-change";
  goalieName: string;
  goalieJersey: number;
  /** null when this is the starting goalie for the game, not a mid-game change. */
  previousGoalieName: string | null;
}

export type GameLogEntry = GoalLogEntry | PenaltyLogEntry | TimeoutLogEntry | GoalieChangeLogEntry;

export interface GoalkeeperPeriodSaves {
  /** 0 means "game total", matching the raw feed's own convention. */
  period: number;
  saves: number;
}

export interface GoalkeeperSavesStat {
  name: string;
  jersey: number;
  totalSaves: number;
  savesByPeriod: GoalkeeperPeriodSaves[];
}

/** Derived stats (goalsAgainst/savePercentage/goalsAgainstAverage/timeOnIceSeconds) are
 *  computed from the game log (see server/goalie-stats.ts) rather than given directly by
 *  the feed, since it never reports goals-against or time-on-ice per goalkeeper. They're
 *  null when they can't be determined (game hasn't started, or no goalie-change events to
 *  establish who was in net when). */
export interface GoalkeeperStat extends GoalkeeperSavesStat {
  goalsAgainst: number | null;
  /** 0-100 */
  savePercentage: number | null;
  /** Goals allowed per 60 minutes of ice time. */
  goalsAgainstAverage: number | null;
  timeOnIceSeconds: number | null;
}

export interface GameReportDetail {
  gameId: number;
  season: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  status: GameStatus;
  currentPeriod: number;
  elapsedSeconds: number;
  rinkName: string;
  startDate: string;
  startTime: string;
  levelName: string;
  subSerieName: string;
  referees: Array<{ role: string; name: string }>;
  homeGoalkeepers: GoalkeeperStat[];
  awayGoalkeepers: GoalkeeperStat[];
  /** Chronological, oldest first - the UI decides display order/grouping. */
  log: GameLogEntry[];
}
