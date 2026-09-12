"use client";

import { useEffect, useState } from "react";
import { GAME_DETAIL_POLL_INTERVAL_MS } from "../../constants";
import type { GameReportDetail } from "../../domain/types";

/** Polls the full report every 5s, starting from the server-fetched `initialReport`.
 *  Unlike useLiveGameReports (which only starts polling games already flagged live at
 *  the initial schedule fetch), this checks status after every poll and keeps going
 *  as long as the *latest known* status isn't "finished" - so it also covers a game
 *  that goes live, or wraps up, while this page is open. */
export function useGameReportDetail(
  gameId: number,
  season: number,
  initialReport: GameReportDetail,
): GameReportDetail {
  const [report, setReport] = useState(initialReport);

  useEffect(() => {
    if (initialReport.status === "finished") return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(`/api/games/report?gameId=${gameId}&season=${season}`);
        if (response.ok) {
          const next: GameReportDetail = await response.json();
          if (cancelled) return;
          setReport(next);
          if (next.status === "finished") return;
        }
      } catch {
        // Transient failure - just retry on the next tick.
      }
      if (!cancelled) {
        timeoutId = setTimeout(poll, GAME_DETAIL_POLL_INTERVAL_MS);
      }
    }

    timeoutId = setTimeout(poll, GAME_DETAIL_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // Only re-run if we're pointed at a different game - not on every report update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, season]);

  return report;
}
