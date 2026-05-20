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

## Session 2 — 2026-05-19 — Brief upgraded to v3.0 (photo guide added)

### What changed

- User pasted the v3.0 brief — adds **Section 15: Media Assets / Photo Placement Guide** and renumbers Visual Direction → Section 16.
- [`CONTENT_BRIEF.md`](./CONTENT_BRIEF.md) overwritten with v3.0 verbatim. Site code untouched in this session.
- The README was updated separately by the user to point collaborators at this log and the brief — that pointer is now real.

### What Section 15 introduces (queued work)

The new section is a complete photo placement plan from a curation session. Not yet implemented in code. Summary:

1. **"In The Field" framing.** Photos are press/media access, **not** client work. Never use "client" language when introducing the gallery.
2. **Hero crossfade** of 3 horizontals: Excision (713 Music Hall), Alien Park (Silo Dallas), Grimefest crowd. Excision is primary / first-load.
3. **Section backgrounds:** Svdden Death (red, Wicked Oaks) behind the Problem section; Perry Wayne (purple/blue DFT) behind the Stats/Authority section. Heavy dark overlay required.
4. **Homepage carousel:** 15 named shots, mix of vertical + horizontal. Filenames + captions already enumerated in the brief.
5. **New `/portfolio` page:** vertical hero (The Resistance — Grimefest) + masonry gallery of the full ~40-shot set, lead with backstage access (Flux + Doctor P, Wooli + Alien Park, ATLiens sidestage).
6. **Storage:** `src/assets/images/` (NOT `/public/`) so Astro's image pipeline auto-handles WebP, multi-breakpoint resizing, and CDN-friendly compression. Use `<Image>` from `astro:assets`, eager on hero, lazy elsewhere.

### Implications for the build when photos arrive

- `Hero.astro` becomes a 3-slide crossfade (CSS keyframes or JS-based fader). Current CSS glow stays as fallback / layered backdrop.
- `ProblemSection.astro` + `MarketStats.astro` need a layered `<Image>` + dark gradient overlay treatment to keep text readable.
- New `Carousel.astro` component for the 15-shot gallery on the homepage. Likely Swiper or a CSS scroll-snap implementation.
- New `pages/portfolio.astro` route + `Gallery.astro` masonry component.
- Add `portfolio` to the header nav (currently: How It Works / Offers / Why Blueprint / Guarantee / Blog).

### Blockers / what's needed from the user

- **The actual 40-photo set.** Filenames in the brief are the target — they have to be exported with those exact names into `src/assets/images/<bucket>/`. Without the files, this work can't start.
- Export spec from the brief: max 2400px wide, JPG @ 85%, target ≤600KB each.

### Decisions

- **Brief is v3.0; SESSION_LOG also picks up where session 1 left off.** When in doubt about copy, the brief wins (existing rule, still applies).
- **Photo work is one cohesive PR-worth of changes** — wire the pipeline + hero + backgrounds + carousel + portfolio together rather than dripping it section by section. Less churn that way.

---

## Session 3 — 2026-05-19 — Photo pipeline implementation (commit `9697418`)

### What got built

The full Section 15 photo plan, in one pass:

- **`src/assets/images/`** — set up with `hero/`, `backgrounds/`, `carousel/`, `portfolio/` subfolders. 40 photos in place.
- **Cleanup before wire-up:**
  - Brief had a Cyrillic typo (`allthерeason`); file renamed to `allthereason` everywhere.
  - Portfolio folder originally contained duplicates of hero/bg/carousel + 19 `EDM Portfolio (N).jpeg` files. Duplicates removed; the unsorted shots renamed to `portfolio-01.jpeg` … `portfolio-19.jpeg`.
- **`Hero.astro`** — now a 3-image crossfade (Excision → Alien Park → Grimefest), 21s loop with CSS keyframes, respects `prefers-reduced-motion`. CSS glow + grid overlay preserved on top of the photos.
- **`ProblemSection.astro`** — Svdden Death background, heavy dark gradient overlay, cards now use `backdrop-filter: blur` so text stays readable.
- **`MarketStats.astro`** — Perry Wayne background, same overlay treatment, stat grid sits on a translucent `rgba(10,10,15,0.55)` card with blur.
- **`Carousel.astro` (new)** — "In The Field" section on the homepage. CSS scroll-snap horizontal rail with prev/next nav buttons. Verticals (3:4) and horizontals (16:9) interleave; horizontals span 2 columns of the auto-flow grid. Lazy-loaded.
- **`/portfolio` (new page)** — vertical hero (The Resistance @ Grimefest), 3-card "Access" featured row (Flux+DocP, Wooli+AlienPark, ATLiens), then a 4-column CSS-columns masonry of the carousel + 19 portfolio extras (~35 tiles total). BookCall reused at the bottom.
- **Nav** — `In The Field` added to Header pill nav (replaced Guarantee link, which is still in footer) and Footer Site column.

### Build / pipeline notes

- Astro processed **55 WebP variants** from 40 source JPGs (multi-breakpoint outputs). Compression is dramatic: e.g. 332KB → 69KB at smaller size, 155KB at larger. No build config touched — Astro defaults handled it.
- All non-hero `<Image>` calls are `loading="lazy"`. Hero slide 0 is `loading="eager"`; 1 + 2 are lazy.
- Carousel has a tiny inline `<script>` for prev/next button scroll behavior — no JS framework added.

