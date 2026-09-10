import type { Mailer } from "./mailer";
import { createNodemailerMailer } from "./nodemailer-mailer";
import { createConsoleMailer } from "./console-mailer";

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (!mailer) {
    mailer =
      process.env.MAILER_DRIVER === "console"
        ? createConsoleMailer()
        : createNodemailerMailer();
  }
  return mailer;
}

export type { Mailer, MailMessage } from "./mailer";
