import { describe, expect, it } from "vitest";
import { computeWeeklyOccurrences } from "./recurrence";

describe("computeWeeklyOccurrences", () => {
  it("includes the first occurrence itself", () => {
    const start = new Date(Date.UTC(2026, 10, 3, 18, 0));
    const end = new Date(Date.UTC(2026, 10, 3, 19, 30));
    const until = new Date(Date.UTC(2026, 10, 3, 18, 0));

    const occurrences = computeWeeklyOccurrences(start, end, until, 52);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].start).toEqual(start);
    expect(occurrences[0].end).toEqual(end);
  });

  it("generates one occurrence per week up to and including `until`", () => {
    const start = new Date(Date.UTC(2026, 10, 3, 18, 0));
    const end = new Date(Date.UTC(2026, 10, 3, 19, 30));
    const until = new Date(Date.UTC(2026, 10, 24, 18, 0)); // 3 weeks later

    const occurrences = computeWeeklyOccurrences(start, end, until, 52);
    expect(occurrences).toHaveLength(4);
    expect(occurrences[3].start).toEqual(new Date(Date.UTC(2026, 10, 24, 18, 0)));
    expect(occurrences[3].end).toEqual(new Date(Date.UTC(2026, 10, 24, 19, 30)));
  });

  it("preserves the original duration on every generated occurrence", () => {
    const start = new Date(Date.UTC(2026, 10, 3, 18, 0));
    const end = new Date(Date.UTC(2026, 10, 3, 19, 30));
    const until = new Date(Date.UTC(2026, 10, 17, 18, 0));

    const occurrences = computeWeeklyOccurrences(start, end, until, 52);
    for (const occurrence of occurrences) {
      expect(occurrence.end.getTime() - occurrence.start.getTime()).toBe(90 * 60_000);
    }
  });

  it("caps the number of generated occurrences at maxOccurrences", () => {
    const start = new Date(Date.UTC(2026, 0, 1, 18, 0));
    const end = new Date(Date.UTC(2026, 0, 1, 19, 0));
    const until = new Date(Date.UTC(2027, 0, 1, 18, 0)); // a full year out

    const occurrences = computeWeeklyOccurrences(start, end, until, 5);
    expect(occurrences).toHaveLength(5);
  });

  it("returns no occurrences when `until` is before the start", () => {
    const start = new Date(Date.UTC(2026, 10, 10, 18, 0));
    const end = new Date(Date.UTC(2026, 10, 10, 19, 0));
    const until = new Date(Date.UTC(2026, 10, 1, 18, 0));

    const occurrences = computeWeeklyOccurrences(start, end, until, 52);
    expect(occurrences).toHaveLength(0);
  });
});
