import { ROSTERS_BASE_URL } from "../constants";
import { LeijonatApiError } from "../domain/errors";
import type { GameRosters, RosterPlayer } from "../domain/types";

interface RawRosterPlayer {
  LastName: string;
  FirstName: string;
  RoleAbbrv: string | null;
  Captain: string | null;
  JerseyNr: string | null;
  Line: number | null;
}

interface RawTeamRoster {
  Players: RawRosterPlayer[];
}

interface LeijonatRostersResponse {
  HomeTeamGameRoster: RawTeamRoster;
  AwayTeamGameRoster: RawTeamRoster;
}

/** Forward/defence line order, left-to-right as requested: left wing, center, right wing,
 *  left defence, right defence. Goalies ("MV") aren't part of this - they're sorted out
 *  into their own group instead (see `sortRoster`). Any role code not listed here (extra
 *  forwards/defencemen, unassigned "-" etc.) sorts after the five regular spots. */
const POSITION_ORDER: Record<string, number> = {
  VL: 0, // Vasen laitahyökkääjä - left wing
  KH: 1, // Keskushyökkääjä - center
  OL: 2, // Oikea laitahyökkääjä - right wing
  VP: 3, // Vasen puolustaja - left defence
  OP: 4, // Oikea puolustaja - right defence
};
const UNKNOWN_POSITION_ORDER = 99;
export const GOALIE_POSITION = "MV";

function toRosterPlayer(raw: RawRosterPlayer): RosterPlayer {
  return {
    jersey: raw.JerseyNr ?? "",
    name: `${raw.LastName} ${raw.FirstName}`,
    position: raw.RoleAbbrv ?? "",
    captain: raw.Captain === "C" || raw.Captain === "A" ? raw.Captain : null,
    line: raw.Line ?? null,
  };
}

function byJersey(a: RosterPlayer, b: RosterPlayer): number {
  return (Number(a.jersey) || Infinity) - (Number(b.jersey) || Infinity);
}

/** Goalies first (by line, i.e. starter/backup order, then jersey), then skaters grouped
 *  by line and ordered left wing/center/right wing/left defence/right defence within it. */
function sortRoster(players: RosterPlayer[]): RosterPlayer[] {
  const goalies = players.filter((p) => p.position === GOALIE_POSITION);
  const skaters = players.filter((p) => p.position !== GOALIE_POSITION);

  goalies.sort((a, b) => (a.line ?? Infinity) - (b.line ?? Infinity) || byJersey(a, b));
  skaters.sort(
    (a, b) =>
      (a.line ?? Infinity) - (b.line ?? Infinity) ||
      (POSITION_ORDER[a.position] ?? UNKNOWN_POSITION_ORDER) - (POSITION_ORDER[b.position] ?? UNKNOWN_POSITION_ORDER) ||
      byJersey(a, b),
  );

  return [...goalies, ...skaters];
}

export async function fetchRosters(gameId: number, season: number): Promise<GameRosters> {
  const url = new URL(ROSTERS_BASE_URL);
  url.searchParams.set("gameid", String(gameId));
  url.searchParams.set("season", String(season));

  // Rosters don't change during a game, so a plain cache (no revalidate override) is
  // fine - unlike the report endpoints, this isn't polled.
  const response = await fetch(url);
  if (!response.ok) {
    throw new LeijonatApiError(response.status);
  }

  const data: LeijonatRostersResponse = await response.json();

  return {
    home: sortRoster(data.HomeTeamGameRoster.Players.map(toRosterPlayer)),
    away: sortRoster(data.AwayTeamGameRoster.Players.map(toRosterPlayer)),
  };
}
