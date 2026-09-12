import { describe, expect, it } from "vitest";
import { practicesToICS } from "./ics";
import type { Practice } from "./types";

function makePractice(overrides: Partial<Practice> = {}): Practice {
  return {
    id: "prac_1",
    teamKey: "luki-2div",
    title: null,
    startAt: new Date(Date.UTC(2026, 10, 14, 18, 0, 0)),
    endAt: new Date(Date.UTC(2026, 10, 14, 19, 30, 0)),
    locationName: "Luvia Ice Hall",
    locationLat: null,
    locationLng: null,
    description: null,
    seriesId: null,
    status: "SCHEDULED",
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("practicesToICS", () => {
  it("wraps events in a VCALENDAR with CRLF line endings", () => {
    const ics = practicesToICS([makePractice()]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("emits a UID prefixed with 'practice-'", () => {
    const ics = practicesToICS([makePractice({ id: "prac_42" })]);
    expect(ics).toContain("UID:practice-prac_42@luki");
  });

  it("emits DTSTART/DTEND with the Europe/Helsinki TZID from the wall-clock-encoded Date", () => {
    const ics = practicesToICS([
      makePractice({
        startAt: new Date(Date.UTC(2026, 10, 14, 18, 0, 0)),
        endAt: new Date(Date.UTC(2026, 10, 14, 19, 30, 0)),
      }),
    ]);
    expect(ics).toContain("DTSTART;TZID=Europe/Helsinki:20261114T180000");
    expect(ics).toContain("DTEND;TZID=Europe/Helsinki:20261114T193000");
  });

  it("defaults the title to the team label when no title override is set", () => {
    const ics = practicesToICS([makePractice({ teamKey: "luki-team", title: null })]);
    expect(ics).toContain("SUMMARY:Luvian Kiekko Team Practice");
  });

  it("uses a custom title when one is set", () => {
    const ics = practicesToICS([makePractice({ title: "Power play focus" })]);
    expect(ics).toContain("SUMMARY:Power play focus");
  });

  it("builds LOCATION from locationName", () => {
    const ics = practicesToICS([makePractice({ locationName: "Luvia Ice Hall" })]);
    expect(ics).toContain("LOCATION:Luvia Ice Hall");
  });

  it("escapes commas, semicolons and backslashes in text fields", () => {
    const ics = practicesToICS([makePractice({ title: "A, B; C\\D" })]);
    expect(ics).toContain("SUMMARY:A\\, B\\; C\\\\D");
  });

  it("includes a DESCRIPTION with the practice's description when set", () => {
    const ics = practicesToICS([makePractice({ description: "Bring both jerseys" })]);
    expect(ics).toContain("DESCRIPTION:Bring both jerseys");
  });

  it("omits DESCRIPTION entirely when there's no description", () => {
    const ics = practicesToICS([makePractice({ description: null })]);
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("emits the row's version as SEQUENCE, so an edited occurrence isn't treated as a duplicate", () => {
    const ics = practicesToICS([makePractice({ version: 3 })]);
    expect(ics).toContain("SEQUENCE:3");
  });

  it("emits STATUS:CONFIRMED for a scheduled practice and STATUS:CANCELLED for a cancelled one", () => {
    const scheduled = practicesToICS([makePractice({ status: "SCHEDULED" })]);
    expect(scheduled).toContain("STATUS:CONFIRMED");

    const cancelled = practicesToICS([makePractice({ status: "CANCELLED" })]);
    expect(cancelled).toContain("STATUS:CANCELLED");
  });

  it("folds a line longer than 75 characters onto a continuation line starting with a space", () => {
    const longLocation = "A".repeat(100);
    const ics = practicesToICS([makePractice({ locationName: longLocation })]);
    const locationStart = ics.indexOf("LOCATION:");
    const nextLineBreak = ics.indexOf("\r\n", locationStart);
    const firstPhysicalLine = ics.slice(locationStart, nextLineBreak);
    expect(firstPhysicalLine.length).toBeLessThanOrEqual(75);
    const continuation = ics.slice(nextLineBreak + 2);
    expect(continuation.startsWith(" ")).toBe(true);
  });
});
