import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFullGameReport, fetchGameReport } from "./game-report-client";

describe("fetchGameReport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a live game report to a LiveGameReport", async () => {
    const fetchMock = vi.fn(async (_input: URL | string) => {
      const body = {
        GamesUpdate: [
          {
            Id: 2710919,
            GameTime: 748,
            HomeTeam: { Goals: 2 },
            AwayTeam: { Goals: 1 },
            GameStatus: 11,
            FinishedType: 0,
          },
        ],
        PeriodSummary: { PlayedPeriods: 1 },
      };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await fetchGameReport(2710919, 2027);

    expect(report).toEqual({
      gameId: 2710919,
      status: "live",
      homeGoals: 2,
      awayGoals: 1,
      currentPeriod: 1,
      elapsedSeconds: 748,
    });

    const requestedUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get("gameid")).toBe("2710919");
    expect(requestedUrl.searchParams.get("season")).toBe("2027");
  });

  it("maps a finished game report to status finished", async () => {
    const fetchMock = vi.fn(async () => {
      const body = {
        GamesUpdate: [
          {
            Id: 1,
            GameTime: 3600,
            HomeTeam: { Goals: 5 },
            AwayTeam: { Goals: 6 },
            GameStatus: 2,
            FinishedType: 1,
          },
        ],
        PeriodSummary: { PlayedPeriods: 3 },
      };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await fetchGameReport(1, 2026);
    expect(report.status).toBe("finished");
  });

  it("throws when the upstream response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );

    await expect(fetchGameReport(1, 2026)).rejects.toThrow();
  });
});

