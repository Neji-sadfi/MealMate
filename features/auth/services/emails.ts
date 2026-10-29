import { appUrl, sendMail } from "@/lib/mail";

type Recipient = { name: string; email: string };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(title: string, body: string, buttonLabel: string, link: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2a24">
  <h2 style="color:#245c43">${title}</h2>
  ${body}
  <p style="margin:28px 0"><a href="${link}" style="background:#245c43;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${buttonLabel}</a></p>
  <p style="font-size:12px;color:#6b7a72">If the button does not work, copy this link:<br>${link}</p>
</div>`;
}

export async function sendPasswordResetEmail(user: Recipient, token: string): Promise<void> {
  const link = appUrl(`/reset-password?token=${token}`);
  const name = escapeHtml(user.name);
  await sendMail({
    to: user.email,
    subject: "Reset your MealMate password",
    text: `Hi ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, ignore this email.`,
    html: layout(
      "Reset your password",
      `<p>Hi ${name},</p><p>Use the button below to choose a new password. The link is valid for 1 hour.</p><p>If you did not ask for this, you can ignore this email.</p>`,
      "Choose a new password",
      link,
    ),
  });
}

export async function sendVerificationEmail(user: Recipient, token: string): Promise<void> {
  const link = appUrl(`/verify-email?token=${token}`);
  const name = escapeHtml(user.name);
  await sendMail({
    to: user.email,
    subject: "Confirm your MealMate email",
    text: `Hi ${user.name},\n\nWelcome to MealMate! Confirm your email address with this link (valid for 24 hours):\n${link}`,
    html: layout(
      "Confirm your email",
      `<p>Hi ${name},</p><p>Welcome to MealMate! Confirm your email address so we know it is really you. The link is valid for 24 hours.</p>`,
      "Confirm my email",
      link,
    ),
  });
}
