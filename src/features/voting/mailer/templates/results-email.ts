import type { MailMessage } from "@/lib/mailer";

function listNames(names: string[]): string {
  if (names.length === 0) return "no one (no votes were cast)";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} (tied)`;
}

export function renderResultsEmail(params: {
  to: string;
  electionTitle: string;
  /** Null when this round wasn't about this position at all (e.g. a Vice-Captain
   *  tie-breaker round has nothing to say about Captain) - that line is omitted. */
  captainWinners: string[] | null;
  viceCaptainWinners: string[] | null;
}): MailMessage {
  const { to, electionTitle, captainWinners, viceCaptainWinners } = params;

  const lines = [
    captainWinners !== null ? `Captain: ${listNames(captainWinners)}` : null,
    viceCaptainWinners !== null ? `Vice-Captain: ${listNames(viceCaptainWinners)}` : null,
  ].filter((line): line is string => line !== null);

  return {
    to,
    subject: `Results for "${electionTitle}"`,
    text: `Voting has closed for "${electionTitle}".\n\n${lines.join("\n")}\n\nThank you for voting.`,
    html: `<p>Voting has closed for <strong>${electionTitle}</strong>.</p><p>${lines.join("<br/>")}</p><p>Thank you for voting.</p>`,
  };
}
