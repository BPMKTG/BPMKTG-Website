/* ──────────────────────────────────────────────────────────────
   POST /api/intake — writes a client intake submission to Notion.

   A Cloudflare Pages Function, because the site is `output: 'static'`
   with no Astro adapter: there is no server to host an API route, but
   Pages runs anything under /functions automatically.

   Secrets (Pages > Settings > Environment variables, encrypted):
     NOTION_TOKEN     required
     WEB3FORMS_KEY    optional; enables a notification email
   Locally these come from .dev.vars, which is gitignored.

   The field definitions are imported rather than restated: the Notion
   property names and the allowed select options have to agree with the
   form exactly, and two copies would eventually disagree.
   ────────────────────────────────────────────────────────────── */

import {
  intakeFields,
  requiredProps,
  fieldByProp,
  URL_FALLBACK_PROP,
  type IntakeField,
} from '../../src/data/intake';

const NOTION_VERSION = '2022-06-28';
const INTAKE_DB = 'e992eaab-da11-4c65-bcda-b6a40a1db965';
const CLIENTS_DB = 'b495a24f-96c3-4108-8d78-106fd6228e14';

/** Notion rejects any single text object over 2000 characters. */
const CHUNK = 2000;
/** Generous for free text, small enough to refuse an abusive body. */
const MAX_BODY = 200_000;

interface Env {
  NOTION_TOKEN: string;
  WEB3FORMS_KEY?: string;
}

type Json = Record<string, unknown>;

const json = (status: number, body: Json) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const notionHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
});

/* ── value shaping ─────────────────────────────────────────────── */

/** Notion caps a text object at 2000 chars, so long answers are split
 *  across several objects rather than being truncated or rejected. */
export function textObjects(value: string) {
  const out: Json[] = [];
  for (let i = 0; i < value.length; i += CHUNK) {
    out.push({ type: 'text', text: { content: value.slice(i, i + CHUNK) } });
  }
  return out.length ? out : [{ type: 'text', text: { content: '' } }];
}

/** Returns a usable absolute URL, or null when it cannot be salvaged. */
export function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(candidate);
    // A bare word like "soundcloud" parses as https://soundcloud with no
    // dot; that is a typo, not a link, so it goes to the fallback.
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x));
  if (v === undefined || v === null) return [];
  const s = String(v);
  return s ? [s] : [];
}

/* ── property building ─────────────────────────────────────────── */

export function buildProperties(fields: Record<string, unknown>) {
  const properties: Json = {};
  // URLs that would not parse are appended here rather than dropped,
  // so a mistyped link still reaches a human.
  const salvaged: string[] = [];

  for (const def of intakeFields as IntakeField[]) {
    const raw = fields[def.prop];

    if (def.notion === 'multi_select') {
      const allowed = new Set(def.options ?? []);
      const picked = asArray(raw).filter(v => allowed.has(v));
      if (picked.length) properties[def.prop] = { multi_select: picked.map(name => ({ name })) };
      continue;
    }

    const value = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();
    if (!value) continue;

    switch (def.notion) {
      case 'title':
        properties[def.prop] = { title: textObjects(value) };
        break;
      case 'rich_text':
        properties[def.prop] = { rich_text: textObjects(value) };
        break;
      case 'email':
        properties[def.prop] = { email: value };
        break;
      case 'phone_number':
        properties[def.prop] = { phone_number: value };
        break;
      case 'url': {
        const url = normaliseUrl(value);
        if (url) properties[def.prop] = { url };
        else salvaged.push(`${def.prop}: ${value}`);
        break;
      }
      case 'select': {
        // Only a known option; an unknown one would make Notion create
        // a new select option from whatever was posted.
        if ((def.options ?? []).includes(value)) properties[def.prop] = { select: { name: value } };
        break;
      }
    }
  }

  if (salvaged.length) {
    const existing = typeof fields[URL_FALLBACK_PROP] === 'string'
      ? String(fields[URL_FALLBACK_PROP]).trim()
      : '';
    const merged = [existing, ...salvaged].filter(Boolean).join('\n');
    properties[URL_FALLBACK_PROP] = { rich_text: textObjects(merged) };
  }

  return properties;
}