describe("fetchFullGameReport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubReport(body: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
    );
  }

  const baseGamesUpdate = {
    Id: 2710919,
    GameTime: 748,
    Arena: "Luvian jäähalli",
    StartDate: "12.09.2026",
    StartTime: "14:30:00",
    SubSerieName: "II-divisioona, lohko 6",
    LevelName: "II-divisioona",
    HomeTeam: { Name: "Luvian Kiekko", Goals: 2, Id: 1211191406 },
    AwayTeam: { Name: "Chiefs", Goals: 1, Id: 755393886 },
    GameStatus: 11,
    FinishedType: 0,
  };

  it("maps goal, penalty, timeout, and goalie-change log entries", async () => {
    stubReport({
      GamesUpdate: [baseGamesUpdate],
      PeriodSummary: { PlayedPeriods: 1 },
      GameLogsUpdate: [
        {
          Type: "GK_start",
          Period: 1,
          GameTime: 0,
          TeamId: 1211191406,
          GoalkeeperName: "JUUTI Joose",
          GoalkeeperJersey: 1,
          PreviousGoalkeeperName: " ",
        },
        {
          Type: "GK_start",
          Period: 1,
          GameTime: 0,
          TeamId: 755393886,
          GoalkeeperName: "LAINE Antti",
          GoalkeeperJersey: 1,
          PreviousGoalkeeperName: " ",
        },
        {
          Type: "Goal",
          Period: 1,
          GameTime: 571,
          TeamId: 1211191406,
          ScorerName: "SAVIN Pavel",
          ScorerJersey: 17,
          FirstAssistName: "RAJALA Juuso",
          SecondAssistName: "LEHTONEN Robin",
          HomeTeamGoals: 2,
          AwayTeamGoals: 1,
          GoalType: "YV",
        },
        {
          Type: "Goal",
          Period: 1,
          GameTime: 443,
          TeamId: 755393886,
          ScorerName: "NORDLUND Roni",
          ScorerJersey: 21,
          HomeTeamGoals: 0,
          AwayTeamGoals: 1,
          GoalType: "",
        },
        {
          Type: "Penalty",
          Period: 1,
          GameTime: 485,
          TeamId: 755393886,
          Name: "LAATIKAINEN Nuutti",
          Jersey: 24,
          PenaltyMinutes: "02:00 min",
          PenaltyReasonsEN: "Tripping",
        },
        // GameTime is cumulative across the whole game (verified live), so a period-2
        // event 100s into that period has GameTime = 1200 (period 1) + 100.
        { Type: "Timeout", Period: 2, GameTime: 1300, TeamId: 1211191406 },
      ],
      GoalkeeperSummary: [
        {
          TeamName: "Chiefs",
          TeamGoalkeepers: [
            {
              GkName: "LAINE Antti",
              GkJersey: 1,
              GkSaves: [
                { Period: 1, Saves: 12 },
                { Period: 0, Saves: 12 },
              ],
            },
          ],
        },
        {
          TeamName: "Luvian Kiekko",
          TeamGoalkeepers: [
            {
              GkName: "JUUTI Joose",
              GkJersey: 1,
              GkSaves: [
                { Period: 1, Saves: 9 },
                { Period: 0, Saves: 9 },
              ],
            },
          ],
        },
      ],
      Referees: [{ RefereeRole: "Erotuomari", RefereeName: "ELOMAA Kaapo" }],
    });

    const report = await fetchFullGameReport(2710919, 2027);

    expect(report.homeTeamName).toBe("Luvian Kiekko");
    expect(report.awayTeamName).toBe("Chiefs");
    expect(report.referees).toEqual([{ role: "Erotuomari", name: "ELOMAA Kaapo" }]);

    // Goalkeepers are bucketed into home/away by matching team name, not array order
    // (the raw feed doesn't guarantee home-first ordering - verified live), and enriched
    // with goals-against/save%/GAA/TOI attributed from the GK_start + Goal log entries.
    expect(report.homeGoalkeepers).toEqual([
      {
        name: "JUUTI Joose",
        jersey: 1,
        totalSaves: 9,
        savesByPeriod: [{ period: 1, saves: 9 }],
        goalsAgainst: 1,
        timeOnIceSeconds: 748,
        savePercentage: 90,
        goalsAgainstAverage: (1 / 748) * 3600,
      },
    ]);
    expect(report.awayGoalkeepers).toEqual([
      {
        name: "LAINE Antti",
        jersey: 1,
        totalSaves: 12,
        savesByPeriod: [{ period: 1, saves: 12 }],
        goalsAgainst: 1,
        timeOnIceSeconds: 748,
        savePercentage: (12 / 13) * 100,
        goalsAgainstAverage: (1 / 748) * 3600,
      },
    ]);

    const [gkStart, , powerPlayGoal, evenGoal, penalty, timeout] = report.log;

    expect(gkStart).toMatchObject({ type: "goalie-change", previousGoalieName: null });
    expect(powerPlayGoal).toMatchObject({
      type: "goal",
      assist1Name: "RAJALA Juuso",
      assist2Name: "LEHTONEN Robin",
      situation: "Power play",
    });
    expect(evenGoal).toMatchObject({ type: "goal", assist1Name: null, assist2Name: null, situation: null });
    expect(penalty).toMatchObject({ type: "penalty", playerName: "LAATIKAINEN Nuutti" });
    expect(timeout).toMatchObject({ type: "timeout", period: 2, gameTime: 100 });
  });

  it("converts the feed's cumulative GameTime into seconds-within-period (regression: previously double-counted)", async () => {
    // Real bug: a live game at 24:27 total elapsed (4:27 into period 2, given 20-minute
    // periods) was rendering goalie time-on-ice as ~42 minutes because the raw, already-
    // cumulative GameTime (1467s) was treated as "seconds within period 2" and had a
    // second period's length added on top.
    stubReport({
      GamesUpdate: [{ ...baseGamesUpdate, GameTime: 1467, GameRules: "60;0;3;20;0;0" }],
      PeriodSummary: { PlayedPeriods: 2 },
      GameLogsUpdate: [
        { Type: "GK_start", Period: 1, GameTime: 0, TeamId: 1211191406, GoalkeeperName: "A", GoalkeeperJersey: 1, PreviousGoalkeeperName: " " },
        { Type: "GK_start", Period: 1, GameTime: 0, TeamId: 755393886, GoalkeeperName: "B", GoalkeeperJersey: 1, PreviousGoalkeeperName: " " },
      ],
      GoalkeeperSummary: [
        { TeamName: "Luvian Kiekko", TeamGoalkeepers: [{ GkName: "A", GkJersey: 1, GkSaves: [{ Period: 0, Saves: 0 }] }] },
        { TeamName: "Chiefs", TeamGoalkeepers: [{ GkName: "B", GkJersey: 1, GkSaves: [{ Period: 0, Saves: 0 }] }] },
      ],
    });

    const report = await fetchFullGameReport(2710919, 2027);

    expect(report.currentPeriod).toBe(2);
    expect(report.elapsedSeconds).toBe(267); // 4:27 into period 2, not 24:27
    expect(report.homeGoalkeepers[0].timeOnIceSeconds).toBe(1467); // total elapsed, not 1467 + a whole extra period
  });

  it("leaves derived goalie stats null when there's no GK_start data to attribute from", async () => {
    stubReport({
      GamesUpdate: [baseGamesUpdate],
      PeriodSummary: { PlayedPeriods: 1 },
      GameLogsUpdate: [],
      GoalkeeperSummary: [
        {
          TeamName: "Luvian Kiekko",
          TeamGoalkeepers: [
            { GkName: "JUUTI Joose", GkJersey: 1, GkSaves: [{ Period: 1, Saves: 9 }, { Period: 0, Saves: 9 }] },
          ],
        },
      ],
    });

    const report = await fetchFullGameReport(2710919, 2027);
    expect(report.homeGoalkeepers[0]).toMatchObject({
      totalSaves: 9,
      goalsAgainst: null,
      timeOnIceSeconds: null,
      savePercentage: null,
      goalsAgainstAverage: null,
    });
  });

  it("leaves derived goalie stats null before the game has started", async () => {
    stubReport({
      GamesUpdate: [{ ...baseGamesUpdate, GameStatus: 0, GameTime: 0 }],
      GameLogsUpdate: [],
      GoalkeeperSummary: [
        {
          TeamName: "Luvian Kiekko",
          TeamGoalkeepers: [
            { GkName: "JUUTI Joose", GkJersey: 1, GkSaves: [{ Period: 0, Saves: 0 }] },
          ],
        },
      ],
    });

    const report = await fetchFullGameReport(2710919, 2027);
    expect(report.currentPeriod).toBe(0);
    expect(report.homeGoalkeepers[0]).toMatchObject({
      goalsAgainst: null,
      timeOnIceSeconds: null,
      savePercentage: null,
      goalsAgainstAverage: null,
    });
  });

  it("maps a goalie change with a real previous goalie", async () => {
    stubReport({
      GamesUpdate: [baseGamesUpdate],
      GameLogsUpdate: [
        {
          Type: "GK_start",
          Period: 2,
          GameTime: 0,
          TeamId: 1211191406,
          GoalkeeperName: "BACKUP Goalie",
          GoalkeeperJersey: 30,
          PreviousGoalkeeperName: "JUUTI Joose",
        },
      ],
    });

    const report = await fetchFullGameReport(2710919, 2027);
    expect(report.log[0]).toMatchObject({ previousGoalieName: "JUUTI Joose" });
  });
});
