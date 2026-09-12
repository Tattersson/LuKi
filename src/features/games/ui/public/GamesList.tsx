import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AWAY_GAME_BACKGROUND,
  AWAY_GAME_MUTED_TEXT,
  AWAY_GAME_TEXT,
  HOME_GAME_BACKGROUND,
  HOME_GAME_MUTED_TEXT,
  HOME_GAME_TEXT,
  OVERLAP_BADGE,
  OVERLAP_COLOR,
  SAME_DAY_BADGE,
  TEAM_COLORS,
} from "../../constants";
import { formatElapsed } from "../../format";
import type { LiveGameReport, TeamGame } from "../../domain/types";

export function GamesList({
  games,
  liveReports,
}: {
  games: TeamGame[];
  liveReports?: Record<number, LiveGameReport>;
}) {
  if (games.length === 0) {
    return <p className="text-sm text-neutral-500">No upcoming games scheduled.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {games.map((game) => (
        <GameRow key={game.id} game={game} liveReport={liveReports?.[game.id]} />
      ))}
    </ul>
  );
}

function GameRow({ game, liveReport }: { game: TeamGame; liveReport?: LiveGameReport }) {
  const background = game.isHome ? HOME_GAME_BACKGROUND : AWAY_GAME_BACKGROUND;
  const textColor = game.isHome ? HOME_GAME_TEXT : AWAY_GAME_TEXT;
  const mutedTextColor = game.isHome ? HOME_GAME_MUTED_TEXT : AWAY_GAME_MUTED_TEXT;
  const dotColor = game.conflict === "overlap" ? OVERLAP_COLOR.dot : TEAM_COLORS[game.team].dot;
  const homeTeamName = game.isHome ? game.teamLabel : game.opponent;
  const awayTeamName = game.isHome ? game.opponent : game.teamLabel;

  // The live poll can override the schedule's status/score - e.g. once a live game
  // finishes, the next 30s poll flips it to "finished" without a page reload.
  const status = liveReport?.status ?? game.status;
  const homeGoals = liveReport?.homeGoals ?? game.homeGoals;
  const awayGoals = liveReport?.awayGoals ?? game.awayGoals;

  return (
    <li>
      <Link
        href={`/games/${game.id}?season=${game.season}`}
        className="relative block rounded-lg px-3 py-3 transition-opacity hover:opacity-90"
        style={{ backgroundColor: background, color: textColor }}
      >
        {status === "live" && (
          <span
            className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white"
            title="Live now"
            aria-label="Live now"
          />
        )}
        <div className="flex items-start gap-3">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor, border: "1px solid rgba(0,0,0,0.35)" }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-bold">
                {homeTeamName} vs {awayTeamName}
              </span>
              <span className="text-sm" style={{ color: mutedTextColor }}>
                {format(parseISO(game.dateISO), "EEE d MMM yyyy")}
                {game.time ? ` · ${game.time.slice(0, 5)}` : ""}
              </span>
            </div>

            {status !== "upcoming" && (
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <span>
                  {homeGoals} – {awayGoals}
                </span>
                {status === "live" && (
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white">
                    {liveReport
                      ? `Period ${liveReport.currentPeriod} · ${formatElapsed(liveReport.elapsedSeconds)}`
                      : "Live"}
                  </span>
                )}
              </div>
            )}

            <div className="mt-1 text-base font-medium">{game.rinkName}</div>

            {game.conflict && (
              <span
                className="mt-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor:
                    game.conflict === "overlap" ? OVERLAP_BADGE.background : SAME_DAY_BADGE.background,
                  color: game.conflict === "overlap" ? OVERLAP_BADGE.text : SAME_DAY_BADGE.text,
                }}
              >
                {game.conflict === "overlap" ? "Overlaps with the other team" : "Game on same day"}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
