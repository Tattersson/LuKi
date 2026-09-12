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

  it("builds SUMMARY/LOCATION from the game's team, home/away status and rink", () => {
    const ics = gamesToICS([makeGame({ teamLabel: "LuKi II.Div", isHome: true, opponent: "Chiefs", rinkName: "Luvia" })]);
    expect(ics).toContain("SUMMARY:LuKi II.Div: Home vs Chiefs");
    expect(ics).toContain("LOCATION:Luvia");
  });

  it("shows an away game as Away instead of Home", () => {
    const ics = gamesToICS([makeGame({ isHome: false, opponent: "Bears" })]);
    expect(ics).toContain("SUMMARY:LuKi II.Div: Away vs Bears");
  });

  it("escapes commas, semicolons and backslashes in text fields", () => {
    const ics = gamesToICS([makeGame({ opponent: "A, B; C\\D" })]);
    expect(ics).toContain("SUMMARY:LuKi II.Div: Home vs A\\, B\\; C\\\\D");
  });

  it("includes a DESCRIPTION with the known start time when the game hasn't started", () => {
    const ics = gamesToICS([makeGame({ time: "18:00:00", status: "upcoming" })]);
    expect(ics).toContain("DESCRIPTION:Time: 18:00");
  });

  it("omits the time from DESCRIPTION when the start time isn't known yet", () => {
    const ics = gamesToICS([makeGame({ time: null, status: "live", conflict: "overlap" })]);
    expect(ics).toContain("DESCRIPTION:");
    expect(ics).not.toContain("Time:");
  });

  it("adds the score to DESCRIPTION once a game is live or finished, not while upcoming", () => {
    const finished = gamesToICS([makeGame({ status: "finished", homeGoals: 3, awayGoals: 1 })]);
    expect(finished).toContain("Score: 3 - 1");

    const upcoming = gamesToICS([makeGame({ status: "upcoming" })]);
    const description = upcoming.split("\r\n").find((line) => line.startsWith("DESCRIPTION:"));
    expect(description).not.toContain("Score:");
  });

  it("notes a live game's score as live in DESCRIPTION", () => {
    const ics = gamesToICS([makeGame({ status: "live", homeGoals: 2, awayGoals: 2 })]);
    expect(ics).toContain("Score: 2 - 2 (live)");
  });

  it("notes a scheduling conflict in DESCRIPTION", () => {
    // time: null keeps DESCRIPTION short enough to land on a single physical line -
    // long-line folding is covered separately below.
    const overlap = gamesToICS([makeGame({ time: null, conflict: "overlap" })]);
    expect(overlap).toContain("Overlaps with the other team's game (same start time)");

    const sameDay = gamesToICS([makeGame({ time: null, conflict: "same-day" })]);
    expect(sameDay).toContain("Also a game day for the other team");
  });

  it("omits DESCRIPTION entirely when there's nothing to say beyond the title/location", () => {
    const ics = gamesToICS([makeGame({ time: null, status: "upcoming", conflict: null })]);
    expect(ics).not.toContain("DESCRIPTION:");
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
