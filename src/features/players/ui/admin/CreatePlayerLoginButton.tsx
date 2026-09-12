"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { createPlayerLoginAction } from "../../server/actions";

export function CreatePlayerLoginButton({
  playerId,
  hasKeycloakAccount,
}: {
  playerId: string;
  hasKeycloakAccount: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setPending(true);
    setError(null);
    setDone(false);

    const result = await createPlayerLoginAction(playerId);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={handleClick}>
        {pending ? "Working..." : hasKeycloakAccount ? "Resend login email" : "Create login"}
      </Button>
      {error && <Alert variant="error">{error}</Alert>}
      {done && !error && <Alert variant="success">Email sent.</Alert>}
    </div>
  );
}
