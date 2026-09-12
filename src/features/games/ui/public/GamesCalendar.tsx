"use client";

import { useState } from "react";
import Link from "next/link";
import { format, getDay, parse, parseISO, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar, dateFnsLocalizer, type EventPropGetter } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./GamesCalendar.css";
import { Modal } from "@/components/ui/modal";
import {
  ASSUMED_GAME_DURATION_MINUTES,
  OVERLAP_BADGE,
  OVERLAP_COLOR,
  SAME_DAY_BADGE,
  TEAM_COLORS,
} from "../../constants";
import { gameDetailLines, gameEventTitle } from "../../format";
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

  return { game, start, end, title: gameEventTitle(game) };
}

const eventPropGetter: EventPropGetter<GameEvent> = ({ game }) => ({
  className: game.conflict === "overlap" ? OVERLAP_COLOR.event : TEAM_COLORS[game.team].event,
});

/** Native title-attribute tooltip - the mouse-hover path on desktop. Touch devices don't
 *  get hover, so `onSelectEvent` below opens the same information in a modal on tap. */
function tooltipFor(game: TeamGame): string {
  return [gameEventTitle(game), `Location: ${game.rinkName}`, ...gameDetailLines(game)].join("\n");
}

export function GamesCalendar({ games }: { games: TeamGame[] }) {
  const events = games.map(toEvent);
  // react-big-calendar's Calendar is wrapped in an "uncontrollable" HOC: pass `date` without
  // `onNavigate` and it renders frozen, so the toolbar's Back/Next/Today buttons appear to do
  // nothing. Fully controlling both here is what makes them work.
  const [date, setDate] = useState(new Date());
  const [selectedGame, setSelectedGame] = useState<TeamGame | null>(null);

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
        tooltipAccessor={({ game }) => tooltipFor(game)}
        onSelectEvent={({ game }) => setSelectedGame(game)}
        popup
      />

      <Modal
        open={selectedGame !== null}
        onClose={() => setSelectedGame(null)}
        title={selectedGame ? gameEventTitle(selectedGame) : ""}
      >
        {selectedGame && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="text-neutral-600 dark:text-neutral-400">
              {format(parseISO(selectedGame.dateISO), "EEE d MMM yyyy")}
              {selectedGame.time ? ` · ${selectedGame.time.slice(0, 5)}` : " · Time to be confirmed"}
            </div>
            <div className="font-medium">{selectedGame.rinkName}</div>
            {selectedGame.status !== "upcoming" && (
              <div className="font-semibold">
                {selectedGame.homeGoals} – {selectedGame.awayGoals}
                {selectedGame.status === "live" ? " (live)" : ""}
              </div>
            )}
            {selectedGame.conflict && (
              <span
                className="inline-block w-fit rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor:
                    selectedGame.conflict === "overlap" ? OVERLAP_BADGE.background : SAME_DAY_BADGE.background,
                  color: selectedGame.conflict === "overlap" ? OVERLAP_BADGE.text : SAME_DAY_BADGE.text,
                }}
              >
                {selectedGame.conflict === "overlap" ? "Overlaps with the other team" : "Game on same day"}
              </span>
            )}
            <Link
              href={`/games/${selectedGame.id}?season=${selectedGame.season}`}
              className="mt-2 text-sm font-medium underline"
              onClick={() => setSelectedGame(null)}
            >
              View full game details
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
