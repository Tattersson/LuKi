"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { upsertRsvpAction } from "../../server/actions";
import type { RsvpBucket, RsvpStatus, RsvpSummary } from "../../domain/types";

export function PracticeRsvpSummary({
  practiceId,
  canRsvp,
  summary,
  myStatus,
}: {
  practiceId: string;
  canRsvp: boolean;
  summary: RsvpSummary;
  myStatus: RsvpStatus | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRsvp(status: RsvpStatus) {
    setPending(true);
    setError(null);

    const result = await upsertRsvpAction({ practiceId, status });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-1 text-xs text-neutral-500">
      <RsvpBucketLine label="Goalies" bucket={summary.goalkeepers} />
      <RsvpBucketLine label="Players" bucket={summary.players} />

      {canRsvp ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={myStatus === "IN" ? "primary" : "secondary"}
            className="px-2 py-0.5 text-xs"
            disabled={pending}
            onClick={() => handleRsvp("IN")}
          >
            I&apos;m in
          </Button>
          <Button
            type="button"
            variant={myStatus === "OUT" ? "primary" : "secondary"}
            className="px-2 py-0.5 text-xs"
            disabled={pending}
            onClick={() => handleRsvp("OUT")}
          >
            I&apos;m out
          </Button>
        </div>
      ) : (
        <Link
          href="/api/auth/signin"
          className="rounded-md border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Sign in to RSVP
        </Link>
      )}

      {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

function RsvpBucketLine({ label, bucket }: { label: string; bucket: RsvpBucket }) {
  return (
    <div className="flex flex-wrap gap-x-1">
      <span className="font-medium text-neutral-600 dark:text-neutral-400">{label}:</span>
      <span>
        IN ({bucket.in.length}){bucket.in.length > 0 && `: ${bucket.in.map((p) => p.displayName).join(", ")}`}
      </span>
      <span>·</span>
      <span>
        OUT ({bucket.out.length})
        {bucket.out.length > 0 && `: ${bucket.out.map((p) => p.displayName).join(", ")}`}
      </span>
    </div>
  );
}
