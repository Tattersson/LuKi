import type { MailMessage } from "@/lib/mailer";
import type { VotePosition } from "../../domain/types";

export function renderTieBreakerInviteEmail(params: {
  to: string;
  parentElectionTitle: string;
  position: VotePosition;
  tiedCandidateNames: string[];
  voteUrl: string;
}): MailMessage {
  const { to, parentElectionTitle, position, tiedCandidateNames, voteUrl } = params;
  const positionLabel = position === "CAPTAIN" ? "Captain" : "Vice-Captain";
  const namesText = tiedCandidateNames.join(", ");

  return {
    to,
    subject: `Tie-breaker needed for "${parentElectionTitle}"`,
    text: `Voting has closed for "${parentElectionTitle}", but ${positionLabel} ended in a tie between: ${namesText}.\n\nAs someone who voted in the first round, please cast one more vote to break the tie: ${voteUrl}\n\nThank you for voting.`,
    html: `<p>Voting has closed for <strong>${parentElectionTitle}</strong>, but ${positionLabel} ended in a tie between: ${namesText}.</p><p>As someone who voted in the first round, please cast one more vote to break the tie:</p><p><a href="${voteUrl}">${voteUrl}</a></p><p>Thank you for voting.</p>`,
  };
}
