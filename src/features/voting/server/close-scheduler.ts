import { prisma } from "@/lib/db/prisma";
import { ELECTION_CLOSE_CHECK_INTERVAL_MS } from "../constants";
import { closeElectionAndNotify } from "./election-lifecycle";

declare global {
  var __electionCloseSchedulerStarted: boolean | undefined;
}

async function checkDueElections(): Promise<void> {
  const due = await prisma.election.findMany({
    where: { status: "OPEN", closesAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const election of due) {
    await closeElectionAndNotify(election.id);
  }
}

/** Starts the in-process poller that auto-closes elections past their closesAt
 *  deadline. Idempotent - safe to call multiple times (e.g. across dev-mode
 *  hot reloads), only ever starts one interval per process. */
export function startElectionCloseScheduler(): void {
  if (global.__electionCloseSchedulerStarted) return;
  global.__electionCloseSchedulerStarted = true;

  const interval = setInterval(() => {
    checkDueElections().catch((error) => {
      console.error("[election-close-scheduler] check failed:", error);
    });
  }, ELECTION_CLOSE_CHECK_INTERVAL_MS);
  interval.unref();
}