/* ── client lookup ─────────────────────────────────────────────── */

/** Page id of the single Client whose Intake Slug matches, else null.
 *  Never throws: an unmatched or failed lookup must not cost us the
 *  submission, it just arrives unlinked. */
async function findClientPage(token: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${CLIENTS_DB}/query`, {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify({
        page_size: 2,
        filter: { property: 'Intake Slug', rich_text: { equals: slug } },
      }),
    });
    if (!res.ok) {
      console.error('intake: client lookup failed', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { results?: Array<{ id: string }> };
    const results = data.results ?? [];
    // Exactly one, deliberately: two clients sharing a slug is a data
    // problem, and guessing between them would be worse than not linking.
    return results.length === 1 ? results[0].id : null;
  } catch (err) {
    console.error('intake: client lookup threw', err);
    return null;
  }
}

/* ── optional notification ─────────────────────────────────────── */

async function notify(key: string, artist: string, slug: string) {
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: key,
        subject: `New intake from ${artist}`,
        from_name: 'Blueprint intake',
        Artist: artist,
        Client: slug || '(no slug)',
        Message: `New client intake submitted by ${artist}.`,
      }),
    });
  } catch (err) {
    // Never allowed to fail the submission: the row is already in Notion.
    console.error('intake: notification failed', err);
  }
}

/* ── handler ───────────────────────────────────────────────────── */

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.NOTION_TOKEN) {
    console.error('intake: NOTION_TOKEN is not set');
    return json(500, { ok: false, message: 'The form is not configured yet.' });
  }

  let body: { client?: string; honeypot?: string; fields?: Record<string, unknown> };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json(400, { ok: false, message: 'That submission is too large.' });
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, message: 'That submission could not be read.' });
  }

  // Honeypot: pretend it worked. Telling a bot why it failed only helps
  // it try again.
  if (typeof body.honeypot === 'string' && body.honeypot.trim() !== '') {
    return json(200, { ok: true });
  }

  const fields = body.fields && typeof body.fields === 'object' ? body.fields : {};

  const missing = requiredProps.filter(p => {
    const v = fields[p];
    return typeof v !== 'string' || v.trim() === '';
  });
  if (missing.length) {
    const labels = missing.map(p => fieldByProp(p)?.label ?? p);
    return json(400, { ok: false, message: `Still needed: ${labels.join(', ')}.` });
  }

  const email = String(fields['Email'] ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, message: 'That email address does not look right.' });
  }

  const properties = buildProperties(fields);

  const slug = typeof body.client === 'string' ? body.client.trim().toLowerCase().slice(0, 100) : '';
  if (slug) {
    const clientPage = await findClientPage(env.NOTION_TOKEN, slug);
    if (clientPage) properties['Client'] = { relation: [{ id: clientPage }] };
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(env.NOTION_TOKEN),
      body: JSON.stringify({ parent: { database_id: INTAKE_DB }, properties }),
    });

    if (!res.ok) {
      // The Notion error body names the offending property, which is the
      // only useful thing when a name drifts. Server-side only: it can
      // echo submitted values.
      console.error('intake: notion create failed', res.status, await res.text());
      return json(500, { ok: false, message: 'We could not save that. Please try again.' });
    }
  } catch (err) {
    console.error('intake: notion create threw', err);
    return json(500, { ok: false, message: 'We could not save that. Please try again.' });
  }

  if (env.WEB3FORMS_KEY) {
    await notify(env.WEB3FORMS_KEY, String(fields['Artist Name'] ?? 'an artist'), slug);
  }

  return json(200, { ok: true });
};

/** Anything other than POST. Keeps the endpoint from looking broken. */
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return json(405, { ok: false, message: 'POST only.' });
};
