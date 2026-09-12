import { describe, expect, it } from "vitest";
import { deriveGameStatus, mapLeijonatGame } from "./leijonat-client";
import type { LeijonatGame } from "../domain/types";

const SEASON = 2027;

function makeRawGame(overrides: Partial<LeijonatGame> = {}): LeijonatGame {
  return {
    GameID: 2710959,
    GameDate: "31.10.2026",
    GameDateDB: "2026-10-31",
    GameTime: "14:30:00",
    HomeTeam: 1211191406,
    AwayTeam: 52877991,
    HomeTeamAbbrv: "Luvian Kiekko",
    AwayTeamAbbrv: "Rockets",
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

describe("mapLeijonatGame", () => {
  it("resolves opponent and isHome when the tracked team is the home team", () => {
    const game = mapLeijonatGame(makeRawGame(), "luki-2div", SEASON);

    expect(game.isHome).toBe(true);
    expect(game.opponent).toBe("Rockets");
    expect(game.teamLabel).toBe("LuKi II.Div");
    expect(game.dateISO).toBe("2026-10-31");
    expect(game.status).toBe("upcoming");
    expect(game.season).toBe(SEASON);
  });

  it("resolves opponent and isHome when the tracked team is the away team", () => {
    const game = mapLeijonatGame(
      makeRawGame({
        HomeTeam: 128549939,
        AwayTeam: 1368630285,
        HomeTeamAbbrv: "EjL",
        AwayTeamAbbrv: "Luvian Kiekko Team",
      }),
      "luki-team",
      SEASON,
    );

    expect(game.isHome).toBe(false);
    expect(game.opponent).toBe("EjL");
  });

  it("maps an empty GameTime to null", () => {
    const game = mapLeijonatGame(makeRawGame({ GameTime: "" }), "luki-2div", SEASON);
    expect(game.time).toBeNull();
  });

  it("maps a non-zero GameStatus (still not finished) to live", () => {
    const game = mapLeijonatGame(makeRawGame({ GameStatus: 11 }), "luki-2div", SEASON);
    expect(game.status).toBe("live");
  });

  it("maps a non-zero FinishedType to finished, regardless of GameStatus", () => {
    const game = mapLeijonatGame(
      makeRawGame({ GameStatus: 2, FinishedType: 1 }),
      "luki-2div",
      SEASON,
    );
    expect(game.status).toBe("finished");
  });
});

describe("deriveGameStatus", () => {
  it("is upcoming when neither status nor finishedType has moved", () => {
    expect(deriveGameStatus(0, 0)).toBe("upcoming");
  });

  it("is live once GameStatus moves off 0 but FinishedType is still 0", () => {
    expect(deriveGameStatus(11, 0)).toBe("live");
  });

  it("is finished once FinishedType is non-zero, even for an unfamiliar GameStatus", () => {
    expect(deriveGameStatus(99, 1)).toBe("finished");
  });
});
