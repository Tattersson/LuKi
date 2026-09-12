"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import type { GameRosters, RosterPlayer } from "../../domain/types";

type Status = "idle" | "loading" | "error";
type TeamChoice = "home" | "away";
const GOALIE_POSITION = "MV";

export function Rosters({
  gameId,
  season,
  homeTeamName,
  awayTeamName,
}: {
  gameId: number;
  season: number;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rosters, setRosters] = useState<GameRosters | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [team, setTeam] = useState<TeamChoice>("home");

  function openModal() {
    setOpen(true);
    if (rosters || status === "loading") return;

    setStatus("loading");
    fetch(`/api/games/rosters?gameId=${gameId}&season=${season}`)
      .then((response) => {
        if (!response.ok) throw new Error("request failed");
        return response.json();
      })
      .then((data: GameRosters) => {
        setRosters(data);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-500">Rosters</h2>
        <Button type="button" variant="secondary" onClick={openModal}>
          View rosters
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Rosters"
        widthClassName="max-w-2xl"
      >
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={team === "home" ? "primary" : "secondary"}
            onClick={() => setTeam("home")}
          >
            {homeTeamName}
          </Button>
          <Button
            type="button"
            variant={team === "away" ? "primary" : "secondary"}
            onClick={() => setTeam("away")}
          >
            {awayTeamName}
          </Button>
        </div>

        {status === "loading" && <p className="text-sm text-neutral-500">Loading rosters…</p>}
        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load rosters.</p>
        )}
        {rosters && <TeamRoster players={team === "home" ? rosters.home : rosters.away} />}
      </Modal>
    </Card>
  );
}

/** Splits an already-sorted (see roster-client.ts: goalies first, then skaters grouped
 *  by line) player list back into line groups to lay out, and pulls goalies out to be
 *  rendered separately at the bottom. */
function groupByLine(players: RosterPlayer[]): Array<{ line: number | null; players: RosterPlayer[] }> {
  const groups: Array<{ line: number | null; players: RosterPlayer[] }> = [];
  const byLine = new Map<number | null, RosterPlayer[]>();

  for (const player of players) {
    const bucket = byLine.get(player.line);
    if (bucket) bucket.push(player);
    else byLine.set(player.line, [player]);
  }

  for (const [line, linePlayers] of byLine) {
    groups.push({ line, players: linePlayers });
  }

  return groups;
}

function TeamRoster({ players }: { players: RosterPlayer[] }) {
  if (players.length === 0) {
    return <p className="text-sm text-neutral-500">No roster available.</p>;
  }

  const goalies = players.filter((p) => p.position === GOALIE_POSITION);
  const skaters = players.filter((p) => p.position !== GOALIE_POSITION);

  return (
    <div className="space-y-4">
      {groupByLine(skaters).map((group) => (
        <LineFormation key={group.line ?? "other"} line={group.line} players={group.players} />
      ))}

      {goalies.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Goalies</h3>
          <ul className="space-y-1.5">
            {goalies.map((player, index) => (
              <PlayerSlot key={`${player.jersey}-${player.name}`} player={player} label={index === 0 ? "Starter" : undefined} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Forwards (LW/C/RW) on one row, defence (LD/RD) on a narrower row beneath, so a line
 *  visually reads like an on-ice formation rather than a plain list. */
function LineFormation({ line, players }: { line: number | null; players: RosterPlayer[] }) {
  const forwards = players.filter((p) => p.position === "VL" || p.position === "KH" || p.position === "OL");
  const defence = players.filter((p) => p.position === "VP" || p.position === "OP");
  const other = players.filter((p) => !forwards.includes(p) && !defence.includes(p));

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        {line !== null ? `Line ${line}` : "Other"}
      </h3>
      <div className="space-y-2">
        {forwards.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {sortByPosition(forwards, ["VL", "KH", "OL"]).map((player) => (
              <PlayerCard key={`${player.jersey}-${player.name}`} player={player} />
            ))}
          </div>
        )}
        {defence.length > 0 && (
          <div className="mx-auto grid max-w-[75%] grid-cols-2 gap-2">
            {sortByPosition(defence, ["VP", "OP"]).map((player) => (
              <PlayerCard key={`${player.jersey}-${player.name}`} player={player} />
            ))}
          </div>
        )}
        {other.length > 0 && (
          <ul className="space-y-1">
            {other.map((player) => (
              <PlayerSlot key={`${player.jersey}-${player.name}`} player={player} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function sortByPosition(players: RosterPlayer[], order: string[]): RosterPlayer[] {
  return [...players].sort((a, b) => order.indexOf(a.position) - order.indexOf(b.position));
}

function PlayerCard({ player }: { player: RosterPlayer }) {
  return (
    <div className="rounded-md bg-neutral-100 px-2 py-1.5 text-center dark:bg-neutral-800">
      <div className="font-mono text-xs text-neutral-500">
        {player.position} · #{player.jersey}
      </div>
      <div className="truncate text-sm font-medium">
        {player.name}
        {player.captain && <span className="ml-1 text-xs text-neutral-500">({player.captain})</span>}
      </div>
    </div>
  );
}

function PlayerSlot({ player, label }: { player: RosterPlayer; label?: string }) {
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span className="w-6 shrink-0 text-right font-mono text-neutral-500">{player.jersey}</span>
      <span className="min-w-0 flex-1">
        {player.name}
        {player.captain && <span className="ml-1 text-xs text-neutral-500">({player.captain})</span>}
      </span>
      {label && (
        <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
          {label}
        </span>
      )}
    </li>
  );
}
