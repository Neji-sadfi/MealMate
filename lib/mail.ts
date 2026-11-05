import nodemailer, { type Transporter } from "nodemailer";

// Server-only. Sends emails through SMTP when SMTP_HOST, SMTP_USER and SMTP_PASSWORD are
// set (e.g. Gmail with an app password). Without them (local dev), the email is printed in the
// terminal instead, so the reset and verification links can still be tested.

export type MailMessage = { to: string; subject: string; text: string; html: string };

const globalForMail = globalThis as typeof globalThis & { mailTransport?: Transporter };

function transport(): Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  globalForMail.mailTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  return globalForMail.mailTransport;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const smtp = transport();
  if (!smtp) {
    console.info(
      `\n--- Email (SMTP not configured, printed instead) ---\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n---------------------------------------------------\n`,
    );
    return;
  }
  await smtp.sendMail({
    from: process.env.MAIL_FROM ?? `MealMate <${process.env.SMTP_USER}>`,
    ...message,
  });
}

/** Absolute URL for links in emails, based on AUTH_URL. */
export function appUrl(path: string): string {
  return new URL(path, process.env.AUTH_URL ?? "http://localhost:3000").toString();
}
