export type ElectionStatus = "DRAFT" | "OPEN" | "CLOSED";
export type VotePosition = "CAPTAIN" | "VICE_CAPTAIN";

export interface CandidateView {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicElectionView {
  id: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  /** Null for a normal election. Set on a tie-breaker round to the single position
   *  it exists to decide - the ballot only asks about this position. */
  tieBreakerPosition: VotePosition | null;
  /** Null for a normal election. How many winner slots for tieBreakerPosition are
   *  still undecided (1 for a Captain tie-breaker; 1 or 2 for Vice-Captain). */
  tieBreakerSlots: number | null;
  candidates: CandidateView[];
}

export interface ElectionSummary {
  id: string;
  title: string;
  status: ElectionStatus;
  publicSlug: string;
  createdAt: Date;
  closesAt: Date | null;
  candidateCount: number;
  voteCount: number;
}

export interface PositionResult {
  candidateId: string;
  name: string;
  votes: number;
}

/** Same shape as PositionResult, used internally while tallying/detecting ties. */
export type PositionTally = PositionResult;

export interface ElectionResults {
  electionId: string;
  title: string;
  status: ElectionStatus;
  captainResults: PositionResult[];
  viceCaptainResults: PositionResult[];
}
