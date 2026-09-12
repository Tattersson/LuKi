import type { MailMessage } from "@/lib/mailer";

/** Generic one-time-code email, parameterized so each feature can supply its own
 *  subject/context copy (e.g. an election title vs. player registration). */
export function renderOtpEmail(params: {
  to: string;
  code: string;
  subject: string;
  contextLine: string;
  ttlMinutes: number;
}): MailMessage {
  const { to, code, subject, contextLine, ttlMinutes } = params;
  return {
    to,
    subject,
    text: `${contextLine} Your verification code is ${code}. It expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>${contextLine}</p><p>Your verification code is <strong style="font-size: 1.25em; letter-spacing: 0.1em;">${code}</strong>.</p><p>It expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.</p>`,
  };
}
