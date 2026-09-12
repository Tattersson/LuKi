"use client";

import { useEffect, useState } from "react";
import { LIVE_POLL_INTERVAL_MS } from "../../constants";
import type { LiveGameReport, TeamGame } from "../../domain/types";

/** Polls the live-report route every 30s for whichever games are currently live.
 *  `games` should be a stable reference across renders that don't refetch the
 *  schedule (e.g. toggling view/filter) - see GamesSection, which passes the raw
 *  server-fetched list rather than a derived/filtered one. */
export function useLiveGameReports(games: TeamGame[]): Record<number, LiveGameReport> {
  const [reports, setReports] = useState<Record<number, LiveGameReport>>({});

  useEffect(() => {
    const liveGames = games.filter((game) => game.status === "live");
    if (liveGames.length === 0) return;

    let cancelled = false;

    async function poll() {
      const results = await Promise.all(
        liveGames.map(async (game) => {
          try {
            const response = await fetch(`/api/games/live-report?gameId=${game.id}&season=${game.season}`);
            if (!response.ok) return null;
            return (await response.json()) as LiveGameReport;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;
      setReports((previous) => {
        const next = { ...previous };
        for (const report of results) {
          if (report) next[report.gameId] = report;
        }
        return next;
      });
    }

    poll();
    const interval = setInterval(poll, LIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [games]);

  return reports;
}
