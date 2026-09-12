"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { PlayerDetailsForm, type PlayerDetailsFormInitialData } from "../PlayerDetailsForm";
import { updateOwnPlayerAction } from "../../server/actions";

export function PlayerProfileEditForm({ player }: { player: PlayerDetailsFormInitialData }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-3">
      {saved && <Alert variant="success">Your details have been updated.</Alert>}
      <PlayerDetailsForm
        player={player}
        onSubmit={(values) => {
          setSaved(false);
          return updateOwnPlayerAction(values);
        }}
        onSuccess={() => setSaved(true)}
      />
    </div>
  );
}
