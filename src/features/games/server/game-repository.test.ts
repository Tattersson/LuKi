import { afterEach, describe, expect, it, vi } from "vitest";
import { computeConflicts, listUpcomingGames, sortByDateAndTime } from "./game-repository";
import type { LeijonatGame, LeijonatLevel, TeamGame } from "../domain/types";

function makeGame(overrides: Partial<TeamGame> = {}): TeamGame {
  return {
    id: 1,
    season: 2027,
    dateISO: "2026-11-14",
    time: "18:00:00",
    opponent: "Chiefs",
    isHome: true,
    rinkName: "Luvia",
    status: "upcoming",
    homeGoals: 0,
    awayGoals: 0,
    levelName: "II-divisioona",
    team: "luki-2div",
    teamLabel: "LuKi II.Div",
    conflict: null,
    ...overrides,
  };
}

describe("computeConflicts", () => {
  it("flags an exact-time match between the two teams as an overlap", () => {
    const teamOneGame = makeGame({ id: 1, team: "luki-2div", dateISO: "2026-11-14", time: "18:00:00" });
    const teamTwoGame = makeGame({ id: 2, team: "luki-team", dateISO: "2026-11-14", time: "18:00:00" });

    const [a, b] = computeConflicts([teamOneGame, teamTwoGame]);
    expect(a.conflict).toBe("overlap");
    expect(b.conflict).toBe("overlap");
  });

  it("flags a same-day pair with different times as same-day, not overlap", () => {
    const teamOneGame = makeGame({ id: 1, team: "luki-2div", dateISO: "2026-10-31", time: "14:30:00" });
    const teamTwoGame = makeGame({ id: 2, team: "luki-team", dateISO: "2026-10-31", time: "17:30:00" });

    const [a, b] = computeConflicts([teamOneGame, teamTwoGame]);
    expect(a.conflict).toBe("same-day");
    expect(b.conflict).toBe("same-day");
  });

  it("flags a same-day pair as same-day when one side's time is unknown", () => {
    const teamOneGame = makeGame({ id: 1, team: "luki-2div", dateISO: "2026-11-14", time: "18:00:00" });
    const teamTwoGame = makeGame({ id: 2, team: "luki-team", dateISO: "2026-11-14", time: null });

    const [a, b] = computeConflicts([teamOneGame, teamTwoGame]);
    expect(a.conflict).toBe("same-day");
    expect(b.conflict).toBe("same-day");
  });

  it("does not flag games from the same team", () => {
    const gameOne = makeGame({ id: 1, team: "luki-2div", dateISO: "2026-11-14", time: "18:00:00" });
    const gameTwo = makeGame({ id: 2, team: "luki-2div", dateISO: "2026-11-14", time: "18:00:00" });

    const [a, b] = computeConflicts([gameOne, gameTwo]);
    expect(a.conflict).toBeNull();
    expect(b.conflict).toBeNull();
  });

  it("leaves games with no other-team game that day unflagged", () => {
    const [a] = computeConflicts([makeGame({ id: 1 })]);
    expect(a.conflict).toBeNull();
  });
});

describe("sortByDateAndTime", () => {
  it("sorts soonest first by date then time", () => {
    const games = [
      makeGame({ id: 1, dateISO: "2026-11-14", time: "18:00:00" }),
      makeGame({ id: 2, dateISO: "2026-10-31", time: "17:30:00" }),
      makeGame({ id: 3, dateISO: "2026-10-31", time: "14:30:00" }),
    ];

    expect(sortByDateAndTime(games).map((g) => g.id)).toEqual([3, 2, 1]);
  });
});

function levelResponse(games: LeijonatGame[]): LeijonatLevel[] {
  return [{ LevelName: "II-divisioona", LevelID: 67, Games: games }];
}

function rawGame(overrides: Partial<LeijonatGame>): LeijonatGame {
  return {
    GameID: 1,
    GameDate: "01.01.2026",
    GameDateDB: "2026-01-01",
    GameTime: "18:00:00",
    HomeTeam: 1211191406,
    AwayTeam: 1,
    HomeTeamAbbrv: "Luvian Kiekko",
    AwayTeamAbbrv: "Opponent",
    HomeGoals: 0,
    AwayGoals: 0,
    GameStatus: 0,
    FinishedType: 0,
    RinkName: "Luvia",
    SubSerieName: "II-divisioona, lohko 6",
    LevelName: "II-divisioona",
    ...overrides,
  };
}

describe("listUpcomingGames", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges both teams and filters out games before the given date", async () => {
    const fetchMock = vi.fn(async (input: URL | string) => {
      const url = new URL(input);
      const teamId = url.searchParams.get("teamid");

      const games =
        teamId === "1211191406"
          ? [
              rawGame({ GameID: 1, GameDateDB: "2026-10-15" }), // past
              rawGame({ GameID: 2, GameDateDB: "2026-11-14" }), // upcoming
            ]
          : [
              rawGame({
                GameID: 3,
                GameDateDB: "2026-11-20",
                HomeTeam: 1368630285,
                AwayTeam: 2,
                HomeTeamAbbrv: "Luvian Kiekko Team",
                AwayTeamAbbrv: "Someone",
              }),
            ];

      return new Response(JSON.stringify(levelResponse(games)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const games = await listUpcomingGames(new Date("2026-11-01T00:00:00Z"));

    expect(games.map((g) => g.id)).toEqual([2, 3]);
  });
});
