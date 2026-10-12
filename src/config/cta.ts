// ─────────────────────────────────────────────────────────────
// Single source of truth for the "book a call" CTA destination.
//
// Every CTA across the site that opens the scheduling page imports
// CALENDLY_URL from here. When the real URL is provided, update this
// one constant and every CTA on every page picks it up.
//
// Update this constant to change the destination everywhere, e.g.
//   "https://calendly.com/blueprint/strategy-call"
// ─────────────────────────────────────────────────────────────

// Google Calendar appointment booking, replacing the old Calendly link.
// The constant name is kept so every CTA across the site keeps importing
// the same thing; it means "the booking destination", not "Calendly".
export const CALENDLY_URL = 'https://calendar.app.google/jdhwJZQBRRQQ8DxQA';

// ─────────────────────────────────────────────────────────────
// Footer / contact constants — single source of truth.
// Replace each `[…-URL]` / `[NEW-EMAIL]` placeholder with the real
// destination and every footer + relevant CTA picks it up.
// ─────────────────────────────────────────────────────────────
export const INSTAGRAM_URL = '[INSTAGRAM-URL]';
export const TIKTOK_URL    = '[TIKTOK-URL]';
export const YOUTUBE_URL   = '[YOUTUBE-URL]';
export const X_URL         = '[X-URL]';
export const CONTACT_EMAIL = 'info@bpmktg.com';

// HTML-attribute helpers — every booking CTA should also open in a
// new tab with safe relationship attributes. Use these together:
//
//   <a href={CALENDLY_URL} {...CALENDLY_LINK_ATTRS}>Book a call</a>
//
// Or in tier data files where the href is just a string field,
// use CALENDLY_URL alone and let the rendering component apply the
// extra attrs from CALENDLY_LINK_ATTRS where appropriate.
export const CALENDLY_LINK_ATTRS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

// ─────────────────────────────────────────────────────────────
// Digital product checkout links.
//
// The site is static (no server), so checkout is always a hosted
// external page: a Stripe Payment Link, a Gumroad / Lemon Squeezy
// product URL, whatever gets picked. Every buy button on /products
// and /products/<slug> reads its URL from here by slug, so wiring
// the real store later is a change to this one map.
//
// An empty string means "not wired yet". Buy buttons render a
// non-clickable "checkout opening soon" state instead of a dead
// link when that's the case, so an unfinished store can't ship a
// broken button the way the footer socials did.
// ─────────────────────────────────────────────────────────────
export const PRODUCT_CHECKOUT: Record<string, string> = {
  'show-media-brief-kit':    '',
  'release-rollout-calendar': '',
  'content-vault':           '',
  'artist-outreach-os':      '',
  bundle:                    '',
};

// Where "Apply to Blueprint Preferred™" points. The creator-track
// products are a recruiting funnel for the network, so this is their
// closing CTA rather than a strategy call.
export const BLUEPRINT_PREFERRED_URL = '/blueprint-preferred';

// ─────────────────────────────────────────────────────────────
// Blueprint Preferred™ application form
//
// The site is static, so the form posts to Web3Forms rather than to
// us. Two destinations, deliberately unequal:
//
//   1. Web3Forms  — the source of truth. Returns a real response, so
//      it decides whether the applicant sees success or an error, and
//      it sends the notification email.
//   2. Sheet webhook — best effort. A Google Apps Script that appends
//      a row. Fired no-cors, so we cannot read the result; if it fails
//      the application is still in the inbox. Nothing is lost by the
//      spreadsheet half breaking.
//
// The Web3Forms access key is PUBLIC by design: it identifies the
// destination inbox, it is not a secret, and it ships in the markup.
// Get one by entering an address at web3forms.com.
//
// Until the key is set, the page renders an honest "applications open
// soon" state rather than a form that silently fails.
// ─────────────────────────────────────────────────────────────
export const WEB3FORMS_ACCESS_KEY = '5703bc35-9ab0-4d9f-bccc-a2ccaf18e336';

/** Apps Script web-app URL. Empty disables the sheet write entirely.
 *
 *  Deployed with clasp from the project in docs/PREFERRED_FORM_SETUP.md,
 *  bound to the "Blueprint Preferred Applications" sheet in the bpmktg
 *  account. Redeploying with a NEW deployment changes this URL; use
 *  `clasp redeploy <deploymentId>` to keep it stable instead. */
export const APPLICATION_SHEET_WEBHOOK =
  'https://script.google.com/macros/s/AKfycbx8SY1hdjEF_6NG93HgJjNwCtA_-AAYYa0Ul9lw_A6uxuKkYqDxFAmcXbMssVUw7nUq4A/exec';

/** Checkout URL for a product slug, or '' when it isn't wired yet. */
export function checkoutUrl(slug: string): string {
  return PRODUCT_CHECKOUT[slug] ?? '';
}
