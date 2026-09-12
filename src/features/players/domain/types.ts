export type PlayerPosition = "MV" | "FW" | "D";
export type StickSide = "LEFT" | "RIGHT";

export interface PlayerSummary {
  id: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  heightCm: number | null;
  weightKg: number | null;
  stickSide: StickSide;
  birthDate: Date;
  email: string;
  emailVerifiedAt: Date;
  createdAt: Date;
}
