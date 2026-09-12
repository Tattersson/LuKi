import { format } from "date-fns";
import { TEAM_COLORS } from "@/features/games/constants";
import { toLocalDisplayDate } from "../../domain/datetime";
import { practiceEventTitle } from "../../format";
import type { Practice } from "../../domain/types";
import { PracticeRsvpSummary } from "./PracticeRsvpSummary";

export function PracticesList({ practices }: { practices: Practice[] }) {
  if (practices.length === 0) {
    return <p className="text-sm text-neutral-500">No upcoming practices scheduled.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {practices.map((practice) => (
        <PracticeRow key={practice.id} practice={practice} />
      ))}
    </ul>
  );
}

function PracticeRow({ practice }: { practice: Practice }) {
  const start = toLocalDisplayDate(practice.startAt);
  const end = toLocalDisplayDate(practice.endAt);

  return (
    <li className="rounded-lg border border-neutral-200 px-3 py-3 dark:border-neutral-800">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: TEAM_COLORS[practice.teamKey].dot,
            border: "1px solid rgba(0,0,0,0.35)",
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="font-bold">{practiceEventTitle(practice)}</span>
            <span className="text-sm text-neutral-500">
              {format(start, "EEE d MMM yyyy")} · {format(start, "HH:mm")}–{format(end, "HH:mm")}
            </span>
          </div>
          <div className="mt-1 text-base font-medium">{practice.locationName}</div>
          {practice.description && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {practice.description}
            </p>
          )}
          <PracticeRsvpSummary />
        </div>
      </div>
    </li>
  );
}
