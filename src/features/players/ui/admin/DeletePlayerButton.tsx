"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { deletePlayerAction } from "../../server/actions";

export function DeletePlayerButton({ playerId }: { playerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Delete this player permanently? This also removes their Keycloak login. This can't be undone.")) {
      return;
    }

    setPending(true);
    setError(null);

    const result = await deletePlayerAction(playerId);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/players");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="danger" disabled={pending} onClick={handleClick}>
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
