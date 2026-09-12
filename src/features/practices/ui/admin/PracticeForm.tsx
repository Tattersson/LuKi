"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TEAMS } from "@/features/games/constants";
import { DEFAULT_PRACTICE_DURATION_MINUTES, MAX_SERIES_OCCURRENCES } from "../../constants";
import {
  datetimeLocalToWallClockDate,
  wallClockDateToDatetimeLocal,
} from "../../domain/datetime";
import type { LocationSuggestion, TeamKey } from "../../domain/types";
import { createPracticeAction, updatePracticeAction } from "../../server/actions";
import { LocationSearchInput } from "./LocationSearchInput";

export interface PracticeFormInitialData {
  id: string;
  teamKey: TeamKey;
  title: string | null;
  startAt: Date;
  endAt: Date;
  locationName: string;
  locationLat: number | null;
  locationLng: number | null;
  description: string | null;
  seriesId: string | null;
}

function addMinutesToDatetimeLocal(value: string, minutes: number): string {
  const date = datetimeLocalToWallClockDate(value);
  return wallClockDateToDatetimeLocal(new Date(date.getTime() + minutes * 60_000));
}

export function PracticeForm({ practice }: { practice?: PracticeFormInitialData }) {
  const router = useRouter();
  const [teamKey, setTeamKey] = useState<TeamKey>(practice?.teamKey ?? "luki-2div");
  const [title, setTitle] = useState(practice?.title ?? "");
  const [startAt, setStartAt] = useState(
    practice ? wallClockDateToDatetimeLocal(practice.startAt) : "",
  );
  const [endAt, setEndAt] = useState(practice ? wallClockDateToDatetimeLocal(practice.endAt) : "");
  const [locationName, setLocationName] = useState(practice?.locationName ?? "");
  const [locationLat, setLocationLat] = useState<number | undefined>(
    practice?.locationLat ?? undefined,
  );
  const [locationLng, setLocationLng] = useState<number | undefined>(
    practice?.locationLng ?? undefined,
  );
  const [description, setDescription] = useState(practice?.description ?? "");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleStartChange(value: string) {
    setStartAt(value);
    if (!endAt) {
      setEndAt(addMinutesToDatetimeLocal(value, DEFAULT_PRACTICE_DURATION_MINUTES));
    }
  }

  function handleLocationSelect(suggestion: LocationSuggestion) {
    setLocationName(suggestion.label);
    setLocationLat(suggestion.lat);
    setLocationLng(suggestion.lon);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const occurrence = {
      teamKey,
      title: title.trim() || undefined,
      startAt: datetimeLocalToWallClockDate(startAt).toISOString(),
      endAt: datetimeLocalToWallClockDate(endAt).toISOString(),
      locationName,
      locationLat,
      locationLng,
      description: description.trim() || undefined,
    };

    const result = practice
      ? await updatePracticeAction({ practiceId: practice.id, ...occurrence })
      : await createPracticeAction({
          ...occurrence,
          recurrence:
            repeatWeekly && repeatUntil
              ? {
                  repeatWeekly: true,
                  until: datetimeLocalToWallClockDate(`${repeatUntil}T00:00`).toISOString(),
                }
              : { repeatWeekly: false },
        });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/practices");
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="teamKey" className="mb-1 block text-sm font-medium">
          Team
        </label>
        <Select
          id="teamKey"
          value={teamKey}
          onChange={(e) => setTeamKey(e.target.value as TeamKey)}
          className="w-auto"
        >
          {(Object.keys(TEAMS) as TeamKey[]).map((key) => (
            <option key={key} value={key}>
              {TEAMS[key].label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title (optional)
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${TEAMS[teamKey].label} Practice`}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="startAt" className="mb-1 block text-sm font-medium">
            Start
          </label>
          <Input
            id="startAt"
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="endAt" className="mb-1 block text-sm font-medium">
            End
          </label>
          <Input
            id="endAt"
            type="datetime-local"
            required
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium">
          Location
        </label>
        <LocationSearchInput
          value={locationName}
          onChange={setLocationName}
          onSelect={handleLocationSelect}
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description (optional)
        </label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What to bring, focus of the session, etc."
        />
      </div>

      {!practice && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={repeatWeekly}
              onChange={(e) => setRepeatWeekly(e.target.checked)}
            />
            Repeat weekly
          </label>
          {repeatWeekly && (
            <div className="mt-2">
              <label htmlFor="repeatUntil" className="mb-1 block text-sm font-medium">
                Repeat until
              </label>
              <Input
                id="repeatUntil"
                type="date"
                required
                value={repeatUntil}
                onChange={(e) => setRepeatUntil(e.target.value)}
                className="w-48"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Creates one practice per week on the same day and time, up to{" "}
                {MAX_SERIES_OCCURRENCES} occurrences. Each one can be edited or cancelled on
                its own afterward.
              </p>
            </div>
          )}
        </div>
      )}

      {practice?.seriesId && (
        <p className="text-xs text-neutral-500">
          Part of a recurring series - saving here only changes this occurrence.
        </p>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : practice ? "Save changes" : "Create practice"}
      </Button>
    </form>
  );
}
