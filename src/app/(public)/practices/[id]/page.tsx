import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { TEAMS, TEAM_COLORS } from "@/features/games/constants";
import { auth } from "@/lib/auth/auth";
import { hasAnyRole, PLAYER_ROLE_NAME } from "@/lib/auth/rbac";
import { getCurrentPlayer } from "@/features/players/server/current-player";
import { countPlayers } from "@/features/players/server/player-repository";
import { getPracticeById } from "@/features/practices/server/practice-repository";
import { getRsvpForPlayer, getRsvpSummary } from "@/features/practices/server/rsvp-repository";
import { toLocalDisplayDate } from "@/features/practices/domain/datetime";
import { practiceEventTitle } from "@/features/practices/format";
import { RsvpButtons } from "@/features/practices/ui/public/RsvpButtons";
import type { RsvpBucket, RsvpNameEntry } from "@/features/practices/domain/types";

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practice = await getPracticeById(id);
  if (!practice) {
    notFound();
  }

  const session = await auth();
  const isSignedIn = !!session?.user;
  const canRsvp = hasAnyRole(session, [PLAYER_ROLE_NAME]);
  const player = canRsvp ? await getCurrentPlayer() : null;

  // RSVP names/counts are never fetched for an anonymous visitor, so there's nothing
  // to leak via the page's HTML/RSC payload either.
  const [summary, myStatus, registeredCount] = isSignedIn
    ? await Promise.all([
        getRsvpSummary(practice.id),
        player ? getRsvpForPlayer(practice.id, player.id) : Promise.resolve(null),
        countPlayers(),
      ])
    : [null, null, null];

  const rsvpdCount = summary
    ? summary.goalkeepers.in.length +
      summary.goalkeepers.out.length +
      summary.players.in.length +
      summary.players.out.length
    : 0;

  const start = toLocalDisplayDate(practice.startAt);
  const end = toLocalDisplayDate(practice.endAt);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/practices" className="text-sm text-neutral-500 hover:underline">
        ← Back to practices
      </Link>

      <div className="mt-3 flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: TEAM_COLORS[practice.teamKey].dot,
            border: "1px solid rgba(0,0,0,0.35)",
          }}
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-semibold">{practiceEventTitle(practice)}</h1>
          <p className="text-sm text-neutral-500">{TEAMS[practice.teamKey].label}</p>
        </div>
      </div>

      <Card className="mt-4">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Date</dt>
            <dd>{format(start, "EEEE d MMM yyyy")}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Time</dt>
            <dd>
              {format(start, "HH:mm")}–{format(end, "HH:mm")}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Location</dt>
            <dd>{practice.locationName}</dd>
          </div>
        </dl>
        {practice.description && (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{practice.description}</p>
        )}
      </Card>

      {isSignedIn && summary ? (
        <>
          <p className="mt-4 text-sm text-neutral-500">
            {rsvpdCount} of {registeredCount} registered players have RSVP&apos;d
          </p>

          <div className="mt-2">
            <RsvpButtons practiceId={practice.id} canRsvp={canRsvp} myStatus={myStatus} size="lg" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PositionBox label="Goalies" bucket={summary.goalkeepers} />
            <PositionBox label="Players" bucket={summary.players} />
          </div>
        </>
      ) : (
        <Alert variant="info" className="mt-4">
          <Link href="/api/auth/signin" className="font-medium underline">
            Sign in
          </Link>{" "}
          to view who&apos;s in/out and RSVP counts.
        </Alert>
      )}
    </main>
  );
}

function PositionBox({ label, bucket }: { label: string; bucket: RsvpBucket }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">{label}</h2>
      <div className="flex flex-col gap-3">
        <RsvpStatusAlert label="IN" variant="success" entries={bucket.in} />
        <RsvpStatusAlert label="OUT" variant="error" entries={bucket.out} />
      </div>
    </Card>
  );
}

function RsvpStatusAlert({
  label,
  variant,
  entries,
}: {
  label: string;
  variant: "success" | "error";
  entries: RsvpNameEntry[];
}) {
  return (
    <Alert variant={variant}>
      <div className="font-semibold">
        {label} ({entries.length})
      </div>
      {entries.length === 0 ? (
        <p className="mt-1 text-xs opacity-75">No one yet.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {entries.map((entry) => (
            <li key={entry.playerId}>{entry.displayName}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
