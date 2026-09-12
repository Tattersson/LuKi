import { describe, expect, it } from "vitest";
import { gamesToICS } from "./ics";
import type { TeamGame } from "./types";

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

describe("gamesToICS", () => {
  it("wraps events in a VCALENDAR with CRLF line endings", () => {
    const ics = gamesToICS([makeGame()]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("emits a UID prefixed with the team, so ids can't collide across the two feeds", () => {
    const ics = gamesToICS([makeGame({ id: 42, team: "luki-team" })]);
    expect(ics).toContain("UID:luki-team-42@luki");
  });

  it("emits DTSTART/DTEND with the Europe/Helsinki TZID and the assumed 2h duration", () => {
    const ics = gamesToICS([makeGame({ dateISO: "2026-11-14", time: "18:00:00" })]);
    expect(ics).toContain("DTSTART;TZID=Europe/Helsinki:20261114T180000");
    expect(ics).toContain("DTEND;TZID=Europe/Helsinki:20261114T200000");
  });

  it("defaults to 00:00 when the game's start time isn't known yet", () => {
    const ics = gamesToICS([makeGame({ time: null })]);
    expect(ics).toContain("DTSTART;TZID=Europe/Helsinki:20261114T000000");
  });

  it("builds SUMMARY/LOCATION from the game's team, opponent and rink", () => {
    const ics = gamesToICS([makeGame({ teamLabel: "LuKi II.Div", isHome: true, opponent: "Chiefs", rinkName: "Luvia" })]);
    expect(ics).toContain("SUMMARY:LuKi II.Div: vs Chiefs");
    expect(ics).toContain("LOCATION:Luvia");
  });

  it("shows an away game with an @ instead of vs", () => {
    const ics = gamesToICS([makeGame({ isHome: false, opponent: "Bears" })]);
    expect(ics).toContain("SUMMARY:LuKi II.Div: @ Bears");
  });

  it("escapes commas, semicolons and backslashes in text fields", () => {
    const ics = gamesToICS([makeGame({ opponent: "A, B; C\\D" })]);
    expect(ics).toContain("SUMMARY:LuKi II.Div: vs A\\, B\\; C\\\\D");
  });

  it("folds a line longer than 75 characters onto a continuation line starting with a space", () => {
    const longRink = "A".repeat(100);
    const ics = gamesToICS([makeGame({ rinkName: longRink })]);
    const locationStart = ics.indexOf("LOCATION:");
    const nextLineBreak = ics.indexOf("\r\n", locationStart);
    const firstPhysicalLine = ics.slice(locationStart, nextLineBreak);
    expect(firstPhysicalLine.length).toBeLessThanOrEqual(75);
    const continuation = ics.slice(nextLineBreak + 2);
    expect(continuation.startsWith(" ")).toBe(true);
  });
});
