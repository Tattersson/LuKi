"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { POSITION_LABELS, STICK_SIDE_LABELS } from "../../constants";
import type { PlayerPosition, StickSide } from "../../domain/types";

export interface PlayerDetailsInput {
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  heightCm: string;
  weightKg: string;
  stickSide: StickSide;
  birthDate: string;
}

export function PlayerDetailsStep({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (details: PlayerDetailsInput) => void;
  pending: boolean;
  error: string | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState<PlayerPosition>("FW");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [stickSide, setStickSide] = useState<StickSide>("LEFT");
  const [birthDate, setBirthDate] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ firstName, lastName, position, heightCm, weightKg, stickSide, birthDate });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Your email is verified. Fill in your details to create your player card.
      </p>

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

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating player card..." : "Create player card"}
      </Button>
    </form>
  );
}
