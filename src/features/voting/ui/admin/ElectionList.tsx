import Link from "next/link";
import type { ElectionSummary } from "../../domain/types";
import { ElectionStatusBadge } from "./ElectionStatusBadge";

export function ElectionList({ elections }: { elections: ElectionSummary[] }) {
  if (elections.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No elections yet. Create one to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {elections.map((election) => (
        <li key={election.id} className="py-3">
          <Link
            href={`/admin/elections/${election.id}`}
            className="flex items-center justify-between gap-4 hover:underline"
          >
            <span className="font-medium">{election.title}</span>
            <span className="flex items-center gap-3 text-sm text-neutral-500">
              {election.voteCount} votes · {election.candidateCount} candidates
              {election.closesAt && election.status === "OPEN" && (
                <span>closes {election.closesAt.toLocaleDateString()}</span>
              )}
              <ElectionStatusBadge status={election.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
