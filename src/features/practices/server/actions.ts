"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { MAX_SERIES_OCCURRENCES } from "../constants";
import { PracticeNotFoundError } from "../domain/errors";
import { computeWeeklyOccurrences } from "../domain/recurrence";
import { createPracticeSchema, updatePracticeSchema } from "../validation/schemas";
import {
  cancelPractice,
  cancelSeriesFromOccurrence,
  createPracticeSeries,
  deletePractice,
  updatePractice,
} from "./practice-repository";

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

// RSVP write path intentionally not implemented yet: there is no way to identify a
// member (Keycloak member login is planned separately, see Player.rsvps and
// rsvp-repository.ts's getRsvpSummary, which are ready for it). Once that lands, add
// an upsertRsvpAction here that resolves the signed-in member's Player row and writes
// a PracticeRsvp row keyed on (practiceId, playerId).
