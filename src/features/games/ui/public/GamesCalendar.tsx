"use client";

import { useState } from "react";
import { format, getDay, parse, parseISO, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar, dateFnsLocalizer, type EventPropGetter } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./GamesCalendar.css";
import { ASSUMED_GAME_DURATION_MINUTES, OVERLAP_COLOR, TEAM_COLORS } from "../../constants";
import type { TeamGame } from "../../domain/types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

interface GameEvent {
  game: TeamGame;
  title: string;
  start: Date;
  end: Date;
}

function toEvent(game: TeamGame): GameEvent {
  const [hours, minutes] = (game.time ?? "00:00").split(":").map(Number);
  const start = parseISO(game.dateISO);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + ASSUMED_GAME_DURATION_MINUTES * 60_000);

  return {
    game,
    start,
    end,
    title: `${game.teamLabel}: ${game.isHome ? "vs" : "@"} ${game.opponent}`,
  };
}

const eventPropGetter: EventPropGetter<GameEvent> = ({ game }) => ({
  className: game.conflict === "overlap" ? OVERLAP_COLOR.event : TEAM_COLORS[game.team].event,
});

export function GamesCalendar({ games }: { games: TeamGame[] }) {
  const events = games.map(toEvent);
  // react-big-calendar's Calendar is wrapped in an "uncontrollable" HOC: pass `date` without
  // `onNavigate` and it renders frozen, so the toolbar's Back/Next/Today buttons appear to do
  // nothing. Fully controlling both here is what makes them work.
  const [date, setDate] = useState(new Date());

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
        popup
      />
    </div>
  );
}
