import { GAME_REPORT_BASE_URL } from "../constants";
import { LeijonatApiError } from "../domain/errors";
import type {
  GameLogEntry,
  GameReportDetail,
  GoalkeeperSavesStat,
  LiveGameReport,
} from "../domain/types";
import { attributeGoalieStats, parsePeriodLengthSeconds, toWithinPeriodSeconds } from "./goalie-stats";
import { deriveGameStatus } from "./leijonat-client";

interface RawGoalEntry {
  Type: "Goal";
  Period: number;
  GameTime: number;
  TeamId: number;
  ScorerName: string;
  ScorerJersey: number;
  FirstAssistName?: string;
  SecondAssistName?: string;
  HomeTeamGoals: number;
  AwayTeamGoals: number;
  GoalType: string;
}

interface RawPenaltyEntry {
  Type: "Penalty";
  Period: number;
  GameTime: number;
  TeamId: number;
  Name: string;
  Jersey: number;
  PenaltyMinutes: string;
  PenaltyReasonsEN: string;
}

interface RawTimeoutEntry {
  Type: "Timeout";
  Period: number;
  GameTime: number;
  TeamId: number;
}

/** Covers GK_start (game-opening assignment), GK_in (goalie returns) and GK_out (pulled
 *  for an extra attacker) - all three share this exact shape on the feed. A GK_out's own
 *  GoalkeeperJersey/Name is the feed's "nobody in net" marker (0 / " "); the goalie who
 *  actually left is in the Previous* fields instead. */
interface RawGoalieEventEntry {
  Type: "GK_start" | "GK_in" | "GK_out";
  Period: number;
  GameTime: number;
  TeamId: number;
  GoalkeeperName: string;
  GoalkeeperJersey: number;
  PreviousGoalkeeperName: string | null;
  PreviousGoalkeeperJersey: number | null;
}

type RawGameLogEntry = RawGoalEntry | RawPenaltyEntry | RawTimeoutEntry | RawGoalieEventEntry;

interface RawGoalkeeperSummaryTeam {
  TeamName: string;
  TeamGoalkeepers: Array<{
    GkName: string;
    GkJersey: number;
    GkSaves: Array<{ Period: number; Saves: number }>;
  }>;
}

interface LeijonatGameReportResponse {
  GamesUpdate: Array<{
    Id: number;
    GameTime: number;
    Arena: string;
    StartDate: string;
    StartTime: string;
    SubSerieName: string;
    LevelName: string;
    HomeTeam: { Name: string; Goals: number; Id: number };
    AwayTeam: { Name: string; Goals: number; Id: number };
    GameStatus: number;
    FinishedType: number;
    GameRules: string;
  }>;
  GameLogsUpdate?: RawGameLogEntry[];
  PeriodSummary?: { PlayedPeriods: number };
  GoalkeeperSummary?: RawGoalkeeperSummaryTeam[];
  Referees?: Array<{ RefereeRole: string; RefereeName: string }>;
}

/** Known GoalType codes seen on the live feed; anything else is shown as-is rather
 *  than silently dropped. */
const GOAL_SITUATION_LABELS: Record<string, string> = {
  YV: "Power play",
  AV: "Shorthanded",
};

function toGoalSituation(goalType: string): string | null {
  if (!goalType) return null;
  return GOAL_SITUATION_LABELS[goalType] ?? goalType;
}

function toNullableName(name: string | undefined | null): string | null {
  return name && name.trim() ? name : null;
}

/** Returns null for a log entry type the feed hasn't shown us before, so an unfamiliar
 *  future event type gets dropped from the log rather than crashing the page. */
function mapLogEntry(raw: RawGameLogEntry, index: number, periodLengthSeconds: number): GameLogEntry | null {
  const base = {
    id: `${raw.Type}_${index}`,
    period: raw.Period,
    gameTime: toWithinPeriodSeconds(raw.Period, raw.GameTime, periodLengthSeconds),
    teamId: raw.TeamId,
  };

  switch (raw.Type) {
    case "Goal":
      return {
        ...base,
        type: "goal",
        scorerName: raw.ScorerName,
        scorerJersey: raw.ScorerJersey,
        assist1Name: toNullableName(raw.FirstAssistName),
        assist2Name: toNullableName(raw.SecondAssistName),
        homeGoals: raw.HomeTeamGoals,
        awayGoals: raw.AwayTeamGoals,
        situation: toGoalSituation(raw.GoalType),
      };
    case "Penalty":
      return {
        ...base,
        type: "penalty",
        playerName: raw.Name,
        playerJersey: raw.Jersey,
        minutesLabel: raw.PenaltyMinutes,
        reason: raw.PenaltyReasonsEN,
      };
    case "Timeout":
      return { ...base, type: "timeout" };
    case "GK_start":
    case "GK_in":
    case "GK_out":
      return {
        ...base,
        type: "goalie-change",
        goalieName: raw.GoalkeeperName,
        goalieJersey: raw.GoalkeeperJersey,
        previousGoalieName: toNullableName(raw.PreviousGoalkeeperName),
        previousGoalieJersey: raw.PreviousGoalkeeperJersey,
      };
    default:
      return null;
  }
}

