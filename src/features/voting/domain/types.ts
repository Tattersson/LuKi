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

export interface ElectionResults {
  electionId: string;
  title: string;
  status: ElectionStatus;
  captainResults: PositionResult[];
  viceCaptainResults: PositionResult[];
}
