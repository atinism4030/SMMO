/**
 * Thin, provider-agnostic email sending. No email provider was wired into
 * this project before this module, so real delivery only activates once SMTP
 * credentials are set in .env.local:
 *
 *   SMTP_HOST=smtp.your-provider.com
 *   SMTP_PORT=587
 *   SMTP_USER=...
 *   SMTP_PASS=...
 *   SMTP_FROM="Horizonte Digital Group <no-reply@yourdomain.com>"
 *
 * Works with any standard SMTP provider (Resend, SendGrid, Gmail app
 * passwords, etc.) via nodemailer — no vendor lock-in. Without those env
 * vars, sendEmail() logs what it would have sent and returns { sent: false }
 * rather than crashing or pretending to have delivered something it didn't;
 * every call site treats that as "notification recorded, email pending
 * configuration," never as an error.
 */
import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransport: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransport = null;
    return cachedTransport;
  }

  const port = Number(SMTP_PORT) || 587;
  cachedTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cachedTransport;
}

export interface SendEmailResult {
  sent: boolean;
  reason?: string;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<SendEmailResult> {
  if (!to) return { sent: false, reason: 'No recipient email address' };

  const transport = getTransport();
  if (!transport) {
    console.log(`[email:not-configured] Would send to ${to} — "${subject}"\n${text}`);
    return { sent: false, reason: 'SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in .env.local)' };
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: html ?? `<p>${text.replace(/\n/g, '<br/>')}</p>`,
    });
    return { sent: true };
  } catch (err) {
    console.error('[email:send-failed]', err);
    return { sent: false, reason: err instanceof Error ? err.message : 'Unknown email error' };
  }
}