function toGoalkeeperStats(team: RawGoalkeeperSummaryTeam): GoalkeeperSavesStat[] {
  return team.TeamGoalkeepers.map((gk) => ({
    name: gk.GkName,
    jersey: gk.GkJersey,
    totalSaves: gk.GkSaves.find((s) => s.Period === 0)?.Saves ?? 0,
    savesByPeriod: gk.GkSaves.filter((s) => s.Period !== 0).map((s) => ({
      period: s.Period,
      saves: s.Saves,
    })),
  }));
}

async function fetchRawGameReport(gameId: number, season: number): Promise<LeijonatGameReportResponse> {
  const url = new URL(GAME_REPORT_BASE_URL);
  url.searchParams.set("gameid", String(gameId));
  url.searchParams.set("season", String(season));

  // Always fresh: this is only called on a short client-side polling cadence, for
  // games already known (or about) to be live.
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new LeijonatApiError(response.status);
  }

  return response.json();
}

export async function fetchGameReport(gameId: number, season: number): Promise<LiveGameReport> {
  const data = await fetchRawGameReport(gameId, season);
  const game = data.GamesUpdate[0];
  const currentPeriod = data.PeriodSummary?.PlayedPeriods ?? 0;
  const periodLengthSeconds = parsePeriodLengthSeconds(game.GameRules);

  return {
    gameId: game.Id,
    status: deriveGameStatus(game.GameStatus, game.FinishedType),
    homeGoals: game.HomeTeam.Goals,
    awayGoals: game.AwayTeam.Goals,
    currentPeriod,
    elapsedSeconds: toWithinPeriodSeconds(currentPeriod, game.GameTime, periodLengthSeconds),
  };
}

export async function fetchFullGameReport(gameId: number, season: number): Promise<GameReportDetail> {
  const data = await fetchRawGameReport(gameId, season);
  const game = data.GamesUpdate[0];

  const goalkeeperTeams = data.GoalkeeperSummary ?? [];
  const homeGoalkeeperTeam = goalkeeperTeams.find((t) => t.TeamName === game.HomeTeam.Name);
  const awayGoalkeeperTeam = goalkeeperTeams.find((t) => t.TeamName === game.AwayTeam.Name);

  const currentPeriod = data.PeriodSummary?.PlayedPeriods ?? 0;
  const periodLengthSeconds = parsePeriodLengthSeconds(game.GameRules);
  const elapsedSeconds = toWithinPeriodSeconds(currentPeriod, game.GameTime, periodLengthSeconds);
  const log = (data.GameLogsUpdate ?? []).flatMap((entry, index) => {
    const mapped = mapLogEntry(entry, index, periodLengthSeconds);
    return mapped ? [mapped] : [];
  });

  const { home: homeGoalkeepers, away: awayGoalkeepers } = attributeGoalieStats({
    homeTeamId: game.HomeTeam.Id,
    awayTeamId: game.AwayTeam.Id,
    periodLengthSeconds,
    currentPeriod,
    elapsedSeconds,
    log,
    homeGoalkeepers: homeGoalkeeperTeam ? toGoalkeeperStats(homeGoalkeeperTeam) : [],
    awayGoalkeepers: awayGoalkeeperTeam ? toGoalkeeperStats(awayGoalkeeperTeam) : [],
  });

  return {
    gameId: game.Id,
    season,
    homeTeamId: game.HomeTeam.Id,
    awayTeamId: game.AwayTeam.Id,
    homeTeamName: game.HomeTeam.Name,
    awayTeamName: game.AwayTeam.Name,
    homeGoals: game.HomeTeam.Goals,
    awayGoals: game.AwayTeam.Goals,
    status: deriveGameStatus(game.GameStatus, game.FinishedType),
    currentPeriod,
    elapsedSeconds,
    rinkName: game.Arena,
    startDate: game.StartDate,
    startTime: game.StartTime,
    levelName: game.LevelName,
    subSerieName: game.SubSerieName,
    referees: (data.Referees ?? []).map((r) => ({ role: r.RefereeRole, name: r.RefereeName })),
    homeGoalkeepers,
    awayGoalkeepers,
    log,
  };
}
