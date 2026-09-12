import { TEAMS } from "@/features/games/constants";
import type { Practice } from "./domain/types";

/** Shared between the calendar view (event title/tooltip), the list view and the ICS
 *  export (SUMMARY), so every surface describes a practice the same way. */
export function practiceEventTitle(practice: Practice): string {
  if (practice.title?.trim()) return practice.title.trim();
  return `${TEAMS[practice.teamKey].label} Practice`;
}

/** Extra facts about a practice beyond its title/location - used for the ICS export's
 *  DESCRIPTION. Cancellation itself is carried by the ICS STATUS property, not repeated
 *  here. */
export function practiceDetailLines(practice: Practice): string[] {
  const lines: string[] = [];
  if (practice.description?.trim()) lines.push(practice.description.trim());
  return lines;
}
