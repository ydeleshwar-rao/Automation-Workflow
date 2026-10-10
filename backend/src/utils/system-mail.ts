import nodemailer from "nodemailer";

/**
 * App-level mail (password resets etc.), sent through the SMTP server in
 * SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM.
 * Not to be confused with users' own smtp_connections used by workflows.
 *
 * Returns false when SMTP is not configured so callers can fall back
 * (e.g. log the reset link in development).
 */
export async function sendSystemMail(to: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return true;
}
