/* ──────────────────────────────────────────────────────────────
   "Your October growth report is ready."

   SERVER ONLY.

   One email, sent once, when Mason publishes a month. It carries the
   Win line, a button to the client's Reports tab and the PDF as an
   attachment, because half the people who get it will read it on a
   phone and the attachment is the version that works offline on a
   plane.

   Sent once is the hard part. Publishing is a button, buttons get
   double-clicked, and two emails saying the same thing is the kind of
   small unprofessional thing a client remembers. The idempotency key
   lives in PORTAL_KV and is claimed BEFORE the send, not after: the
   second click finds the claim and does nothing. A send that fails
   releases the claim, so a real retry still works.
   ────────────────────────────────────────────────────────────── */

import { monthLabel } from '../data/print';
import { DEFAULT_FROM, type MailEnv } from './portal-login';

/** The slice of KV this file needs. Same shape the move-undo and
 *  sign-in code use. */
export interface MailStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ReportMailEnv extends MailEnv {
  PORTAL_KV?: MailStore;
}

/** A year. A month is published once; the claim exists so a double
 *  click cannot send twice, and so an accidental re-publish a week
 *  later does not email the client the same month again. */
const CLAIM_TTL_SECONDS = 365 * 24 * 60 * 60;

const claimKey = (snapshotId: string) => `report-mail:${snapshotId}`;

/* ── copy ─────────────────────────────────────────────────────── */

export function reportSubject(monthIso: string | null): string {
  const month = monthLabel(monthIso);
  return month
    ? `Your ${month} growth report is ready`
    : 'Your growth report is ready';
}

export interface ReportMail {
  subject: string;
  text: string;
  html: string;
}

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

/**
 * The email, both ways round.
 *
 * Short on purpose. The report is six pages; this is the one line that
 * makes somebody open it. No em dashes and no clause ending on a
 * contraction, same as the site.
 */
export function reportMail(opts: {
  artist: string;
  monthIso: string | null;
  win: string | null;
  portalUrl: string;
}): ReportMail {
  const month = monthLabel(opts.monthIso);
  const heading = month ? `Your ${month} report` : 'Your report';
  const win = opts.win?.trim() || null;
  const first = opts.artist.trim().split(/\s+/)[0] || 'there';

  const text = [
    `Hi ${first},`,
    '',
    `${heading} is ready. It is attached, and it is in your portal under Reports.`,
    ...(win ? ['', win] : []),
    '',
    'Reports tab:',
    opts.portalUrl,
    '',
    'Reply to this email if anything in it needs a second look.',
    '',
    'Mason',
    'Blueprint Marketing',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#eef4fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#232a3b">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#aa542c;font-weight:700">Blueprint Marketing</div>
  <h1 style="margin:10px 0 0;font-size:22px;line-height:1.25;color:#1d3d7d">${esc(heading)} is ready</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#4a5265">
    It is attached to this email, and it is in your portal under Reports.
  </p>
  ${win ? `<p style="margin:16px 0 0;padding:14px 16px;background:#eef4fa;border-radius:12px;font-size:15px;line-height:1.6;color:#232a3b"><b>The win:</b> ${esc(win)}</p>` : ''}
  <p style="margin:22px 0 0">
    <a href="${esc(opts.portalUrl)}" style="display:inline-block;background:#e3703b;color:#ffffff;font-weight:700;font-size:15px;padding:12px 22px;border-radius:99px;text-decoration:none">Open your Reports tab</a>
  </p>
  <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6c727f">
    Reply to this email if anything in it needs a second look.<br>Mason
  </p>
</div>
</body></html>`;

  return { subject: reportSubject(opts.monthIso), text, html };
}

/* ── attachment ───────────────────────────────────────────────── */

/**
 * Base64, in chunks.
 *
 * `btoa(String.fromCharCode(...bytes))` is the usual one-liner and it
 * throws on a 300KB PDF, because spreading 300,000 arguments overflows
 * the call stack. 8KB at a time does not.
 */
export function base64(bytes: Uint8Array): string {
  const CHUNK = 0x2000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

/* ── sending ──────────────────────────────────────────────────── */

export type SendResult = 'sent' | 'already' | 'no-recipients' | 'failed' | 'not-configured';

/**
 * Sends the report email, at most once per snapshot.
 *
 * Returns what happened rather than throwing, because none of these
 * outcomes should undo a publish: the PDF is in R2 and the row is
 * updated either way, and a client whose email bounced still has the
 * report in their portal.
 */
export async function sendReportMail(
  env: ReportMailEnv,
  opts: {
    snapshotId: string;
    to: string[];
    artist: string;
    monthIso: string | null;
    win: string | null;
    portalUrl: string;
    pdf: Uint8Array;
    filename: string;
  },
): Promise<SendResult> {
  const to = opts.to.filter(Boolean);
  if (!to.length) return 'no-recipients';
  if (!env.RESEND_API_KEY) {
    console.error('report: RESEND_API_KEY is not set, no email was sent');
    return 'not-configured';
  }

  const store = env.PORTAL_KV;
  const key = claimKey(opts.snapshotId);
  if (store) {
    if (await store.get(key)) return 'already';
    // Claimed first. Two clicks a second apart cannot both get past
    // this, and the loser does nothing rather than sending a second
    // copy.
    await store.put(key, new Date().toISOString(), { expirationTtl: CLAIM_TTL_SECONDS });
  } else {
    console.warn('report: PORTAL_KV is not bound, a double publish can send twice');
  }

  const mail = reportMail(opts);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.PORTAL_MAIL_FROM || DEFAULT_FROM,
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        attachments: [{ filename: opts.filename, content: base64(opts.pdf) }],
      }),
    });
    if (!res.ok) {
      console.error('report: sending the report failed', res.status, await res.text());
      if (store) await store.delete(key);
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.error('report: sending the report threw', err);
    if (store) await store.delete(key);
    return 'failed';
  }
}
