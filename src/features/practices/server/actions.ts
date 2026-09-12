"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { hasAnyRole, PLAYER_ROLE_NAME, requireAdmin } from "@/lib/auth/rbac";
import { getCurrentPlayer } from "@/features/players/server/current-player";
import { MAX_SERIES_OCCURRENCES } from "../constants";
import { PracticeNotFoundError } from "../domain/errors";
import type { RsvpStatus } from "../domain/types";
import { computeWeeklyOccurrences } from "../domain/recurrence";
import { createPracticeSchema, updatePracticeSchema, upsertRsvpSchema } from "../validation/schemas";
import {
  cancelPractice,
  cancelSeriesFromOccurrence,
  createPracticeSeries,
  deletePractice,
  updatePractice,
} from "./practice-repository";
import { upsertRsvp } from "./rsvp-repository";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function revalidatePracticePaths() {
  revalidatePath("/admin/practices");
  revalidatePath("/practices");
}

export async function createPracticeAction(
  input: unknown,
): Promise<ActionResult<{ seriesId: string | null }>> {
  await requireAdmin();
  const parsed = createPracticeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { recurrence, ...occurrence } = parsed.data;
  const occurrences =
    recurrence?.repeatWeekly === true
      ? computeWeeklyOccurrences(
          occurrence.startAt,
          occurrence.endAt,
          recurrence.until,
          MAX_SERIES_OCCURRENCES,
        )
      : [{ start: occurrence.startAt, end: occurrence.endAt }];

  const result = await createPracticeSeries(
    occurrences.map(({ start, end }) => ({ ...occurrence, startAt: start, endAt: end })),
  );

  revalidatePracticePaths();
  return { ok: true, data: result };
}

export async function updatePracticeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = updatePracticeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { practiceId, ...occurrence } = parsed.data;

  try {
    await updatePractice({ id: practiceId, ...occurrence });
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePracticePaths();
  return { ok: true, data: { id: practiceId } };
}

export async function cancelPracticeAction(practiceId: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  try {
    await cancelPractice(practiceId);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePracticePaths();
  return { ok: true, data: { id: practiceId } };
}

export async function cancelSeriesAction(practiceId: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  try {
    await cancelSeriesFromOccurrence(practiceId);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePracticePaths();
  return { ok: true, data: { id: practiceId } };
}

export async function deletePracticeAction(practiceId: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  try {
    await deletePractice(practiceId);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePracticePaths();
  return { ok: true, data: { id: practiceId } };
}

function toErrorResult(error: unknown): { ok: false; error: string } {
  if (error instanceof PracticeNotFoundError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function upsertRsvpAction(input: unknown): Promise<ActionResult<{ status: RsvpStatus }>> {
  const parsed = upsertRsvpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid RSVP." };
  }

  // Deliberately returns an ActionResult error instead of using requireAdmin()'s
  // redirect() - a redirect mid-click on an RSVP toggle button is bad UX.
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Please sign in to RSVP." };
  }
  if (!hasAnyRole(session, [PLAYER_ROLE_NAME])) {
    return { ok: false, error: "Your account isn't set up to RSVP yet." };
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return { ok: false, error: "We couldn't find your player record. Contact an admin." };
  }

  try {
    await upsertRsvp({ practiceId: parsed.data.practiceId, playerId: player.id, status: parsed.data.status });
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePracticePaths();
  return { ok: true, data: { status: parsed.data.status } };
}
