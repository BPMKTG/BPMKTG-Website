/* ──────────────────────────────────────────────────────────────
   Report and audit PDFs: the HTML shell and the pieces every page
   shares.

   SERVER ONLY.

   Everything that reaches a page goes through `esc`. These documents
   are built from Notion text that Mason types and, on a prospect
   audit, from a name that came off a form, so a page title containing
   a stray `<` must not be able to close a div, let alone open a
   script. There is no innerHTML and no inline event handler anywhere
   in these templates; the one script is six lines long and is quoted
   in full below.
   ────────────────────────────────────────────────────────────── */

import { PRINT_CSS, T } from './print-css';
import type { Delta } from '../data/print';

/* ── escaping ─────────────────────────────────────────────────── */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Text, safe to drop between tags or inside an attribute. */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * A URL safe to put in href or src.
 *
 * Only http(s). A `javascript:` URL typed into a Notion url field
 * would otherwise become a live link in a document we email to a
 * client, and a `data:` one a way to smuggle a page inside a page.
 */
export function safeUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  return esc(raw);
}

/** Drops the falsy parts and joins the rest. Saves a filter at
 *  every call site that builds a list of optional blocks. */
export function join(parts: Array<string | null | undefined | false>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join('');
}

/** `cls('card', wide && 'card--wide')` */
export function cls(...names: Array<string | null | undefined | false>): string {
  return names.filter(Boolean).join(' ');
}

/* ── the delta arrow ──────────────────────────────────────────────
   Drawn, not typed. "▲" is U+25B2, which is not in the latin subset
   of either of our fonts, so a glyph would fall through to whatever
   the renderer happens to have. On a headless container that is a
   coin toss between a triangle and a tofu box.
   ─────────────────────────────────────────────────────────────── */

function triangle(up: boolean, colour: string): string {
  const points = up ? '4,0 8,8 0,8' : '0,0 8,0 4,8';
  return `<svg class="arrow" viewBox="0 0 8 8" aria-hidden="true">`
    + `<polygon points="${points}" fill="${colour}"></polygon></svg>`;
}

/** "▲ 17%" as a coloured span, or nothing at all. */
export function deltaHtml(d: Delta, suffix: string | null = null): string {
  if (!d.text) return '';
  const tail = suffix ? ` ${esc(suffix)}` : '';
  if (d.dir === 'flat') return `<span class="flat">${esc(d.text)}${tail}</span>`;
  const up = d.dir === 'up';
  const klass = up ? 'up' : 'down';
  const colour = up ? T.up : T.down;
  return `<span class="${klass}">${triangle(up, colour)}${esc(d.text)}${tail}</span>`;
}

/* ── page furniture ───────────────────────────────────────────── */

export interface PageCtx {
  /** "Monthly Report" or "Growth Audit". Goes in the footer. */
  doc: string;
  /** The line at the top right: "Sean Comma · November 2026". */
  who: string;
  /** Draw the SAMPLE DATA flag. Set when the row is not published. */
  sample: boolean;
}

const LOGO = '/brand/logo-header-navy.svg';

export function header(ctx: PageCtx): string {
  return `<div class="hd">`
    + `<img class="hd__logo" src="${LOGO}" alt="Blueprint Marketing">`
    + `<div class="hd__right">`
    + (ctx.sample ? `<div class="flag">DRAFT</div>` : '')
    + `<div class="hd__who">${esc(ctx.who)}</div>`
    + `</div></div>`;
}

export function footer(ctx: PageCtx, n: number, of: number): string {
  const num = `${String(n).padStart(2, '0')} / ${String(of).padStart(2, '0')}`;
  return `<div class="ft"><span>Blueprint Marketing · ${esc(ctx.doc)}</span>`
    + `<span>${esc(num)}</span></div>`;
}

/**
 * One interior page: header, body, footer.
 *
 * `of` is threaded through rather than counted at the end, because a
 * footer reading "02 / 06" has to agree with how many pages were
 * actually built, and a report whose Shows page is empty has five.
 */
export function bodyPage(ctx: PageCtx, n: number, of: number, inner: string): string {
  return `<div class="pg pg--body">${header(ctx)}${inner}${footer(ctx, n, of)}</div>`;
}

/* ── the shell ────────────────────────────────────────────────── */

/**
 * The marker Browser Rendering waits for.
 *
 * `networkidle` is not enough on its own: a font that has downloaded
 * has not necessarily been applied, and capturing between those two
 * moments gives a PDF set in Times. This resolves after the fonts are
 * in use and every image has decoded or failed, and the generator
 * waits for the attribute rather than for a timeout.
 */
const READY_SCRIPT = `
(function(){
  var done=function(){document.documentElement.setAttribute('data-print-ready','1')};
  var imgs=Array.prototype.slice.call(document.images);
  var waits=imgs.map(function(i){return i.decode?i.decode().catch(function(){}):Promise.resolve()});
  waits.push(document.fonts?document.fonts.ready:Promise.resolve());
  Promise.all(waits).then(done,done);
  setTimeout(done,8000);
})();
`;

export function shell(title: string, pages: string[]): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=816">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<link rel="preload" href="/fonts/orbitron-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/roboto-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<style>${PRINT_CSS}</style>
</head>
<body>
${pages.join('\n')}
<script>${READY_SCRIPT}</script>
</body>
</html>`;
}

/* ── small repeated blocks ────────────────────────────────────── */

/** The eyebrow plus heading pair at the top of most sections. */
export function sectionHead(num: string, title: string | null, h = 'h2'): string {
  return `<div class="stack g8"><div class="eyebrow">${esc(num)}</div>`
    + (title ? `<${h} class="${h === 'h1' ? 'h1' : 'h2'}">${esc(title)}</${h}>` : '')
    + `</div>`;
}

/** A progress bar. `fraction` is clamped, so a goal already passed
 *  shows a full bar rather than one that runs off its track. */
export function bar(fraction: number, accent: 'navy' | 'orange' = 'navy'): string {
  const w = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  const k = accent === 'orange' ? 'fill fill--orange' : 'fill';
  return `<div class="track"><div class="${k}" style="width:${w}%"></div></div>`;
}

/** A tinted status pill. */
export function pill(label: string, tone: string): string {
  return `<span class="pill pill--${esc(tone)}">${esc(label)}</span>`;
}
