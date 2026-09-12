"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { POSITION_LABELS, STICK_SIDE_LABELS } from "../../constants";
import { updatePlayerAction } from "../../server/actions";
import type { PlayerPosition, StickSide } from "../../domain/types";

export interface PlayerEditFormInitialData {
  id: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  heightCm: number;
  weightKg: number;
  stickSide: StickSide;
  birthDate: Date;
}

function toDateInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function PlayerEditForm({ player }: { player: PlayerEditFormInitialData }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [position, setPosition] = useState<PlayerPosition>(player.position);
  const [heightCm, setHeightCm] = useState(String(player.heightCm));
  const [weightKg, setWeightKg] = useState(String(player.weightKg));
  const [stickSide, setStickSide] = useState<StickSide>(player.stickSide);
  const [birthDate, setBirthDate] = useState(toDateInputValue(player.birthDate));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await updatePlayerAction({
      playerId: player.id,
      firstName,
      lastName,
      position,
      heightCm,
      weightKg,
      stickSide,
      birthDate,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/players/${player.id}`);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
            First name
          </label>
          <Input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium">
            Last name
          </label>
          <Input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="position" className="mb-1 block text-sm font-medium">
            Position
          </label>
          <Select
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value as PlayerPosition)}
          >
            {Object.entries(POSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="stickSide" className="mb-1 block text-sm font-medium">
            Stick side
          </label>
          <Select
            id="stickSide"
            value={stickSide}
            onChange={(e) => setStickSide(e.target.value as StickSide)}
          >
            {Object.entries(STICK_SIDE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="heightCm" className="mb-1 block text-sm font-medium">
            Height (cm)
          </label>
          <Input
            id="heightCm"
            type="number"
            required
            inputMode="numeric"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="weightKg" className="mb-1 block text-sm font-medium">
            Weight (kg)
          </label>
          <Input
            id="weightKg"
            type="number"
            required
            inputMode="numeric"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="birthDate" className="mb-1 block text-sm font-medium">
          Birthdate
        </label>
        <Input
          id="birthDate"
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-48"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
