"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatElapsed } from "../../format";
import type { GameReportDetail } from "../../domain/types";
import { AWAY_LOG_DOT, GameLog, HOME_LOG_DOT } from "./GameLog";
import { GoalkeeperStats } from "./GoalkeeperStats";
import { useGameReportDetail } from "./useGameReportDetail";

const STATUS_LABEL: Record<GameReportDetail["status"], string> = {
  upcoming: "Upcoming",
  live: "Live",
  finished: "Final",
};

export function GameDetailView({
  gameId,
  season,
  initialReport,
}: {
  gameId: number;
  season: number;
  initialReport: GameReportDetail;
}) {
  const report = useGameReportDetail(gameId, season, initialReport);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/" className="inline-block text-sm underline">
        ◂ Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">
          {report.homeTeamName} vs {report.awayTeamName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className={
              report.status === "live"
                ? "rounded bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white"
                : "rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            }
          >
            {STATUS_LABEL[report.status]}
            {report.status === "live"
              ? ` · Period ${report.currentPeriod} · ${formatElapsed(report.elapsedSeconds)}`
              : ""}
          </span>
          <span className="text-lg font-semibold">
            {report.homeGoals} – {report.awayGoals}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {report.startDate} {report.startTime.slice(0, 5)} · {report.rinkName} · {report.levelName}
        </p>
      </div>

      <GoalkeeperStats
        homeTeamName={report.homeTeamName}
        awayTeamName={report.awayTeamName}
        homeGoalkeepers={report.homeGoalkeepers}
        awayGoalkeepers={report.awayGoalkeepers}
      />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Game log</h2>
          <div className="flex gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: HOME_LOG_DOT, border: "1px solid rgba(0,0,0,0.35)" }}
              />
              {report.homeTeamName}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: AWAY_LOG_DOT, border: "1px solid rgba(0,0,0,0.35)" }}
              />
              {report.awayTeamName}
            </span>
          </div>
        </div>
        <GameLog
          log={report.log}
          homeTeamId={report.homeTeamId}
          homeTeamName={report.homeTeamName}
          awayTeamName={report.awayTeamName}
        />
      </Card>

      {report.referees.length > 0 && (
        <p className="text-xs text-neutral-500">
          Referees: {report.referees.map((referee) => referee.name).join(", ")}
        </p>
      )}
    </div>
  );
}
