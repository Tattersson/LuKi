import type { MailMessage } from "@/lib/mailer";

export function renderOtpEmail(params: {
  to: string;
  code: string;
  electionTitle: string;
  ttlMinutes: number;
}): MailMessage {
  const { to, code, electionTitle, ttlMinutes } = params;
  return {
    to,
    subject: `Your verification code for "${electionTitle}"`,
    text: `Your verification code is ${code}. It expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your verification code is <strong style="font-size: 1.25em; letter-spacing: 0.1em;">${code}</strong>.</p><p>It expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.</p>`,
  };
}
