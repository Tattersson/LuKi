import type { Mailer, MailMessage } from "./mailer";

/** Dev-only mailer: logs instead of sending, so OTPs are readable from container/terminal logs. */
export function createConsoleMailer(): Mailer {
  return {
    async send(message: MailMessage) {
      console.log(
        `[console-mailer] to=${message.to} subject=${message.subject}\n${message.text}`,
      );
    },
  };
}
