# Session Log

A running record of decisions, pivots, and known TODOs from each working session on the Blueprint Marketing site. Read this before starting new work — it's the fastest way to load context without re-reading every commit.

---

## Session 1 — 2026-05-15 — Initial scaffold + brand pivot

### What got built

**Phase 1 — Scaffold (commit `f24d60f`)**
- Stood up Astro 4 site, static output, deployed via Cloudflare Pages
- Created GitHub repo `BPMKTG/BPMKTG-Website` (public)
- Base layout, header, footer, and 4-page nav (home, about, services, contact)

**Phase 2 — First brand pass: lime/dark "Blueprint Marketing" placeholder (commit `0ee63ef`)**
- Treated BPMKTG as generic "Blueprint Marketing" agency for local businesses
- Light cream bg + black cards + lime-green accent
- Modeled after MPT Agency hero layout
- *Discarded in Phase 4 — wrong brand, wrong audience, wrong aesthetic.*

**Phase 3 — Real brand assets applied (commit `0cdb23a`)**
- User shared `quickguide.pdf` from `Blueprint Marketing/Branding/Logo/DIGITAL/PDF/`
- Pulled actual SVG logos into `/public/brand/`
- Switched palette to brand blues (`#264fa0`, `#62a6db`, `#b3e0f6`) + orange (`#e3703b`)
- Switched typography to Roboto
- Built MPT-style sections: arch row, focus block, services grid, power banner, process steps, powerhouse quote, press section, get-seen CTA
- Light background ("blueprint paper" aesthetic)
- *Mostly discarded in Phase 4 — wrong audience (local biz), wrong aesthetic (light vs dark).*

**Phase 4 — Full repositioning to EDM artist growth-systems (commit `b10917f`) — CURRENT STATE**
- User pasted [`CONTENT_BRIEF.md`](./CONTENT_BRIEF.md) — the real positioning
- Pivoted target audience: local businesses → touring EDM artists
- Pivoted aesthetic: light blueprint-paper → dark cinematic (`#0a0a0f` base, blue glows, orange hot-accent)
- Pivoted typography: Roboto + Orbitron (Oughter is brand display but no web license — Orbitron is the EDM-leaning fallback approved in the brief)
- Replaced all sections with the 9-section structure from the brief
- Deleted standalone `services` / `offers` / `work` / `contact` pages — now homepage anchors
- Kept `about.astro` and `blog.astro` as standalone routes (linked from footer + nav)

### Current site structure

```
src/
├── layouts/Layout.astro        — html shell, font loader, theme-color meta
├── components/
│   ├── Header.astro            — sticky pill nav, white logo, Book a Call CTA
│   ├── Hero.astro              — radial glow, headline + stats row
│   ├── ProblemSection.astro    — 7 pain quotes from brief §3
│   ├── SolutionUSP.astro       — anti-agency positioning + 4 pillars
│   ├── Roadmap.astro           — 5-step process from brief §8
│   ├── OfferStack.astro        — 4 pricing tiers from brief §9 (Tier 3 featured)
│   ├── WhyBlueprint.astro      — 5 differentiators from brief §12
│   ├── MarketStats.astro       — 6 stats from brief §13
│   ├── Guarantee.astro         — 30-day guarantee + 3 supporting from brief §10
│   ├── BookCall.astro          — final CTA (Calendly link, email fallback)
│   └── Footer.astro            — 4-column dark footer w/ socials placeholder
└── pages/
    ├── index.astro             — composes all 9 homepage sections
    ├── about.astro             — standalone about page
    └── blog.astro              — standalone blog (with email signup)
```

### Decisions worth remembering

- **Always push to `main`.** No PR/branch flow on this repo (saved to `~/.claude/.../memory/feedback_git_workflow.md`).
- **Brief overrides everything.** When copy on the site disagrees with [`CONTENT_BRIEF.md`](./CONTENT_BRIEF.md), the brief wins.
- **Orange is sparing.** Used only on Tier 3 ribbon, primary CTAs, "30 days" callout, step-outcome arrows. Don't use it as a background or large fill.
- **Logos:** white logo (`/brand/logo-white.svg`) on dark sections (default), full color (`/brand/logo-full.svg`) only on light surfaces. Currently no light surfaces — full-color is unused.
- **No real photography yet.** Hero, problem cards, etc. use CSS gradients + grid overlays as visual interest. Swap to real artist/event photography when available.

### Known placeholders to fix before launch

| Where | What | Action |
|-------|------|--------|
| `BookCall.astro` Calendly URL | `calendly.com/blueprintmarketing` (placeholder) | Replace with real link |
| `BookCall.astro` + Footer email | `hello@blueprintmkt.com` | Confirm or replace |
| `Footer.astro` social links | All `#` | Add real Instagram / TikTok / YouTube / X handles |
| `Layout.astro` font loader | Orbitron (Oughter fallback) | If Oughter web license obtained, drop woff2 in `/public/fonts/` and update `--font-display` in `global.css` |
| Site favicon | `/brand/icon-white.svg` (white on transparent) | Confirm renders OK across light/dark browser themes |
| `astro.config.mjs` `site` URL | `https://bpmktg.com` | Confirm final domain or update |

### Punted features (not implemented, may want later)

1. **Scroll-triggered animations / glow pulses.** Brief §15 calls for them. ~30 LOC with intersection-observer. Skipped to keep the diff focused.
2. **Inline Calendly embed.** Currently links out. Inline iframe converts better but adds weight.
3. **Real `/work` case-study page** when first client win is shareable.
4. **Cloudflare Pages `_redirects`** for any vanity URLs.
5. **Long-form `/services` deep-dive page** if needed — currently just the homepage offers section.
6. **Press / social proof section** — removed in Phase 4 because there's no real press to feature yet. Re-add when there is.

### Cloudflare Pages deploy settings

- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output:** `dist`
- **Node version env var:** `NODE_VERSION = 20`
- Auto-deploys on push to `main`

---

*Add a new section above this line each session. Keep entries short and decision-focused — this is a context primer, not a changelog (use `git log` for that).*
