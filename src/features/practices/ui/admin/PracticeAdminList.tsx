"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toLocalDisplayDate } from "../../domain/datetime";
import { practiceEventTitle } from "../../format";
import type { Practice } from "../../domain/types";
import {
  cancelPracticeAction,
  cancelSeriesAction,
  deletePracticeAction,
} from "../../server/actions";

export function PracticeAdminList({ practices }: { practices: Practice[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (practices.length === 0) {
    return <p className="text-sm text-neutral-500">No upcoming practices scheduled.</p>;
  }

  async function withPending(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setPendingId(id);
    const result = await action();
    setPendingId(null);
    if (!result.ok) {
      alert(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {practices.map((practice) => {
        const start = toLocalDisplayDate(practice.startAt);
        const isPending = pendingId === practice.id;

        return (
          <li key={practice.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">
                {practiceEventTitle(practice)}
                {practice.status === "CANCELLED" && (
                  <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    Cancelled
                  </span>
                )}
                {practice.seriesId && (
                  <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    Series
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-500">
                {format(start, "EEE d MMM yyyy")} · {format(start, "HH:mm")} · {practice.locationName}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/practices/${practice.id}/edit`}>
                <Button type="button" variant="secondary" className="px-3 py-1 text-xs">
                  Edit
                </Button>
              </Link>
              {practice.status === "SCHEDULED" && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    disabled={isPending}
                    onClick={() => withPending(practice.id, () => cancelPracticeAction(practice.id))}
                  >
                    Cancel
                  </Button>
                  {practice.seriesId && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1 text-xs"
                      disabled={isPending}
                      onClick={() =>
                        withPending(practice.id, () => cancelSeriesAction(practice.id))
                      }
                    >
                      Cancel series
                    </Button>
                  )}
                </>
              )}
              <Button
                type="button"
                variant="danger"
                className="px-3 py-1 text-xs"
                disabled={isPending}
                onClick={() => {
                  if (confirm("Delete this practice permanently? This can't be undone.")) {
                    withPending(practice.id, () => deletePracticeAction(practice.id));
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
