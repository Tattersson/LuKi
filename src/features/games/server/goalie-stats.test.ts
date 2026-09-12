import { describe, expect, it } from "vitest";
import { attributeGoalieStats, parsePeriodLengthSeconds } from "./goalie-stats";
import type { GameLogEntry, GoalieChangeLogEntry, GoalkeeperSavesStat, GoalLogEntry } from "../domain/types";

describe("parsePeriodLengthSeconds", () => {
  it("reads minutes-per-period from index 3 of the semicolon-separated GameRules", () => {
    expect(parsePeriodLengthSeconds("60;0;3;20;0;0")).toBe(1200);
  });

  it("falls back to 20 minutes when GameRules is missing or unparseable", () => {
    expect(parsePeriodLengthSeconds(undefined)).toBe(1200);
    expect(parsePeriodLengthSeconds("garbage")).toBe(1200);
  });
});

function goalieChange(overrides: Partial<GoalieChangeLogEntry>): GoalieChangeLogEntry {
  return {
    id: "gk",
    period: 1,
    gameTime: 0,
    teamId: 1,
    type: "goalie-change",
    goalieName: "Goalie",
    goalieJersey: 1,
    previousGoalieName: null,
    ...overrides,
  };
}

function goal(overrides: Partial<GoalLogEntry>): GoalLogEntry {
  return {
    id: "goal",
    period: 1,
    gameTime: 0,
    teamId: 1,
    type: "goal",
    scorerName: "Scorer",
    scorerJersey: 9,
    assist1Name: null,
    assist2Name: null,
    homeGoals: 0,
    awayGoals: 0,
    situation: null,
    ...overrides,
  };
}

function gk(overrides: Partial<GoalkeeperSavesStat>): GoalkeeperSavesStat {
  return { name: "Goalie", jersey: 1, totalSaves: 0, savesByPeriod: [], ...overrides };
}

describe("attributeGoalieStats", () => {
  const HOME = 1;
  const AWAY = 2;
  const PERIOD_LENGTH = 1200;

  it("attributes goals against to the goalie in net at that moment, and computes SV%/GAA/TOI", () => {
    const log: GameLogEntry[] = [
      goalieChange({ teamId: HOME, period: 1, gameTime: 0, goalieJersey: 1 }),
      goalieChange({ teamId: AWAY, period: 1, gameTime: 0, goalieJersey: 1 }),
      goal({ teamId: AWAY, period: 1, gameTime: 600 }), // scored by away -> against home goalie
    ];

    const result = attributeGoalieStats({
      homeTeamId: HOME,
      awayTeamId: AWAY,
      periodLengthSeconds: PERIOD_LENGTH,
      currentPeriod: 1,
      elapsedSeconds: 1200,
      log,
      homeGoalkeepers: [gk({ totalSaves: 9, jersey: 1 })],
      awayGoalkeepers: [gk({ totalSaves: 5, jersey: 1, name: "Away Goalie" })],
    });

    expect(result.home[0]).toMatchObject({
      goalsAgainst: 1,
      timeOnIceSeconds: 1200,
      savePercentage: 90,
      goalsAgainstAverage: 3,
    });
    // Away goalie faced no goals (home never scored in this fixture).
    expect(result.away[0]).toMatchObject({ goalsAgainst: 0, timeOnIceSeconds: 1200 });
  });

  it("splits time-on-ice and goals-against across a mid-game goalie change", () => {
    const log: GameLogEntry[] = [
      goalieChange({ teamId: HOME, period: 1, gameTime: 0, goalieJersey: 1, goalieName: "Starter" }),
      // Home pulls the starter for a backup partway through period 2.
      goalieChange({
        teamId: HOME,
        period: 2,
        gameTime: 300,
        goalieJersey: 2,
        goalieName: "Backup",
        previousGoalieName: "Starter",
      }),
      goal({ teamId: AWAY, period: 1, gameTime: 500 }), // against the starter
      goal({ teamId: AWAY, period: 2, gameTime: 100 }), // still against the starter (before the swap)
      goal({ teamId: AWAY, period: 2, gameTime: 700 }), // against the backup (after the swap)
    ];

    const result = attributeGoalieStats({
      homeTeamId: HOME,
      awayTeamId: AWAY,
      periodLengthSeconds: PERIOD_LENGTH,
      currentPeriod: 2,
      elapsedSeconds: 1000,
      log,
      homeGoalkeepers: [gk({ jersey: 1, name: "Starter", totalSaves: 10 }), gk({ jersey: 2, name: "Backup", totalSaves: 4 })],
      awayGoalkeepers: [],
    });

    const [starter, backup] = result.home;
    // Starter: period 1 (1200s) + period 2 up to gameTime 300 (300s) = 1500s, 2 goals against.
    expect(starter).toMatchObject({ timeOnIceSeconds: 1500, goalsAgainst: 2 });
    // Backup: from period 2 gameTime 300 to the current time (period 2, 1000s) = 700s, 1 goal against.
    expect(backup).toMatchObject({ timeOnIceSeconds: 700, goalsAgainst: 1 });
  });

  it("returns all-null derived stats once the game is over (currentPeriod <= 0 guard doesn't apply, but no GK_start does)", () => {
    const result = attributeGoalieStats({
      homeTeamId: HOME,
      awayTeamId: AWAY,
      periodLengthSeconds: PERIOD_LENGTH,
      currentPeriod: 0,
      elapsedSeconds: 0,
      log: [],
      homeGoalkeepers: [gk({ totalSaves: 9 })],
      awayGoalkeepers: [],
    });

    expect(result.home[0]).toMatchObject({
      goalsAgainst: null,
      timeOnIceSeconds: null,
      savePercentage: null,
      goalsAgainstAverage: null,
    });
  });
});
