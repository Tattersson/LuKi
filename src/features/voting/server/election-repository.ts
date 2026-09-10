import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type {
  ElectionResults,
  ElectionSummary,
  PositionResult,
  PublicElectionView,
} from "../domain/types";

function generatePublicSlug(): string {
  return randomBytes(12).toString("base64url");
}

export async function createElection(params: {
  title: string;
  description?: string;
  candidates: Array<{ name: string; description?: string }>;
  createdByEmail: string;
  closesAt?: Date;
}) {
  const { title, description, candidates, createdByEmail, closesAt } = params;
  return prisma.election.create({
    data: {
      title,
      description,
      createdByEmail,
      closesAt,
      publicSlug: generatePublicSlug(),
      candidates: {
        create: candidates.map((c, index) => ({
          name: c.name,
          description: c.description,
          sortOrder: index,
        })),
      },
    },
  });
}

export async function listElections(): Promise<ElectionSummary[]> {
  const elections = await prisma.election.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidates: true, votes: true } } },
  });
  return elections.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    publicSlug: e.publicSlug,
    createdAt: e.createdAt,
    closesAt: e.closesAt,
    candidateCount: e._count.candidates,
    voteCount: e._count.votes,
  }));
}

export async function getElectionForAdmin(id: string) {
  return prisma.election.findUnique({
    where: { id },
    include: { candidates: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getPublicElectionBySlug(
  slug: string,
): Promise<PublicElectionView | null> {
  const election = await prisma.election.findUnique({
    where: { publicSlug: slug },
    include: { candidates: { orderBy: { sortOrder: "asc" } } },
  });
  if (!election) return null;
  return {
    id: election.id,
    title: election.title,
    description: election.description,
    status: election.status,
    candidates: election.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    })),
  };
}

/** Opens an election. Closing goes through election-lifecycle.ts's closeElectionAndNotify instead,
 *  since closing also has to tally results and send the notification email. */
export async function openElection(id: string) {
  return prisma.election.update({
    where: { id },
    data: { status: "OPEN", openedAt: new Date() },
  });
}

export async function getElectionResults(id: string): Promise<ElectionResults | null> {
  const election = await prisma.election.findUnique({
    where: { id },
    include: { candidates: { orderBy: { sortOrder: "asc" } } },
  });
  if (!election) return null;

  const tallies = await prisma.vote.groupBy({
    by: ["candidateId", "position"],
    where: { electionId: id },
    _count: { candidateId: true },
  });

  function resultsFor(position: "CAPTAIN" | "VICE_CAPTAIN"): PositionResult[] {
    return election!.candidates.map((c) => ({
      candidateId: c.id,
      name: c.name,
      votes:
        tallies.find((t) => t.candidateId === c.id && t.position === position)?._count
          .candidateId ?? 0,
    }));
  }

  return {
    electionId: election.id,
    title: election.title,
    status: election.status,
    captainResults: resultsFor("CAPTAIN"),
    viceCaptainResults: resultsFor("VICE_CAPTAIN"),
  };
}