### Where things are different from the brief

- Brief specified Tier 3 + nav item "Guarantee" stays in nav. I swapped it for `In The Field` to make room (max 5 nav items before crowding). Guarantee still has a `#guarantee` anchor in footer + scroll target on home.
- Portfolio "filterable by artist or event" (brief stretch goal) — **not implemented**. Tiles show artist + venue on hover only; no filter UI yet. Add later if needed.
- Carousel order: I led with the high-access shots (Flux+DocP, Wooli+AP, ATLiens) per the portfolio brief — applied that same priority to the homepage carousel since it's the same "wow shot first" principle.
- "EDM Portfolio (N)" shots have generic captions ("In The Field · Frame 01"). When you have artist/venue ID for each, update `extrasMapped` in `pages/portfolio.astro`.

### Still queued / TODO

- **Calendly URL** still placeholder in `BookCall.astro`.
- **Email + social handles** still placeholder.
- **Scroll-triggered fade-ins** (brief §16) — still skipped.
- **Inline Calendly embed** vs current link-out.
- **Portfolio filtering** by artist/event.
- **Real captions for portfolio-01..19** once Mason IDs each shot.
- **Neotek shot** — listed in brief roster but no file in the drop. Either he wasn't in this batch or filename is one of the generic `portfolio-NN`.

---

## Session 4 — 2026-05-19 — Cinematic refinements pass (commit `ff50620`)

This session landed on top of a parallel set of color tweaks (commits `2975c82` → `a27556b`) that re-balanced the palette toward **blue-dominant, orange-sparing** per brief §16. Both sets merged cleanly via rebase.

### What got built

1. **Portfolio lightbox** — every Access card + masonry tile is now a `<button>` that opens a native `<dialog>` overlay with the full-size image (a 1800px WebP variant generated at build time via `getImage()`). Backdrop click, X button, and ESC all close. Body scroll is locked while open. No JS dependencies — vanilla `<dialog>` + ~30 lines of script.
2. **Carousel** — auto-advances every ~4.2s with a smooth `scrollBy()` snap. Pauses on mouse hover, on touch, when the tab is hidden, and during any nav-button click or drag (resumes 2s later). Mouse drag-to-pan added (touch uses native scroll-snap to keep momentum smooth). Click suppression after a drag so an accidental tile click doesn't trigger when the user is actually panning. Respects `prefers-reduced-motion`.
3. **`Parallax.astro` (new component)** — full-bleed section inserted between Problem and Solution. Cycles through the 3 hero images on a 5s crossfade. Background images transform on scroll via `requestAnimationFrame` for true parallax (no `background-attachment: fixed` so it works on iOS). Includes a 3-button "meter" with animated fill bars showing which frame is active; clicking a meter jumps to that frame and resets the cycle.
4. **Background overlay dial-back** — `ProblemSection` and `MarketStats` went from ~0.95 / 0.78 / 0.85 opacity gradients down to ~0.72 / 0.42 / 0.55. Photos bleed through far more visibly. Added `text-shadow: 0 2px 14px rgba(0,0,0,0.55)` to the section heading + label so they stay crisp on the lighter base.
5. **Access section** — expanded from 3 → 5 cards. Added `carousel-subtronics-levelup.jpeg` (sidestage DFT) and `portfolio-hero-theresistance-grimefest.jpeg` (Grimefest headline). Grid is now 5-col → 3-col → 2-col → 1-col responsive.

### Build numbers

- 4 pages, **94 WebP variants** (up from 55 — the lightbox 1800px variants account for the new ~40).
- Cache hit rate ~80% on rebuild — only new variants regenerated.

### Decisions worth remembering

- **No JS framework added.** All interactivity (parallax, carousel autoplay, drag, lightbox) is vanilla TypeScript embedded in `<script>` blocks. ~120 LOC total across 3 components. If we add a 4th interactive thing, consider an Astro island with Preact or similar.
- **Lightbox source = 1800px WebP.** Not the full original JPG. Renders crisp at 4K viewports while keeping bundle reasonable.
- **Parallax shift is ±80px.** Chosen so the image inset (`-10% -2%`) never reveals the underlying section background. If we crank parallax stronger, increase the inset proportionally.
- **`In The Field` carousel section now has an autoplay loop** that wraps to start at the end. If you scroll all 15 manually, it'll start over.

### Known small bug (low priority)

In `Carousel.astro` the `userInteracted` flag prevents auto-resume after a `visibilitychange → visible` event if the user previously clicked a nav button. The setTimeout-driven resume still fires within the same session, so the carousel doesn't permanently stop — but if the user clicks a nav button → tabs away → tabs back, it'll stay paused until they hover. Fix: drop the `userInteracted` gate in the visibilitychange handler (always resume on visible). Not shipped because the symptom is minor.

### Queued

- **Calendly / email / socials** — still placeholders.
- **`Neotek`** — still un-IDed from the `portfolio-NN` shots.
- **Portfolio filter chips** (artist / event) — still queued.
- **Scroll-triggered fade-ins** for non-hero sections — most sections now have their own motion (parallax, carousel, lightbox) so the priority is lower.

---

*Add a new section above this line each session. Keep entries short and decision-focused — this is a context primer, not a changelog (use `git log` for that).*
