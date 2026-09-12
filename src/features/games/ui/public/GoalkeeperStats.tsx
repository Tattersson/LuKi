import { Card } from "@/components/ui/card";
import { formatElapsed } from "../../format";
import type { GoalkeeperStat } from "../../domain/types";

export function GoalkeeperStats({
  homeTeamName,
  awayTeamName,
  homeGoalkeepers,
  awayGoalkeepers,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homeGoalkeepers: GoalkeeperStat[];
  awayGoalkeepers: GoalkeeperStat[];
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-medium text-neutral-500">Goalkeepers</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GoalkeeperColumn teamName={homeTeamName} goalkeepers={homeGoalkeepers} />
        <GoalkeeperColumn teamName={awayTeamName} goalkeepers={awayGoalkeepers} />
      </div>
    </Card>
  );
}

function GoalkeeperColumn({
  teamName,
  goalkeepers,
}: {
  teamName: string;
  goalkeepers: GoalkeeperStat[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">{teamName}</h3>
      {goalkeepers.length === 0 ? (
        <p className="text-sm text-neutral-500">No goalkeeper data yet.</p>
      ) : (
        <ul className="space-y-3">
          {goalkeepers.map((goalkeeper) => (
            <li key={goalkeeper.jersey} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">
                  #{goalkeeper.jersey} {goalkeeper.name}
                </span>
                <span className="font-semibold">{goalkeeper.totalSaves} saves</span>
              </div>
              {goalkeeper.savesByPeriod.length > 0 && (
                <p className="text-xs text-neutral-500">
                  {goalkeeper.savesByPeriod
                    .map((entry) => `P${entry.period}: ${entry.saves}`)
                    .join(" · ")}
                </p>
              )}
              <dl className="mt-1.5 grid grid-cols-3 gap-1.5">
                <StatBlock
                  label="SV%"
                  value={
                    goalkeeper.savePercentage !== null ? `${goalkeeper.savePercentage.toFixed(1)}%` : "–"
                  }
                />
                <StatBlock
                  label="GAA"
                  value={
                    goalkeeper.goalsAgainstAverage !== null
                      ? goalkeeper.goalsAgainstAverage.toFixed(2)
                      : "–"
                  }
                />
                <StatBlock
                  label="Time"
                  value={
                    goalkeeper.timeOnIceSeconds !== null ? formatElapsed(goalkeeper.timeOnIceSeconds) : "–"
                  }
                />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-neutral-100 px-2 py-1 text-center dark:bg-neutral-800">
      <dt className="text-[10px] tracking-wide text-neutral-500 uppercase">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
