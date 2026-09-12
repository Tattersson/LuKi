"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { upsertRsvpAction } from "../../server/actions";
import type { RsvpStatus } from "../../domain/types";

const SIZE_CLASSES = {
  md: "px-4 py-2 text-sm font-semibold",
  lg: "px-6 py-3 text-base font-semibold",
} as const;

/** IN/OUT are always colored per their meaning (green/red) so it's obvious which
 *  button does what at a glance - a ring highlights whichever one is the player's
 *  current status. Shared between the compact practice list/calendar and the
 *  practice detail page, just at different sizes. */
export function RsvpButtons({
  practiceId,
  canRsvp,
  myStatus,
  size = "md",
  fullWidth = false,
}: {
  practiceId: string;
  canRsvp: boolean;
  myStatus: RsvpStatus | null;
  size?: "md" | "lg";
  fullWidth?: boolean;
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

  if (!canRsvp) {
    return (
      <Link
        href="/api/auth/signin"
        className={clsx(
          "inline-flex items-center justify-center rounded-md border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800",
          SIZE_CLASSES[size],
          fullWidth && "flex w-full",
        )}
      >
        Login to RSVP
      </Link>
    );
  }

  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={clsx("flex flex-col gap-1", fullWidth && "w-full")}>
      <div className={clsx("flex items-center gap-2", fullWidth && "w-full")}>
        <Button
          type="button"
          variant="success"
          className={clsx(
            sizeClasses,
            fullWidth && "flex-1",
            myStatus === "IN" && "ring-2 ring-green-900 ring-offset-2 dark:ring-green-300 dark:ring-offset-neutral-900",
          )}
          disabled={pending}
          onClick={() => handleRsvp("IN")}
        >
          IN
        </Button>
        <Button
          type="button"
          variant="danger"
          className={clsx(
            sizeClasses,
            fullWidth && "flex-1",
            myStatus === "OUT" && "ring-2 ring-red-900 ring-offset-2 dark:ring-red-300 dark:ring-offset-neutral-900",
          )}
          disabled={pending}
          onClick={() => handleRsvp("OUT")}
        >
          OUT
        </Button>
      </div>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
