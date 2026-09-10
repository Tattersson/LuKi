import type { MailMessage } from "@/lib/mailer";

function listNames(names: string[]): string {
  if (names.length === 0) return "no one (no votes were cast)";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} (tied)`;
}

export function renderResultsEmail(params: {
  to: string;
  electionTitle: string;
  captainWinners: string[];
  viceCaptainWinners: string[];
}): MailMessage {
  const { to, electionTitle, captainWinners, viceCaptainWinners } = params;

  const captainLine = `Captain: ${listNames(captainWinners)}`;
  const viceCaptainLine = `Vice-Captain: ${listNames(viceCaptainWinners)}`;

  return {
    to,
    subject: `Results for "${electionTitle}"`,
    text: `Voting has closed for "${electionTitle}".\n\n${captainLine}\n${viceCaptainLine}\n\nThank you for voting.`,
    html: `<p>Voting has closed for <strong>${electionTitle}</strong>.</p><p>${captainLine}<br/>${viceCaptainLine}</p><p>Thank you for voting.</p>`,
  };
}
