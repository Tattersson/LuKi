import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGameReport } from "./game-report-client";

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
