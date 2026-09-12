import type { TeamKey } from "./domain/types";

export const API_BASE_URL = "https://tulospalvelu.leijonat.fi/helpers/getgames";
export const GAME_REPORT_BASE_URL = "https://tulospalvelu.leijonat.fi/gamereport/getgamereportdata";

export const LIVE_POLL_INTERVAL_MS = 30_000;

export const TEAMS: Record<TeamKey, { teamId: number; subSerieId: number; label: string }> = {
  "luki-2div": { teamId: 1211191406, subSerieId: 201, label: "LuKi II.Div" },
  "luki-team": { teamId: 1368630285, subSerieId: 4751, label: "Luvian Kiekko Team" },
};

/** Hockey seasons run Aug-May and are labelled by the later calendar year, e.g. the
 *  2026-2027 season (Aug 2026 - May 2027) is season 2027. */
export function getCurrentSeason(date: Date): number {
  const SEASON_START_MONTH = 7; // August, 0-indexed
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= SEASON_START_MONTH ? year + 1 : year;
}

/** Dot swatch colors, used inline. Chosen for hue separation (blue vs green, rather
 *  than two shades of the same neon green) so the two teams are easy to tell apart at
 *  a glance, and to match the (unchanged) blue/emerald scheme `event` uses to style
 *  react-big-calendar's month view. */
export const TEAM_COLORS: Record<TeamKey, { dot: string; event: string }> = {
  "luki-2div": { dot: "#2563EB", event: "!bg-blue-600 dark:!bg-blue-500" },
  "luki-team": { dot: "#16A34A", event: "!bg-emerald-600 dark:!bg-emerald-500" },
};

export const OVERLAP_COLOR = {
  dot: "#F59E0B",
  event: "!bg-amber-600 dark:!bg-amber-500",
};

/** List-view row backgrounds, fixed regardless of light/dark theme. Text colors below
 *  are chosen for contrast against these specific backgrounds (verified >7:1, WCAG AAA
 *  for normal text) - do not reuse them outside a row with the matching background. */
export const HOME_GAME_BACKGROUND = "#F0F8FF";
export const HOME_GAME_TEXT = "#0F172A";
export const HOME_GAME_MUTED_TEXT = "#475569";

export const AWAY_GAME_BACKGROUND = "#1F305E";
export const AWAY_GAME_TEXT = "#FFFFFF";
export const AWAY_GAME_MUTED_TEXT = "#CBD5E1";

/** Badges are self-contained (own background + text) so they stay readable regardless
 *  of which row background (home/away) they're placed on. */
export const OVERLAP_BADGE = { background: "#F59E0B", text: "#1F2937" };
export const SAME_DAY_BADGE = { background: "#CBD5E1", text: "#1F2937" };
