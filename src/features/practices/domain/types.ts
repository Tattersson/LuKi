import type { TeamKey } from "@/features/games/domain/types";

export type { TeamKey };

export type PracticeStatus = "SCHEDULED" | "CANCELLED";
export type RsvpStatus = "IN" | "OUT";

/** Startt/end are encoded so their *UTC* getters equal the intended Europe/Helsinki
 *  wall-clock time - see domain/datetime.ts for why, and always convert with its
 *  helpers rather than reading these fields' local getters/setters directly. */
export interface Practice {
  id: string;
  teamKey: TeamKey;
  title: string | null;
  startAt: Date;
  endAt: Date;
  locationName: string;
  locationLat: number | null;
  locationLng: number | null;
  description: string | null;
  seriesId: string | null;
  status: PracticeStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RsvpNameEntry {
  playerId: string;
  /** "Lastname F." - see features/players/format.ts's playerDisplayName. */
  displayName: string;
}

export interface RsvpBucket {
  in: RsvpNameEntry[];
  out: RsvpNameEntry[];
}

export interface RsvpSummary {
  goalkeepers: RsvpBucket;
  players: RsvpBucket;
}

export interface RsvpData {
  summary: RsvpSummary;
  myStatus: RsvpStatus | null;
}

export const EMPTY_RSVP_DATA: RsvpData = {
  summary: { goalkeepers: { in: [], out: [] }, players: { in: [], out: [] } },
  myStatus: null,
};

export interface LocationSuggestion {
  label: string;
  lat: number;
  lon: number;
}
