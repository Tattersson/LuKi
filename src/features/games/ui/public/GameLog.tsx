import { clsx } from "@/lib/clsx";
import { formatElapsed } from "../../format";
import type { GameLogEntry, GoalLogEntry } from "../../domain/types";

const TYPE_BACKGROUND: Record<GameLogEntry["type"], string> = {
  goal: "bg-green-50 dark:bg-green-950/50",
  penalty: "bg-amber-50 dark:bg-amber-950/40",
  timeout: "bg-neutral-100 dark:bg-neutral-800/60",
  "goalie-change": "bg-blue-50 dark:bg-blue-950/40",
};

/** Home/away here just means "which side of this one game", not our two LuKi teams
 *  (this page renders any game, including ones neither of our teams is in), so these
 *  are fixed colors rather than the club-specific TEAM_COLORS used on the front page. */
export const HOME_LOG_DOT = "#2563EB";
export const AWAY_LOG_DOT = "#EA580C";

function TeamDot({ isHome }: { isHome: boolean }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: isHome ? HOME_LOG_DOT : AWAY_LOG_DOT, border: "1px solid rgba(0,0,0,0.35)" }}
      aria-hidden
    />
  );
}

/** First line: who was involved, and their team. */
function describeWho(entry: GameLogEntry, team: string): string {
  switch (entry.type) {
    case "goal":
      return `#${entry.scorerJersey} ${entry.scorerName} · ${team}`;
    case "penalty":
      return `#${entry.playerJersey} ${entry.playerName} · ${team}`;
    case "goalie-change":
      return `#${entry.goalieJersey} ${entry.goalieName} · ${team}`;
    case "timeout":
      return team;
  }
}

/** Second line: what happened. For a goal, the score has its own block and assists get
 *  their own line, so this is just "Goal" plus the situation (power play etc). */
function describeWhat(entry: GameLogEntry): string {
  switch (entry.type) {
    case "goal":
      return entry.situation ? `Goal (${entry.situation})` : "Goal";
    case "penalty":
      return `Penalty — ${entry.minutesLabel} (${entry.reason})`;
    case "timeout":
      return "Timeout";
    case "goalie-change":
      return entry.previousGoalieName ? `Replaces ${entry.previousGoalieName} in goal` : "Starts in goal";
  }
}

function describeAssists(entry: GoalLogEntry): string | null {
  const assists = [entry.assist1Name, entry.assist2Name].filter((name): name is string => name !== null);
  if (assists.length === 0) return null;
  return `Assist${assists.length > 1 ? "s" : ""}: ${assists.join(", ")}`;
}

function groupByPeriodDescending(log: GameLogEntry[]): Array<{ period: number; entries: GameLogEntry[] }> {
  const byPeriod = new Map<number, GameLogEntry[]>();
  for (const entry of log) {
    const bucket = byPeriod.get(entry.period);
    if (bucket) bucket.push(entry);
    else byPeriod.set(entry.period, [entry]);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => b - a)
    .map(([period, entries]) => ({
      period,
      entries: [...entries].sort((a, b) => b.gameTime - a.gameTime),
    }));
}

function GoalScoreBlock({ entry }: { entry: GoalLogEntry }) {
  return (
    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-green-600 text-lg font-bold text-white dark:bg-green-500">
      {entry.homeGoals}-{entry.awayGoals}
    </div>
  );
}

function LogRow({
  entry,
  team,
  isHome,
}: {
  entry: GameLogEntry;
  team: string;
  isHome: boolean;
}) {
  const isGoal = entry.type === "goal";
  const assists = isGoal ? describeAssists(entry) : null;

  return (
    <div className={clsx("flex items-start gap-3 rounded-lg px-3 py-2", TYPE_BACKGROUND[entry.type])}>
      {isGoal && <GoalScoreBlock entry={entry} />}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <TeamDot isHome={isHome} />
              {describeWho(entry, team)}
            </div>
            <div
              className={clsx(
                isGoal
                  ? "text-base font-bold text-green-800 dark:text-green-300"
                  : "text-sm text-neutral-700 dark:text-neutral-300",
              )}
            >
              {isGoal && <span className="mr-1">🥅</span>}
              {describeWhat(entry)}
            </div>
            {assists && <div className="mt-0.5 text-xs text-neutral-500">{assists}</div>}
          </div>
          <span className="shrink-0 font-mono text-xs text-neutral-500">{formatElapsed(entry.gameTime)}</span>
        </div>
      </div>
    </div>
  );
}

export function GameLog({
  log,
  homeTeamId,
  homeTeamName,
  awayTeamName,
}: {
  log: GameLogEntry[];
  homeTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}) {
  if (log.length === 0) {
    return <p className="text-sm text-neutral-500">Nothing has happened in this game yet.</p>;
  }

  return (
    <div className="space-y-4">
      {groupByPeriodDescending(log).map(({ period, entries }) => (
        <div key={period}>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Period {period}
          </h3>
          <div className="space-y-2">
            {entries.map((entry) => (
              <LogRow
                key={entry.id}
                entry={entry}
                team={entry.teamId === homeTeamId ? homeTeamName : awayTeamName}
                isHome={entry.teamId === homeTeamId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
