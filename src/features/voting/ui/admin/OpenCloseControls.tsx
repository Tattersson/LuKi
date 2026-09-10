"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { openElectionAction, closeElectionAction } from "../../server/actions";
import type { ElectionStatus } from "../../domain/types";

export function OpenCloseControls({
  electionId,
  status,
}: {
  electionId: string;
  status: ElectionStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleOpen() {
    setPending(true);
    await openElectionAction(electionId);
    setPending(false);
    router.refresh();
  }

  async function handleClose() {
    setPending(true);
    await closeElectionAction(electionId);
    setPending(false);
    router.refresh();
  }

  if (status === "DRAFT") {
    return (
      <Button onClick={handleOpen} disabled={pending}>
        {pending ? "Opening..." : "Open voting"}
      </Button>
    );
  }

  if (status === "OPEN") {
    return (
      <Button variant="danger" onClick={handleClose} disabled={pending}>
        {pending ? "Closing..." : "Close voting"}
      </Button>
    );
  }

  return null;
}
