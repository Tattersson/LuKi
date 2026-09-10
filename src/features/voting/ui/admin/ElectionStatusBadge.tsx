import { clsx } from "@/lib/clsx";
import type { ElectionStatus } from "../../domain/types";

const LABELS: Record<ElectionStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

const STYLES: Record<ElectionStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CLOSED: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
};

export function ElectionStatusBadge({ status }: { status: ElectionStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
