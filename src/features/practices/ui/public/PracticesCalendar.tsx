"use client";

import { useState } from "react";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar, dateFnsLocalizer, type EventPropGetter } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/features/games/ui/public/GamesCalendar.css";
import { Modal } from "@/components/ui/modal";
import { TEAM_COLORS } from "@/features/games/constants";
import { toLocalDisplayDate } from "../../domain/datetime";
import { practiceEventTitle } from "../../format";
import { EMPTY_RSVP_DATA, type Practice, type RsvpData } from "../../domain/types";
import { PracticeRsvpSummary } from "./PracticeRsvpSummary";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

interface PracticeEvent {
  practice: Practice;
  title: string;
  start: Date;
  end: Date;
}

function toEvent(practice: Practice): PracticeEvent {
  return {
    practice,
    title: practiceEventTitle(practice),
    start: toLocalDisplayDate(practice.startAt),
    end: toLocalDisplayDate(practice.endAt),
  };
}

const eventPropGetter: EventPropGetter<PracticeEvent> = ({ practice }) => ({
  className: TEAM_COLORS[practice.teamKey].event,
});

export function PracticesCalendar({
  practices,
  canRsvp,
  rsvpByPracticeId,
}: {
  practices: Practice[];
  canRsvp: boolean;
  rsvpByPracticeId: Record<string, RsvpData>;
}) {
  const events = practices.map(toEvent);
  // See GamesCalendar.tsx's note: react-big-calendar's Calendar is "uncontrollable"
  // unless both `date` and `onNavigate` are supplied.
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<Practice | null>(null);

  return (
    <div className="luki-calendar h-125 rounded-lg border border-neutral-200 bg-white p-2 text-neutral-900 sm:h-150 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={["month"]}
        date={date}
        onNavigate={setDate}
        eventPropGetter={eventPropGetter}
        onSelectEvent={({ practice }) => setSelected(practice)}
        popup
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? practiceEventTitle(selected) : ""}
      >
        {selected && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="text-neutral-600 dark:text-neutral-400">
              {format(toLocalDisplayDate(selected.startAt), "EEE d MMM yyyy")} ·{" "}
              {format(toLocalDisplayDate(selected.startAt), "HH:mm")}–
              {format(toLocalDisplayDate(selected.endAt), "HH:mm")}
            </div>
            <div className="font-medium">{selected.locationName}</div>
            {selected.description && (
              <p className="text-neutral-600 dark:text-neutral-400">{selected.description}</p>
            )}
            <PracticeRsvpSummary
              practiceId={selected.id}
              canRsvp={canRsvp}
              summary={(rsvpByPracticeId[selected.id] ?? EMPTY_RSVP_DATA).summary}
              myStatus={(rsvpByPracticeId[selected.id] ?? EMPTY_RSVP_DATA).myStatus}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
