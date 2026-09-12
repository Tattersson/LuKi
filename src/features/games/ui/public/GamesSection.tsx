"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { OVERLAP_COLOR, SAME_DAY_BADGE, TEAM_COLORS, TEAMS } from "../../constants";
import type { TeamGame, TeamKey } from "../../domain/types";
import { GamesCalendar } from "./GamesCalendar";
import { GamesList } from "./GamesList";
import { useLiveGameReports } from "./useLiveGameReports";

type View = "list" | "calendar";
type TeamFilter = "all" | TeamKey;

export function GamesSection({ games }: { games: TeamGame[] }) {
  const [view, setView] = useState<View>("list");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const liveReports = useLiveGameReports(games);

  const filteredGames = useMemo(
    () => (teamFilter === "all" ? games : games.filter((game) => game.team === teamFilter)),
    [games, teamFilter],
  );

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Upcoming games</h2>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={view === "list" ? "primary" : "secondary"}
            className="px-3 py-1 text-xs"
            onClick={() => setView("list")}
          >
            List
          </Button>
          <Button
            type="button"
            variant={view === "calendar" ? "primary" : "secondary"}
            className="px-3 py-1 text-xs"
            onClick={() => setView("calendar")}
          >
            Calendar
          </Button>
        </div>
      </div>

      <label className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
        Show
        <Select
          className="w-auto"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
        >
          <option value="all">Both teams</option>
          {(Object.keys(TEAMS) as TeamKey[]).map((team) => (
            <option key={team} value={team}>
              {TEAMS[team].label}
            </option>
          ))}
        </Select>
      </label>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        {(Object.keys(TEAMS) as TeamKey[]).map((team) => (
          <span key={team} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: TEAM_COLORS[team].dot, border: "1px solid rgba(0,0,0,0.35)" }}
            />
            {TEAMS[team].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: OVERLAP_COLOR.dot, border: "1px solid rgba(0,0,0,0.35)" }}
          />
          Overlapping games (same start time)
        </span>
        {view === "list" && (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SAME_DAY_BADGE.background, border: "1px solid rgba(0,0,0,0.35)" }}
              />
              Same-day games
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Live now
            </span>
          </>
        )}
      </div>

      {view === "list" ? (
        <GamesList games={filteredGames} liveReports={liveReports} />
      ) : (
        <GamesCalendar games={filteredGames} />
      )}
    </Card>
  );
}
