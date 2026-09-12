import type {
  GameLogEntry,
  GoalieChangeLogEntry,
  GoalkeeperSavesStat,
  GoalkeeperStat,
  GoalLogEntry,
} from "../domain/types";

const DEFAULT_PERIOD_MINUTES = 20;

/** GameRules is a semicolon-separated string, e.g. "60;0;3;20;...", where (verified
 *  against real data) index 0 is total regulation minutes, index 2 is the number of
 *  periods, and index 3 is minutes per period (3 * 20 = 60). Falls back to a standard
 *  20-minute period if the field is missing or doesn't parse, e.g. for an overtime/
 *  shootout period this ratio may not hold exactly - this is a best-effort estimate. */
export function parsePeriodLengthSeconds(gameRules: string | undefined): number {
  const minutes = Number(gameRules?.split(";")[3]);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_PERIOD_MINUTES) * 60;
}

function toAbsoluteSeconds(period: number, gameTime: number, periodLengthSeconds: number): number {
  return (period - 1) * periodLengthSeconds + gameTime;
}

/** The feed's own `GameTime` (on both `GamesUpdate[0]` and every `GameLogsUpdate` entry)
 *  is cumulative across the whole game, not reset per period - verified live: a period-2
 *  event came back with GameTime 1365 (> the 1200s a period holds), and the top-level
 *  GameTime was 1467 while PlayedPeriods was 2. Our domain model instead stores each
 *  entry's `gameTime` as seconds *within* `period` (matching its own doc comment and
 *  what `toAbsoluteSeconds` above expects back), so raw values are converted here,
 *  right at the mapping boundary - getting this wrong previously double-counted a full
 *  period's length into every downstream time-on-ice calculation. `period` is clamped to
 *  at least 1 so an unstarted game (period 0) doesn't produce a negative offset. */
export function toWithinPeriodSeconds(
  period: number,
  cumulativeGameTime: number,
  periodLengthSeconds: number,
): number {
  const clampedPeriod = Math.max(period, 1);
  return Math.max(0, cumulativeGameTime - (clampedPeriod - 1) * periodLengthSeconds);
}

interface GoalieSegment {
  jersey: number;
  start: number;
  end: number;
}

/** A goalie's segment runs from their GK_start to the next goalie-change for the same
 *  team, or to `gameEndAbsolute` if they're still in net. Multiple non-contiguous
 *  segments (pulled, then reinserted) are summed per jersey by the caller. */
function buildGoalieSegments(
  teamId: number,
  log: GameLogEntry[],
  periodLengthSeconds: number,
  gameEndAbsolute: number,
): GoalieSegment[] {
  const changes = log
    .filter((entry): entry is GoalieChangeLogEntry => entry.type === "goalie-change" && entry.teamId === teamId)
    .map((entry) => ({
      jersey: entry.goalieJersey,
      start: toAbsoluteSeconds(entry.period, entry.gameTime, periodLengthSeconds),
    }))
    .sort((a, b) => a.start - b.start);

  return changes.map((change, index) => ({
    jersey: change.jersey,
    start: change.start,
    end: index + 1 < changes.length ? changes[index + 1].start : gameEndAbsolute,
  }));
}

function blankStats(goalkeepers: GoalkeeperSavesStat[]): GoalkeeperStat[] {
  return goalkeepers.map((gk) => ({
    ...gk,
    goalsAgainst: null,
    savePercentage: null,
    goalsAgainstAverage: null,
    timeOnIceSeconds: null,
  }));
}

function enrichTeam(
  goalkeepers: GoalkeeperSavesStat[],
  segments: GoalieSegment[],
  goalsScoredAgainstThisTeam: GoalLogEntry[],
  periodLengthSeconds: number,
): GoalkeeperStat[] {
  return goalkeepers.map((gk) => {
    const ownSegments = segments.filter((segment) => segment.jersey === gk.jersey);
    if (ownSegments.length === 0) {
      // No GK_start events for this jersey - we have no basis to attribute anything,
      // so leave the derived stats null rather than implying "0 goals against".
      return { ...gk, goalsAgainst: null, timeOnIceSeconds: null, savePercentage: null, goalsAgainstAverage: null };
    }

    const timeOnIceSeconds = ownSegments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0);

    const goalsAgainst = goalsScoredAgainstThisTeam.filter((goal) => {
      const at = toAbsoluteSeconds(goal.period, goal.gameTime, periodLengthSeconds);
      return ownSegments.some((segment) => at >= segment.start && at < segment.end);
    }).length;

    return {
      ...gk,
      goalsAgainst,
      timeOnIceSeconds: timeOnIceSeconds > 0 ? timeOnIceSeconds : null,
      savePercentage:
        gk.totalSaves + goalsAgainst > 0 ? (gk.totalSaves / (gk.totalSaves + goalsAgainst)) * 100 : null,
      goalsAgainstAverage: timeOnIceSeconds > 0 ? (goalsAgainst / timeOnIceSeconds) * 3600 : null,
    };
  });
}

/** Attributes goals-against and time-on-ice to each goalkeeper by reconstructing, from
 *  the GK_start log entries, which goalie was in net at the moment of each goal against
 *  their team. There's no explicit "empty net" flag in the feed (every goal we've seen
 *  live had GoalType "" or "YV"), so an empty-net goal would currently still be charged
 *  to whichever goalie's segment it falls in - a known simplification. */
export function attributeGoalieStats(params: {
  homeTeamId: number;
  awayTeamId: number;
  periodLengthSeconds: number;
  currentPeriod: number;
  elapsedSeconds: number;
  log: GameLogEntry[];
  homeGoalkeepers: GoalkeeperSavesStat[];
  awayGoalkeepers: GoalkeeperSavesStat[];
}): { home: GoalkeeperStat[]; away: GoalkeeperStat[] } {
  const { homeTeamId, awayTeamId, periodLengthSeconds, currentPeriod, elapsedSeconds, log } = params;

  if (currentPeriod <= 0) {
    return { home: blankStats(params.homeGoalkeepers), away: blankStats(params.awayGoalkeepers) };
  }

  const gameEndAbsolute = toAbsoluteSeconds(currentPeriod, elapsedSeconds, periodLengthSeconds);
  const homeSegments = buildGoalieSegments(homeTeamId, log, periodLengthSeconds, gameEndAbsolute);
  const awaySegments = buildGoalieSegments(awayTeamId, log, periodLengthSeconds, gameEndAbsolute);

  const goals = log.filter((entry): entry is GoalLogEntry => entry.type === "goal");
  const goalsByHome = goals.filter((goal) => goal.teamId === homeTeamId); // scored by home -> against away
  const goalsByAway = goals.filter((goal) => goal.teamId === awayTeamId); // scored by away -> against home

  return {
    home: enrichTeam(params.homeGoalkeepers, homeSegments, goalsByAway, periodLengthSeconds),
    away: enrichTeam(params.awayGoalkeepers, awaySegments, goalsByHome, periodLengthSeconds),
  };
}
