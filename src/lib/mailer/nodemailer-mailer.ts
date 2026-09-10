import nodemailer from "nodemailer";
import type { Mailer, MailMessage } from "./mailer";

export function createNodemailerMailer(): Mailer {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return {
    async send(message: MailMessage) {
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}
