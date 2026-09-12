import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { Practice as PrismaPractice } from "@prisma/client";
import { PracticeNotFoundError } from "../domain/errors";
import type { Practice, TeamKey } from "../domain/types";

function toDomain(row: PrismaPractice): Practice {
  return {
    id: row.id,
    teamKey: row.teamKey as TeamKey,
    title: row.title,
    startAt: row.startAt,
    endAt: row.endAt,
    locationName: row.locationName,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    description: row.description,
    seriesId: row.seriesId,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function generateSeriesId(): string {
  return randomBytes(12).toString("base64url");
}

export interface PracticeOccurrenceInput {
  teamKey: TeamKey;
  title?: string;
  startAt: Date;
  endAt: Date;
  locationName: string;
  locationLat?: number;
  locationLng?: number;
  description?: string;
}

/** Only practices happening from `now` on, that aren't cancelled - what the public
 *  list/calendar view shows. See listUpcomingPracticesForFeed for the ICS feed's wider
 *  set (also includes cancelled occurrences, so subscribers see the cancellation). */
export async function listUpcomingPractices(now: Date = new Date()): Promise<Practice[]> {
  const rows = await prisma.practice.findMany({
    where: { startAt: { gte: now }, status: "SCHEDULED" },
    orderBy: { startAt: "asc" },
  });
  return rows.map(toDomain);
}

export async function listUpcomingPracticesForFeed(now: Date = new Date()): Promise<Practice[]> {
  const rows = await prisma.practice.findMany({
    where: { startAt: { gte: now } },
    orderBy: { startAt: "asc" },
  });
  return rows.map(toDomain);
}

/** Everything an admin might still need to manage - upcoming, scheduled or cancelled. */
export async function listPracticesForAdmin(now: Date = new Date()): Promise<Practice[]> {
  const rows = await prisma.practice.findMany({
    where: { startAt: { gte: now } },
    orderBy: { startAt: "asc" },
  });
  return rows.map(toDomain);
}

export async function getPracticeById(id: string): Promise<Practice | null> {
  const row = await prisma.practice.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

/** Creates one Practice row per occurrence. When there's more than one (a recurring
 *  series), every row shares a freshly generated seriesId so they can later be edited
 *  or cancelled as a group; a single occurrence gets seriesId: null. */
export async function createPracticeSeries(
  occurrences: PracticeOccurrenceInput[],
): Promise<{ seriesId: string | null }> {
  const seriesId = occurrences.length > 1 ? generateSeriesId() : null;

  await prisma.$transaction(
    occurrences.map((occurrence) =>
      prisma.practice.create({
        data: { ...occurrence, seriesId },
      }),
    ),
  );

  return { seriesId };
}

/** Edits a single occurrence - never touches sibling rows in its series, and bumps
 *  `version` so the ICS feed's SEQUENCE reflects the change. */
export async function updatePractice(params: {
  id: string;
  teamKey: TeamKey;
  title?: string;
  startAt: Date;
  endAt: Date;
  locationName: string;
  locationLat?: number;
  locationLng?: number;
  description?: string;
}): Promise<Practice> {
  const { id, ...data } = params;

  const existing = await prisma.practice.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new PracticeNotFoundError();
  }

  const row = await prisma.practice.update({
    where: { id },
    data: {
      ...data,
      title: data.title ?? null,
      locationLat: data.locationLat ?? null,
      locationLng: data.locationLng ?? null,
      description: data.description ?? null,
      version: { increment: 1 },
    },
  });
  return toDomain(row);
}

export async function cancelPractice(id: string): Promise<Practice> {
  const existing = await prisma.practice.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new PracticeNotFoundError();
  }

  const row = await prisma.practice.update({
    where: { id },
    data: { status: "CANCELLED", version: { increment: 1 } },
  });
  return toDomain(row);
}

/** Cancels this occurrence and every still-scheduled occurrence in the same series from
 *  this one's start time onward (never touches ones already in the past). Falls back to
 *  cancelling just this row when it isn't part of a series. */
export async function cancelSeriesFromOccurrence(id: string): Promise<void> {
  const practice = await prisma.practice.findUnique({
    where: { id },
    select: { seriesId: true, startAt: true },
  });
  if (!practice) {
    throw new PracticeNotFoundError();
  }

  if (!practice.seriesId) {
    await cancelPractice(id);
    return;
  }

  await prisma.practice.updateMany({
    where: { seriesId: practice.seriesId, startAt: { gte: practice.startAt }, status: "SCHEDULED" },
    data: { status: "CANCELLED", version: { increment: 1 } },
  });
}

export async function deletePractice(id: string): Promise<void> {
  const existing = await prisma.practice.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new PracticeNotFoundError();
  }
  await prisma.practice.delete({ where: { id } });
}
