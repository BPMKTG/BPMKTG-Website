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

export const CALENDLY_URL = 'https://calendly.com/bpmktg/strategy-meeting';

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
  bundle:                    '',
};

/** Checkout URL for a product slug, or '' when it isn't wired yet. */
export function checkoutUrl(slug: string): string {
  return PRODUCT_CHECKOUT[slug] ?? '';
}
