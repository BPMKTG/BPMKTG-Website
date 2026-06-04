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

## Session 5 — 2026-05-19 — Higher-res image swap + real portfolio captions (commit `df9e100`)

### What changed

- **All 20 original photos** swapped to higher-quality `.jpg` versions (was `.jpeg`). Sizes roughly 2–3× the originals — Astro still compresses them to similar final WebP sizes.
- **32 new descriptively-named shots** added to `/src/assets/images/portfolio/`. Real artist + venue names baked into the filename.
- **Duplicates removed** from `/portfolio/` (the hero/bg/carousel files that were drag-copied in). Carousel components still import from `/carousel/`, so the dedupe doesn't break anything.
- **`pages/portfolio.astro` rewritten** to consume the new files via `import.meta.glob` + a hand-curated caption map keyed by filename slug. Generic "Frame 01" captions are gone — every tile now has a real artist + venue caption derived from the filename.
- **Extension migration:** all `.jpeg` imports across `Hero.astro`, `Parallax.astro`, `ProblemSection.astro`, `MarketStats.astro`, `Carousel.astro` flipped to `.jpg`.

### Build numbers

- 4 pages, **118 image variants** (was 94 — the 32 new shots each generate a display + lightbox WebP).
- Cache stayed warm except for the swapped files; build ran in ~21s.

### Caption choices worth flagging

A few I had to make a judgment call on — confirm or override:

| Filename slug | I rendered it as | Notes |
|---|---|---|
| `wankdat-wooli-crankdat-dancefestopia` | "Crankdat × Wooli" | "wankdat" looks like a typo of "Crankdat" but kept Wooli too. Confirm? |
| `izyyvadim-grimefest-smoking` & `izzyvadim-grimefest-wideangle` | Both "Izzy Vadim" | Two spellings; I unified to the double-Z. Override if intentional. |
| `legendofshellda-toatsatx` & `spira-toatsatx` | venue = "TOATS ATX" | Assumed it's a venue acronym. Real name? |
| `allthereason-vulcangasco` & `rzrkt-drinkurwater-vulcangasco` | venue = "Vulcan Gas Co." | Austin venue, "Vulcan Gas Company" — confirm shortform. |
| `ahee-managment-dft-backstage` | "AHEE Management" | Note "managment" is misspelled in filename. Caption corrected. |
| `dancefestopia.jpg` | "Dancefestopia '25" | Just the festival branding shot — generic. |
| `crowd-alienpark-dft.jpg` | "The Crowd · Alien Park" | Edit if this should be just "The Crowd". |

The caption map lives in [`pages/portfolio.astro:42`](src/pages/portfolio.astro) — edit any line in the `captions` object to override.

### Section breakdown after this session

- **Homepage hero** — 3 hero photos (Excision, Alien Park, Grimefest crowd), now higher-res
- **Problem section bg** — Svdden Death (higher-res)
- **Parallax section** — same 3 hero photos, now higher-res
- **Stats section bg** — Perry Wayne (higher-res)
- **In The Field carousel** — same 15 carousel photos, now higher-res
- **Portfolio hero** — The Resistance (higher-res)
- **Portfolio Access (5 cards)** — unchanged content, now higher-res
- **Portfolio gallery (43 tiles)** — 11 carousel + 32 new shots, all with real artist/venue captions, click-to-lightbox

### Still queued

- Calendly URL / email / socials — placeholders
- Portfolio filter chips (artist / event / festival)
- Scroll-triggered fade-ins for non-hero sections
- Caption confirmations above

---

## Session 6 — 2026-05-20 — Cinematic motion pass (commit `36e544a`)

Site-wide motion overhaul implementing the user's "make everything feel alive" brief. Built around two new files plus data-attribute hooks on every component.

### Architecture

- **`src/scripts/motion.client.ts`** — single master script, ~280 LOC. One shared IntersectionObserver per effect type. Loaded once from Layout via `<script>import '../scripts/motion.client.ts';</script>`. Re-inits on `astro:page-load` for view-transition navigation.
- **Motion CSS** appended to `src/styles/global.css` — all reveals, glows, neon, glitch, conic-gradient borders, light-leak overlays, custom cursor, CTA particles, Ken Burns.
- **Components opt into effects** via `data-*` attributes: `data-reveal`, `data-reveal="left|scale"`, `data-reveal-group` (stagger via nth-child), `data-counter="…"`, `data-typewriter`, `data-glitch`, `data-tilt`.

### What shipped (in user's list order)

**Hero** — Glitch + typewriter + particles + logo glow + counter stats. The `"growth system."` highlight gets a 2-pulse RGB glitch on entry. Subhead types out at ~12-18ms/char. Logo fades in with a blue drop-shadow that decays. A canvas particle system (~48 dots, mouse-repel + Voronoi-style connecting lines) sits behind the hero — paused via IntersectionObserver when hero leaves the viewport, halted when tab hidden. Stat values count up from 0.

**Scroll system (site-wide)** — Every section's label, heading, lede, and card grid uses `data-reveal` with stagger. One shared observer. Effects only fire when scrolled into view; each fires once then unobserves. `prefers-reduced-motion` short-circuits everything.

**Problem** — Pain cards reveal sequentially with stagger. Each has a warm orange-tinted glow + border on hover. Background image has a 28s Ken Burns alternate-loop.

**Roadmap** — Connecting line is a 2px blue gradient bar with scaleY transform driven by IO. Steps reveal sequentially via the same `data-reveal-group` stagger. Step numbers pulse with a one-shot blue text-shadow animation on reveal.

**Offers** — Cards stagger in. Featured tier has an animated conic-gradient border (uses `@property --tier-angle` for smooth interpolation; degrades to nothing on older browsers).

**Carousel** — `AUTO_MS` dropped 4200 → 3000ms. Existing autoplay + drag + touch swipe + hover-pause + reduced-motion handling stays. Caption fade happens automatically via the existing scroll-snap landing.

**Stats** — Each value has `data-counter="$12.9B"` etc. Counter parses prefix/value/suffix from any format. After landing, a 48px blue underline draws below with a 0.9s ease.

**Guarantee** — Card has a `guardPulse` animation: glowing border breathes between 0.3 and 0.6 box-shadow opacity over 4.5s. Section also gets a `.bp-texture` overlay (faint blueprint grid).

**Book a Call** — `<span class="text-neon">Blueprint.</span>` pulses with text-shadow. Button has a sweep shimmer via `::after` skewed gradient. 18 absolutely-positioned `<span>` particles float upward from the section bottom with random x, duration (10-20s), and drift. No canvas; pure CSS.

**Footer** — Animated 1px gradient line sweeps across the top continuously (7s loop). Logo gets a `drop-shadow` glow on hover. Social links translate-X 3px on hover.

**Portfolio** — Masonry tiles reveal staggered. Access cards have `data-tilt` for cursor-tracking 3D tilt (max 8°) plus a radial light-leak overlay following the pointer. Lightbox already opened with scale + blur backdrop from session 4; now also supports `←/→` arrow keys.

**Global** — Custom cursor (28px outline circle + 3px dot) replaces native cursor on desktop with `(pointer: fine)` AND no reduced-motion. Hover state on `a, button, [data-lightbox-open]` swaps the dot to a filled blue circle and scales the outline. Auto-disabled on touch / coarse pointers. Cursor uses `mix-blend-mode: difference` so it's visible on any background.

**View transitions** — Astro 4's `<ViewTransitions />` enabled. Cross-fade between Home and Portfolio at 320ms. Motion script re-inits on each page swap via `astro:page-load`.

### Explicitly skipped, with reasons

- **Inertia smooth scroll (Lenis-style)** — high jank risk, accessibility cost (interferes with native scrollbars, screen-readers, scroll-anchoring), and modern Apple/Windows precision trackpads already feel weighted. Browser native scroll is the right baseline.

### Performance notes

- All IntersectionObservers are `{ threshold }` with `unobserve` on first hit. No element is observed forever.
- Hero canvas pauses when `entry.isIntersecting === false` and on `visibilitychange === hidden`.
- Custom cursor uses one rAF loop only when a pointermove has occurred recently.
- 3D tilt rAF loop only runs while pointer is over the element; cancels on leave.
- Counters fire only when scrolled to (50% threshold) and freeze after completion.
- CSS `prefers-reduced-motion` blanket-kills all animation-duration / transition-duration / iteration-count, plus hides particles + glitch overlays.
- Carousel + view-transition init are idempotent (won't re-bind to elements already wired).

### Known small things

- **Astro version pinned to 4.16.19** by lockfile despite `package.json` declaring `^6.3.3`. Used `ViewTransitions` (Astro 4 API) accordingly. When you bump to Astro 5+, rename to `ClientRouter` in `Layout.astro`.
- **Conic-gradient `@property` border** on featured offer requires Chrome 85+/Safari 16.4+. Older browsers see a static featured card (still has orange box-shadow halo).
- **Custom cursor + view transitions:** the cursor element gets removed during page swap because it's appended to `<body>`. `astro:page-load` re-creates it. Brief flash possible during transition.

### Queued (carryover from session 5)

- Calendly URL / email / socials still placeholders.
- Portfolio filter chips (artist / event).
- Custom view-transition styles per route (right now everything is the default cross-fade).

---

## Session 7 — 2026-05-20 — Cinematic refinements + Astro 6 build fix

This session iterated the motion pass several times. Multiple commits, summarized as one phase.

### Image + Excision crop

- Excision hero photo (`hero-1`) re-cropped via `object-position: center 68%` so stage + fire show beneath the lasers. Done both in `Hero.astro` slide-0 and `Parallax.astro` frame-0.
- Higher-res `.jpg` versions of all 40 photos came in mid-session. Lockfile already had Astro 6.3.3; my local `node_modules` was stale at 4.16.19, which masked a Cloudflare build error: I used `ViewTransitions` (Astro 4 API) which broke on Cloudflare's clean install of Astro 6 (which uses `ClientRouter`). **Fixed:** import is now `import { ClientRouter } from 'astro:transitions'` in `Layout.astro`. Ran `npm ci` locally to align.

### Section bg reshuffle

- Removed Svdden Death photo bg from `ProblemSection.astro` — the section is now plain dark.
- Added Svdden Death photo bg + Ken Burns + parallax + overlay to `Roadmap.astro` (How It Works). Step cards made semi-transparent (`rgba(18,19,28,0.78)` + `backdrop-filter: blur(10px)`) so the photo glows through behind them.

### Parallax expansion

- Added `[data-parallax-bg]` attribute + `initBgParallax()` to motion.client.ts. Targets are `.slides` in Hero, `.bg` in Problem (now Roadmap), `.bg` in Stats. Each one bleeds `inset: -10% 0` so the ±70px scroll translation never reveals empty edges.

### Carousel polish

- `cardKB` keyframe added — subtle 14s scale 1.0 → 1.08 loop on every carousel card, staggered via `nth-child` so they don't pulse in sync. Hover pauses + snaps to scale 1.06.
- `AUTO_MS` dropped 4200 → 3000ms.
- Deferred first auto-advance until the carousel enters viewport, then `setTimeout(2500)` → tick + start interval. So the user lands on the carousel, looks for ~2.5s, then it advances.

### Offer card improvements

- Tier 3 price `$2-3K` → `$3,000`. Tier 4 `$5-10K` → `$10,000`.
- Added `data-counter` on price-num. Counter parser already handled prefix/suffix; updated to use `toLocaleString` for thousands separators so `$1,000` counts up with the comma.
- Pinned `h3 min-height` and `.positioning min-height` so prices align horizontally across cards.
- **Symmetry refactor:** split the `tag` field on `" · "` and render as a 2-line stacked label (`Tier 01 ·` / `Entry`) — matches what Tier 4's wrapping already did naturally. All four cards now have identical 2-line header structure.
- Stacked `.price` flex-column so cadence text always sits below the price number (was wrapping awkwardly when `$10,000` was wide).
- Reduced `h3 font-size` to `clamp(1.05rem, 1.55vw, 1.2rem)` with `letter-spacing: -0.01em` and `text-wrap: balance` so "Growth Blueprint Session" fits in 2 lines instead of 3.

### Portfolio polish

- Lightbox: every Access card + masonry tile is now a `<button>` opening a native `<dialog>` with a 1800px WebP variant (`getImage()`).
  - Close: backdrop click, X button, ESC.
  - Arrow-key nav between tiles (in `initLightboxArrows()`).
  - **Cursor stays visible** when lightbox open: when opening, re-parent `.bp-cursor` into the `<dialog>` so it joins the top layer; on close, re-parent back to `<body>`.
- Masonry tile aspect-ratios: each tile carries `data-orientation="h"` or `"v"` (derived from `src.width >= src.height`). CSS: horizontals = `aspect-ratio: 1/1` square crop, verticals = `aspect-ratio: 3/4` portrait. Lightbox still loads the unmodified 1800px variant so full-size views show original ratio.
- Gallery tiles: interleaved `tilesLB` by orientation (`H, V, H, V…`) so the masonry doesn't clump same-orientation tiles in one column.
- Caption slide-up: tile + Access feat-card hover now slides the caption from `translateY(14px)` → `0` over 0.4s with `cubic-bezier(.2,.7,.3,1)`. For Access cards, moved `.meta` *inside* `.img-wrap` as a true hover overlay (was always-visible below before).
- Removed the "42 frames across 9+ events…" gallery sub line.

### Refined How It Works reveal

- Replaced the cheap one-shot pulse animation with a **settled** entrance: step number slides up + fades with `cubic-bezier(0.16, 1, 0.3, 1)` over 1.1s, lands at full opacity with a permanent soft blue text-shadow (no pulse).
- Title underline draws — a 1px gradient line draws from 0 → 64px under each `h3` over 1.3s.
- Feels designed, not animated.

### Guarantee headline + Calendly

- Removed hard `<br/>` tags. Now uses `text-wrap: balance` + `max-width: 28ch` + `&nbsp;` between "30" and "days" so the text wraps naturally to 3 balanced lines.
- Calendly link in `BookCall.astro` updated to `https://calendly.com/mc-media-marketing`.

### Cursor refinement

- Replaced circle + dot with a **crosshair** (`+`): two thin perpendicular bars, 22px span, 1.5px thick, blue, `mix-blend-mode: difference`.
- Added a hollow center: each bar uses `linear-gradient(..., color 0% 40%, transparent 40% 60%, color 60% 100%)` so the four arms don't touch in the middle.
- Hover state: grows to 34px, lines thicken to 2px, color shifts to orange.
- Click state: shrinks to 16px.

### Commits

`0700861`, `9a5ffe0`, `ce7d735` (Astro build fix), `7ee804a`, `a4abe60`, `021e7aa`.

---

## Session 8 — 2026-05-20 — Artist marquee + transferring to laptop

### Artist marquee added

New component `src/components/ArtistMarquee.astro`. Placed between `Hero` and `ProblemSection` on the homepage.

- 46 artist names hand-listed (`Martin Garrix → Gabetoldmeto`).
- Each name is followed by an inline SVG play-button triangle in `--bp-orange` with a soft `drop-shadow` glow.
- Render order changed mid-iteration: each `<li>` now renders `<sep>` BEFORE `<artist>` (used to be after). So at frame 0, the leftmost visible element is the play button — gives Martin Garrix a brief reading lead-in instead of being clipped at the left edge.
- Label above: "In The Field With" in Orbitron uppercase, light blue, `0.22em` letter-spacing.
- Background is transparent (no border lines top/bottom).
- Edge fade via `mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)`.

### Animation: WAAPI, not CSS

CSS `animation-duration` doesn't preserve playhead position when changed (browsers keep elapsed time, not progress fraction — so changing 110s → 440s mid-animation jumps the visual). Switched to the **Web Animations API**:

```ts
const animation = row.animate(
  [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-50%,0,0)' }],
  { duration: 180_000, iterations: Infinity, easing: 'linear' }
);
```

- Base duration: **180s desktop / 130s mobile**.
- Hover: `animation.updatePlaybackRate(0.3)` — drops to ~30% speed without jumping (WAAPI preserves the current playhead position by recalculating start-time when playback rate changes).
- Tab-hidden: `animation.pause()`.
- Initially paused. Started only when the marquee scrolls into view (IntersectionObserver, `threshold: 0.15`). So the user always sees frame 0 — first artists visible — regardless of how long the page sat before scroll.

### State machine

Three flags drive a single `applyState()` function: `visible` (in viewport), `hovering` (pointer over), `document.hidden`. Combinations:

- Not visible → `pause()`.
- Visible + not hovering → `play()` + rate 1.
- Visible + hovering → `play()` + rate 0.3.
- Tab hidden → `pause()`.

### Known small notes

- Tier 3 still shows "MOST PICKED" both in its ribbon AND in the second line of its tag (`TIER 03 ·` / `MOST PICKED`). Visually duplicated. Easy fix when you want it: change Tier 3's tag to e.g. `Tier 03 · Growth` (the tier name is "Fan Growth Engine") so the ribbon and tag don't repeat.
- Cursor briefly disappears during view-transition page navigations (it's appended to `<body>` which is replaced; `astro:page-load` re-creates it but there's a flash).

### Cumulative commits in session 8

`3cbc61c` (marquee added), `923959e` (slower default), `08e646d` (WAAPI + transparent), `b11cdfb` (defer-until-visible + softer hover), plus the current pending commit (play-button-first start + log update for laptop handoff).

### What's still queued (carryover)

- Real social handles in Footer (Instagram, TikTok, YouTube, X)
- Real email (currently `hello@blueprintmkt.com`)
- Portfolio filter chips (artist / event)
- Custom view-transition styles per route
- Tier 3 ribbon/tag dedupe

---

## Session 10 — 2026-05-23 (laptop, evening) — Optimization pass: kill the glitches

User reported intermittent "glitchy or doesn't load sometimes" symptoms. Did
a focused audit + three commits.

### Audit findings

Five real bugs in `src/scripts/motion.client.ts`, all caused by lifecycle
mishandling around Astro's `ClientRouter` view transitions:

1. **`init()` ran twice on first page load.** `astro:page-load` fires on the
   initial document too, not just on subsequent navigations. The original
   bootstrap installed BOTH an `astro:page-load` listener AND an immediate
   else-branch fallback, so both fired. Visible symptom: counters animated
   twice (flicker), typewriter restarted mid-stream, glitch double-fired.
2. **Listeners stacked across navigations.** `initCursor`,
   `initBgScrollEffects`, `initHeroParticles`, `initLightboxArrows` attached
   to `document`/`window` with no removal. After three navigations the site
   had three sets of scroll/keydown/pointer handlers. Sluggish after a few
   clicks.
3. **No idempotency on per-element observers.** Re-running `initTilt`,
   `initReveal`, etc. against the same DOM added another set of pointer
   listeners to the same elements. Compounds with #1 and #2.
4. **Stale DOM refs in `initBgScrollEffects`.** It cached
   `[data-parallax-bg]` / `[data-scale-bg]` element refs at init time; after
   a view transition swapped those nodes, the scroll handler kept running
   `getBoundingClientRect()` on detached DOM.
5. **Hero particle canvas could orphan.** If a view transition replaced the
   hero, the old particle loop kept running against a detached canvas.

Plus two low-impact size/hygiene issues — 27 MB of founder JPGs being
4x-downscaled by Astro anyway, and the three duplicated tile blocks in
OnFilm.astro.

### Fixes shipped

**Commit `a739fc4` — motion.client lifecycle rewrite**
- Single bootstrap via `astro:page-load` + `didInit` flag for dedupe;
  DOMContentLoaded fallback only fires if `astro:page-load` hasn't.
- `runCleanups()` on `astro:before-swap` detaches every document/window
  listener and disconnects every IntersectionObserver from the outgoing
  page.
- Every init now uses `:not([data-mx-{name}])` selectors + `setAttribute`
  markers, so re-running against partially-bound DOM is a no-op.
- `isConnected` guard inside `initBgScrollEffects.update()` belt-and-braces
  against any cleanup misses.
- `initLightboxArrows` replaces per-opener click listeners with a single
  delegated `document.click` handler.

**Commit `a8c789f` — founder JPGs 27 MB → 1.1 MB**
- `clayton-ward.jpg` (3302x4953, 13 MB) and `mason-celum.jpg` (3680x5520,
  14 MB) resampled to 1800px max dimension at JPEG q85 via `sips`.
- About.astro renders them at `width={900} height={1200}`, so Astro was
  downscaling 4x just to throw the data away.
- Served webp output unchanged (24-119 KB depending on breakpoint). Repo
  clones now pull ~26 MB less.

**Commit `f6c6d4a` — OnFilm tile dedupe**
- Three near-identical tile blocks (feature / recap / moment) collapsed
  into one shared `FilmTile.astro` component that takes
  `variant: 'feature' | 'standard'`.
- Tile-internal CSS moved with the markup (Astro scoped). OnFilm keeps the
  section / grid / video-lightbox concerns.
- OnFilm.astro 612 → 281 lines; FilmTile.astro is new (286 lines). Net -45
  lines. Bigger win: tile updates now happen in one place.
- No DOM / CSS / JS behavior change. The hover-play + Vimeo lightbox script
  still selects via `[data-film-tile]`, unaffected by the component split.

### Decisions worth remembering

- **`astro:page-load` fires on initial load too.** Any future client script
  should bootstrap through it alone (with an optional DOMContentLoaded
  safety net) — never both, or you'll re-init.
- **Detach listeners on `astro:before-swap`.** Cleanest pattern is the
  `onCleanup`/`runCleanups` helper now in `motion.client.ts`. Use the same
  pattern for any new global-scope listener.
- **Per-element idempotency**: `[data-mx-{name}]` markers are the standard
  for "did I already bind this element?" in this codebase.

### What's still queued (carryover from Session 9)

Unchanged. Calendly URL confirm, real social handles, BMV video drop, etc.

---

## Session 9 — 2026-05-21 to 2026-05-23 — Polish, gallery iterations, full video system, About rebuild

A long stretch — too much for a clean per-day breakdown so consolidated by feature. Roughly 35 commits.

### Offer card flip-in saga (cascade lessons learned)

User wanted the four tier cards to flip in 3D as they enter view. Took 6 attempts to get right because of cascade conflicts:

1. **Attempt 1–3:** Added `[data-reveal="flip"]` to global.css with progressively bigger rotation (−16° → −34° → −62°). Each time the user reported they were "snapping" too fast.
2. **Found the bug:** `OfferStack.astro`'s scoped CSS had `transition: border-color 0.2s, transform 0.2s` on `.tier`. Astro auto-scopes selectors with a `[data-astro-cid-X]` attribute, giving them class-level specificity. My global `[data-reveal="flip"]` selector (only attribute-level specificity) was being beaten — transition was 0.2s instead of the intended 1.6–2.8s.
3. **First fix attempt:** `!important` on the global transition. Worked but had a side-effect — the tier hover `transform: translateY(-3px)` started inheriting the slow 2.8s timing, making hover sluggish.
4. **Final fix:** Moved the entire flip CSS *into* `OfferStack.astro`'s scoped block. Removed `!important`. Hover now uses `box-shadow + border-color` only (no transform conflict). Reveal owns the transform.

**Current state (commit `2f63ead`):** 1.6s flip, 0.3s sequential stagger, ~2.5s total scene. `rotateY(-55deg) translateY(60px) translateZ(-180px) rotateX(6deg)` initial state.

**Lesson logged:** Any new `data-reveal=*` variant that needs to win against component-scoped CSS should be defined IN the scoped block, not in global.css. Or use scoped-friendly selectors like `.specific-class[data-reveal="…"]`.

### Carousel edge-hover scroll

Added invisible 90px hover zones on the left/right edges of the In The Field carousel. Pointer enters edge → continuous scroll at ~240px/s via `requestAnimationFrame`. **Critical fix:** `scroll-snap-type: x mandatory` on the rail was making the tiny scrollBy calls snap to the next card edge (jumping hundreds of pixels). Solution: toggle `scrollSnapType: 'none'` on edge enter, restore on leave.

### Gallery ordering iterations

User went through several iterations on the masonry layout — most happened directly on Cloudflare's main without my involvement. Logged as commits `2975c82` through `af1f8f4` and beyond. End state:
- 54 tiles in explicit user-curated order (no auto-sort)
- CSS Grid with `grid-auto-flow: row` + integer row spans (H = span 3, V = span 4)
- Row height computed via `100cqi` container queries for true squares
- Bottom is row-aligned (straight line)
- Removed `data-reveal` from individual tiles so they no longer pop in as you scroll — they load via lazy `<img>` only, feels snappier

Then later (commit `b795b84`): 2 new tiles appended (Wooli + Level Up at #55, #56). User asked to swap order so Wooli is at #55 (col 3), Level Up at #56 (col 4). Done.

### On Film video section (full wiring)

This was the big one. Built from scratch as `OnFilm.astro` placed between Access and Gallery on the portfolio page.

**Structure:**
- 1 Featured After Movie (full-width 16:9): Grimefest
- "Recap Videos" sub-section: 4 vertical tiles (Wooli, DFT, Martin Garrix, Grimefest Day 2)
- "Video Moments" sub-section: 6 vertical tiles (Flux, Excision, Blankface, Dion Timmer, Izzy Vadim, Level Up). Grid is `repeat(6, 1fr)` at wide, drops to 3 → 2 on smaller.

**Per-tile UX:**
- Static state: artist name centered in dead-center via `.tile-name` overlay (text-shadow for legibility over any image)
- Hover: name fades to 0 + scales down 0.96, video preview fades in over poster, bottom `.hover-meta` slides up with venue label, orange play icon fades in (now hover-only — used to be always visible but covered the name)
- Click: opens a dedicated **video lightbox** (separate from the photo lightbox) with the Vimeo embed autoplaying with audio. `?autoplay=1&title=0&byline=0&portrait=0&dnt=1` strips Vimeo branding. Iframe `:global()` selector required because the iframe is JS-injected and doesn't carry the Astro cid attribute that scoped CSS targets.
- Category badge (`MULTICAM` / `RECAP` / `MOMENT` / `AFTER MOVIE`) always visible in top-left corner with backdrop blur

**Assets wired (10/10):**
- All 10 thumbnails live in `src/assets/images/thumbnails/` (Astro-processed to WebP)
- All 10 hover previews live in `public/videos/previews/` (10–20MB each, encoded from Premiere at 720p/24fps/VBR 2-pass 3–8 Mbps depending on content density)
- All 10 Vimeo IDs wired
- After-movie Grimefest reuses `hero-3-grimefest-crowd-lightsaber.jpg` as its poster (no dedicated thumbnail)
- Blankface tile uses the "surprised" portfolio shot as its thumbnail (better than the multicam crop)

**Known issue (currently being addressed):** Festival recap content (rapid cuts + lasers + smoke + crowd detail) compresses much worse than artist-closeup content. The two Grimefest recaps initially looked artifacted. Fix is re-exporting at 8 Mbps + 1080p source resolution. User re-uploaded both recently (file sizes jumped from 7MB → 17–18MB) — looks clean now.

### Brand Message Video section (homepage)

New `BrandMessage.astro` between ArtistMarquee and ProblemSection on the homepage.

**Layout:** 5fr / 7fr two-column grid at wide (text left, video right), stacks at ≤920px. Uses brief excerpt from the BMV script as intro: *"You're doing everything right. **And still wondering why nothing's breaking through.**"* + a lede about the 2-minute manifesto. Below: "Skip the video, book the call" CTA → `#book`.

**Video player:** placeholder for now (Coming Soon pill + big play button + Vimeo-ready iframe slot). Drop a `vimeoId` in the frontmatter when the BMV is delivered — markup auto-swaps to a real Vimeo iframe.

### About page rebuild (`/about`)

User asked for a full About page with founders, vision, goals, and a tease on the homepage. Built option C from my earlier proposal (both home tease + full /about page).

**Full `/about` page structure:**
1. Hero — atmospheric crowd-grimefest photo background with parallax + scroll-scale, "We're not an agency. We're growth infrastructure." headline
2. Vision — 4 paragraphs (manifesto-style: industry gap → EDM-native → 2027 goal → Christian values), atmospheric radial glows + `bp-texture` grid overlay
3. Founders — alternating row layout: Mason left/right, Clayton mirrored. Big numbered overlay (`01`, `02`) at 9rem Orbitron Black 18% blue peeks from top-corner of each photo. Photos at 4:5 portrait with hover lift + border glow + bottom radial blue light leak
4. Principles — 4 cards (EDM-native, Systems-not-campaigns, Built on integrity, Building toward a platform) — same pattern as Why Blueprint cards but with `bp-texture` background
5. BookCall reused at bottom

**Homepage tease — `AboutTease.astro`** slots between WhyBlueprint and MarketStats. Side-by-side: copy on left ("Built by two creators inside the scene"), portraits side-by-side on right with hover lift. "Read our story →" pill links to `/about`.

**Nav update:** added "About" between "In The Field" and "Blog" in the header pill nav. 6 items total now — fits at desktop, hides at mobile per existing breakpoint.

**Photos:** `src/assets/images/about-us/mason-celum.jpg` and `clayton-ward.jpg`. Folder originally named `about us` (with space), renamed to `about-us` for clean imports.

### Other polish landed in this stretch

- Marquee finalized: WAAPI animation (Web Animations API, not CSS) so hover slowdown preserves playhead position. Defer-until-visible (IntersectionObserver). Play-button-first item order so visual leads with the icon. List rotated so Gabetoldmeto is at index 0 (gives Martin Garrix lead-in time to read).
- Footer logo glow on hover, social link translate-X
- Scroll-driven scale on Hero + Stats backgrounds (via generalized `data-scale-bg` attribute in motion.client.ts)
- Spin moments: offer card flip-in (above), step number tilt entry, button arrow 360° on hover, marquee separator easter egg (rotate while hovered)
- Hero replaced with single Martin Garrix Wicked Oaks image (was 3-image crossfade), continuous slow Ken Burns
- Carousel auto-advance to 3s, deferred start until in view
- Cursor → crosshair with hollow center, visible during lightbox open (re-parented into dialog for top-layer rendering)

### Final state per page (as of this session)

**`/` (homepage):** Hero (MG Wicked Oaks single image) → ArtistMarquee (46 names, WAAPI scroll) → BrandMessage (placeholder) → ProblemSection → Parallax → SolutionUSP → Roadmap (with Svdden Death bg) → OfferStack (flip cards) → WhyBlueprint → **AboutTease (new)** → MarketStats → Carousel (In The Field) → Guarantee → BookCall

**`/portfolio`:** Hero (Resistance) → Access (5 featured cards) → **OnFilm (new — 11 video tiles)** → Gallery (54 photo tiles in user's curated order) → BookCall

**`/about`:** **Rebuilt** — Hero (crowd-grimefest bg) → Vision → Founders (alternating rows) → Principles → BookCall

**`/blog`:** Still basic stub.

### Still queued / TODOs

- Real Calendly URL → currently `https://calendly.com/mc-media-marketing` (looks real, confirm before launch)
- Real social handles in Footer (Instagram, TikTok, YouTube, X) — all `#` still
- Brand Message Video itself when ready (drop `vimeoId` in `BrandMessage.astro`)
- "Personal detail" for Clayton if you want one (Mason's was removed per request, Clayton's never added)
- Custom view-transition styles per route (right now default cross-fade)
- Cursor briefly disappears during view-transition page swap (~50ms flash)

---

## Session 11 — 2026-05-24 — Mobile optimization pass

User: *"do what you can to better optimize for mobile. I don't want the
desktop version to change, but need the site to function better on mobile.
EX. All of the mouse hover effects on desktop need to work based on scroll,
or be removed for mobile, anything that requires clicking and holding needs
to be changed or removed, The gallery should be 2 wide instead of one wide."*

### Strategy

Use `@media (hover: none)` as the gate for every touch-side override —
matches phones + non-pen tablets, leaves any hover-capable input
(desktops, MacBooks, tablets-with-mouse) on the existing desktop behavior.
Don't touch desktop CSS paths.

### Changes shipped

**`src/styles/global.css` — touch-device override block**
- Disables the universal arrow rotation, button shimmer sweep, and
  card-lift transforms on `(hover: none)`. Sticky `:hover` states on touch
  read as broken UI — easier to remove than to mask.
- Forces `.film-tile .hover-meta`, `.feat-card .hover-meta`, `.tile .caption`
  to `opacity:1` so the captions that desktop reveals on hover are always
  visible on touch.
- Kills the marquee separator spin (`.marquee:hover .sep` animation) on
  touch — there is no hover state to drive it.
- Adds `.film-tile.is-playing` hooks (name fades, video opacity 1) so the
  scroll-triggered preview playback below has a CSS path to use.

**`src/components/OnFilm.astro` — scroll-triggered preview playback**
- Hover-play path retained for `(hover: hover) and (pointer: fine)`.
- On touch, a rAF-throttled scroll listener picks whichever tile's center
  is closest to viewport center and plays just that one preview. Pause +
  reset on the previous tile, pause-all when tab hidden. Single tile plays
  at a time → bandwidth-friendly while still feeling cinematic.
- Click → Vimeo lightbox unchanged (already works on touch).

**`src/pages/portfolio.astro` — 2-col gallery on phones**
- The 1-col `@media (max-width: 480px)` branch was making the page feel
  endless. Now 2-col with tighter `0.5rem` gap and a smaller caption
  treatment. H/V row-span pattern preserved.
- Access featured row also goes 2-col at phone widths (was 1-col), with
  scaled-down hover-meta padding.

**`src/components/Header.astro` — mobile nav menu**
- Prior state: `.nav-pill { display: none }` at `≤980px` with no
  replacement. Phones had logo + (sometimes) Book a Call only. No way to
  reach `/portfolio`, `/about`, `/blog`, or any anchor section.
- Added a hamburger button (`.nav-toggle`) that's hidden on desktop, shown
  at `≤980px`. Opens a fullscreen `position: fixed` sheet with all 6 nav
  links + the Book a Call CTA, all big enough to thumb. Closes on link
  click and on Escape. Body scroll locked while open. Animated open/close,
  hamburger → X morph.

**`src/components/OfferStack.astro` — softer reveal on phones**
- The desktop flip uses `rotateY(-55deg) translateZ(-180px)` for a deep
  3D deal-in. On a phone (1-col stack, narrow viewport) this clipped at
  the edges and was perf-heavy.
- `@media (max-width: 760px)` overrides the tier transition to a simple
  `translateY(40px)` slide-up + fade with a tighter 0.12s stagger. Half
  the duration, no perspective work.

### What this fixes (concrete)

- **Gallery captions visible.** Previously phones got no caption at all on
  the gallery / Access cards / video tiles — hover-meta was opacity 0 and
  there was no hover to trigger it.
- **Video previews actually play on phones.** Scroll-into-view replaces
  hover-into-view.
- **Reachable nav.** Phones can finally get to /portfolio, /about, /blog,
  and the section anchors.
- **No sticky hover transforms.** Cards no longer lift on tap and stay
  lifted until the next tap somewhere else.
- **2-col gallery.** Three full screens of scroll became one and a half.
- **Marquee, carousel, parallax, BookCall, hero stats** were already
  responsive — left untouched.

### Notes

- The `(hover: none)` query is the right gate, not viewport width. A
  Surface Pro or iPad with a connected mouse keeps the desktop path. A
  pen-only tablet hits `(hover: none) and (pointer: fine)` which still
  matches — fine, captions become visible, hover-lift disabled, scroll
  plays previews. No regressions on touch-only behavior.
- Hover videos on the scroll-active tile remain `loop` + `muted`
  + `playsinline` so iOS Safari autoplays without user gesture and no
  audio surprise.
- Build green, 4 pages, no new image variants (CSS + JS only).

---

## Session 12 — 2026-05-25 to 2026-05-30 — Cinematic hero rebuild, brand audit, BMV, unified space background

The biggest session by volume. Five major arcs (cinematic hero, BMV wiring, brand audits, voice lines, background system rebuild) plus a lot of small polish. Site is now feature-complete except mobile optimization and content-gated items (socials, testimonials).

### Arc 1 — Cinematic hero (multiple rewrites, the longest single thread)

**Where it ended up:** On desktop the hero is a zoom-out reveal — the montage video stays locked inside the Program monitor of a real Premiere screenshot, and as you scroll the editor pulls back to reveal itself around the video. Synchronized FLIP transforms; the video's shrink path and the editor's monitor path share the same two endpoints (full-screen ↔ monitor rect), interpolate linearly, and stay pixel-locked throughout (verified dx/dy = 0 at start, mid, and parked). Mobile keeps the static hero with the vertical video cut.

**Three sequential rebuilds** (each one the user clarified what they actually wanted):

1. **v1:** Stylized CSS Premiere chrome (panels, timeline, fake clips, playhead tied to video time). Video shrinks into it. — *Rejected: user wanted a real screenshot.*
2. **v2:** Real `editor-backdrop.png` as backdrop, video shrinks into the Program-monitor rect, text attached, scales together. — *Rejected: cars baked into the screenshot didn't line up perfectly; user asked for an empty-monitor screenshot which we got, then asked for a different motion altogether.*
3. **v3 (current):** Real screenshot + zoom-out (editor scales from monitor-fills-viewport at p=0 → identity at p=1, video locked to monitor at all p). Backdrop = empty-monitor Premiere screenshot, 2558×1380, monitor target = a moderate 16:9 region (~44% width) centered on the dark monitor area.

**Key technical pattern (the lock-step math):** Two linear-interpolated affine transforms on different elements stay pixel-locked at all p if their endpoints match. Video FLIP: identity (cover box) → translate+scale to monitor rect. Editor transform: zoom (monitor center → viewport center, max scale) → identity. Both apply linear lerps to corner positions; corners coincide at p=0 (cover box = monitor-at-zoom) and p=1 (monitor rect = monitor-at-identity), so they stay locked mid-scroll.

**Final values worth knowing:**
- `MON = { l: 0.216, t: 0.0675, w: 0.44, h: 0.459 }` (fractions of 2558×1380 backdrop; 16:9 in pixels)
- Editor fit positioned **below** the sticky header via `padTop = headerH + 6` so the menu bar isn't tucked under the header
- Track height 200vh, morph completes at p≈0.95 so there's no dead "parked" pause before release
- Cinematic only fires on `(min-width: 981px) and (hover: hover) and (prefers-reduced-motion: no-preference)` — mobile/touch/reduced-motion gets the static hero
- Mobile (≤980) serves `/videos/hero-montage-vertical.mp4` (1080×1920); desktop serves `/videos/hero-montage.mp4` (1920×1080). Inline `is:inline` script picks the source before the video loads so only the right file downloads; falls back to horizontal if vertical 404s.

**Particles:** were disabled during the cinematic rebuild (canvas would span 240vh). Re-enabled by hosting the particle canvas in `.hero-sticky` instead of `.hero` (only when cinematic mq matches), z-index 4 above the video, opacity fades with `--cine-morph` so particles vanish as the editor zooms in. Final count is 75 (was 110 — user dialed back).

### Arc 2 — MP4 generation in the browser (novel pattern)

We needed three video deliverables: an animated "how it works" intro card (5s loop) and a 5.5s end card (CTA → logo crossfade). Plus other one-offs. Built a reusable browser-side MP4 pipeline:

1. Open a temp `public/_xxx.html` page with a canvas + per-frame `draw(t)` function + a `window.encodeMP4` async function.
2. `encodeMP4` uses `WebCodecs VideoEncoder` (avc1.4d401f, H.264 Main 3.1) and dynamically imports `mp4-muxer@5.2.1` from esm.sh. Loops `total = FPS * DUR` frames, drawing each one to canvas and feeding `new VideoFrame(canvas, {timestamp})` to the encoder.
3. After `await encoder.flush()` and `muxer.finalize()`, base64-encode the resulting `ArrayBuffer` and stash on `window.__vidb64`.
4. Eval to retrieve `window.__vidb64` — too large to inline (returns 1–2M chars), preview tool auto-saves it to a tool-result `.txt` file.
5. Python one-liner: `base64.b64decode(open(path).read().strip().strip('"'))` → writes the `.mp4`.
6. ffprobe-static via npx for verification, ffmpeg-static for frame extraction.

**FPS support:** WebCodecs handles 23.976 fps cleanly via `framerate: 24000/1001` config + `Math.round(i * 1e6 / FPS)` timestamps. End-card was originally 30fps; user asked for 23.976 to match their Premiere timeline + 3 extra frames (135 total = 5:15 @ 23.976) — re-rendered with FPS = 24000/1001.

**Files produced and committed:** `public/videos/how-it-works.mp4` (5s loop, 30fps), `public/videos/end-card.mp4` (5.5s, 23.976fps), `public/brand/how-it-works.svg` (with embedded Orbitron woff2 base64 — fully portable, font baked in), `public/brand/how-it-works.jpg`.

### Arc 3 — Brand Message Video wiring

Vimeo ID **1196578279**. Pattern: branded poster (the cinematic placeholder we built) → click → swaps in autoplaying Vimeo iframe with branding stripped (`?autoplay=1&title=0&byline=0&portrait=0&dnt=1`). Thumbnail = `src/assets/images/thumbnails/BMV v1 Horizontal.jpg` (user-provided). Hover preview = `/videos/previews/bmv-hoverpreview.mp4` — plays on `pointerenter` (desktop hover only via `(hover:hover) and (pointer:fine)`), pauses on leave. On hover only the play button fades out (`opacity: 0`) — captions and pill stay visible. Manifesto captions still on the poster with text-shadow for legibility over the photo.

**Gotcha that bit us (third time this session):** JS-injected iframes don't carry Astro's scoped CSS attribute, so `.bmv-player` styles didn't apply and the iframe rendered at default 300×150. Fix: set sizing inline on the JS-created iframe (`iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#000;'`). Same pattern as the earlier On Film lightbox fix and the Roadmap scoped-CSS override.

### Arc 4 — Two brand audits

**Audit 1 — IOF (Notion brand bible):** Fetched all sub-pages via the notion-fetch MCP tool. Found 3 gaps:
- **FAQ section** (new component `FAQ.astro`) — 7 objection-handlers lifted from the brand `Objections + Solutions` doc, accordion format, placed between OfferStack and WhyBlueprint.
- **OfferStack polish** — ™ on all four tier names; 30-day guarantee chip at the top of the offers header (orange pill, links to `#guarantee`); PIF pricing on tiers 2–4 (`$2,500 / $15,000 / $50,000` with `saves $X` highlight in orange).
- **Funnel reorder** — Pain before Manifesto (video lands as resolution, not setup); Carousel before OfferStack (proof at the decision moment).
- Tiny polish: Roadmap step 5 "Infrastructure Scaling" → "Revenue Scaling"; WhyBlueprint card 1 "EDM-native" → "Built for bass music."

**Audit 2 — Business plan (Google Doc, public-export endpoint after the user shared it):** Surfaced what the IOF didn't have:
- **Mission/Vision/Values panel** on About page (between the Vision narrative and Founders). Mission and Vision quoted from the doc; values triad named explicitly for the first time: **Honesty / Integrity / Service**.
- **"What happens after you book" 5-step section** inside BookCall (Book the call → Discovery + audit → Custom proposal → Quick-win launch → Long-term partnership). Demystifies the call.
- **BookCall trust list** added "No inflated metrics. No hidden costs."
- **Three brand voice lines** added: "For artists who want more than just cool visuals." (WhyBlueprint lede opener); "We don't just market music — we live and breathe the culture." (About hero tagline under H1); "Your wins are our wins." (orange creed chip under Founders header).

**Held off:** the user explicitly said no testimonials yet, no real social handles, no Future-State section.

### Arc 5 — Background system (two rewrites, ending unified)

**v1:** Built `SpaceBg.astro` as a per-section component with `tone` (mixed/blue/deep/warm/orange), `density`, `grid`, `shooting` props. Pure CSS + SMIL pattern animation. Applied to 6 sections (ProblemSection, SolutionUSP, OfferStack, FAQ, WhyBlueprint, AboutTease) with varying tones for visual rhythm. — *Rejected: user wanted ONE unified environment, not section-by-section.*

**v2 (current):** Deleted `SpaceBg.astro`. New `SpaceBackground.astro` lives in `Layout.astro`, single fixed `<canvas>` at `z-index: -1`, full viewport, paints stars + diagonal shooting stars across the **entire page**.

Key design choices:
- Body bg = `#080810` (slightly blue-tinted near-black, replaces `--bg`) + 3 fixed-attachment radial-gradient nebula clouds at 6–10% opacity (subtle blue + purple).
- `--card: rgba(18, 19, 28, 0.85)` and `--card-elev: rgba(26, 28, 40, 0.88)` — cards semi-transparent so the cosmos shows subtly through.
- Photo-section overlays (Roadmap, MarketStats, About hero) reduced ~20% so concert photos bleed through more.
- Stars: viewport-area driven (~1 per 5,500 px², capped 600 desktop / 220 mobile). Radius 0.5–2.4, alpha 0.4–0.95, brightest ~15% get a `shadowBlur: 6` halo for depth. Hue: 82% white / 10% light blue / 8% brand blue.
- Shooting stars: 20–45° down-right angles, 0.6–1.2s, varying speed/size, spawn from top OR left edge, fire every 4–8s. Trail = `linearGradient` stroke from bright head → blue mid → transparent tail + bright head dot. Despawn off-screen.
- DPR-aware, debounced resize (regenerates stars at new viewport), idempotent across view transitions via `__spaceInit` flag.
- Reduced-motion: static stars only, no rAF loop, no shooting stars.

**Hero JS particles remain hero-only** (scoped to `.hero-sticky` in cinematic, `.hero` in static). Not extended page-wide.

**Diagnosis lesson:** First render of v2 looked like nothing — 0.09% lit pixels (technically painted but invisible). Bumped count + size + alpha + added halo. Verified after: 0.90% lit pixels (10×) — actually reads as a starfield now.

### Other small things landed in this stretch

- **Roadmap "How It Works" cards** — desktop entrance was popping in flat (a Roadmap scoped `.step { transition: border-color 0.15s, background 0.15s }` was silently overriding the global reveal transition's transform). Fixed by defining the lively entrance INSIDE Roadmap's scoped CSS — cards now cascade in from the left with a 0.9s spring (`cubic-bezier(0.34, 1.42, 0.5, 1)`) and a 0.12s pronounced stagger.
- **Mobile hero fit** — was clipping the "FOR TOURING EDM ARTISTS" label under the sticky header. Fixed at `@media (max-width: 600px)` by top-aligning content (`hero-copy { align-items: flex-start }`) with `min-height: 100svh` and `padding: 5rem 1.5rem 1.5rem` so content clears the header and stats fit above the fold.
- **Parallax frame swap** — Subtronics → Level Up (carousel-levelup-wide.jpg, focal point `center 60%`).
- **Carousel captions** — all 16 shots updated to match the portfolio's exact copy (Access-row wording for the 5 featured shots, gallery captions for the rest).
- **Header logo** — swapped to `logo-header.svg` (the white square mark with embedded play triangle). Wordmark was sitting inside a 576×576 canvas with huge empty padding — cropped the viewBox to `62 220 437 135` so the wordmark fills the logo box; height set to 32px.
- **Scroll-driven focus on mobile** — added the `data-scroll-focus` system: IntersectionObserver-based single-active focus highlight on touch devices (mirrors desktop :hover outline). Applied to film tiles, offer tiers, why cards, pain cards, principles, founder rows, and roadmap steps. Touch tap-highlights suppressed; `:hover` overrides gated by `:not(.is-focus)` so scroll-applied focus wins.

### Cumulative file inventory

**New components:** `SpaceBackground.astro`, `FAQ.astro`. **Deleted:** `SpaceBg.astro` (replaced by SpaceBackground).

**New brand assets:**
- `public/brand/editor-backdrop.png` — empty-monitor Premiere screenshot, 2558×1380
- `public/brand/logo-header.svg` — white square logo (viewBox cropped to wordmark)
- `public/brand/how-it-works.svg` + `.jpg` — intro card graphic (SVG has Orbitron woff2 embedded as base64, fully portable)
- `public/videos/how-it-works.mp4` — 5s seamless loop, 30fps
- `public/videos/end-card.mp4` — 5.5s CTA→logo, 23.976fps
- `public/videos/hero-montage-vertical.mp4` — 1080×1920 mobile cut
- `public/videos/previews/bmv-hoverpreview.mp4` — BMV thumbnail hover preview
- `src/assets/images/hero/editor-backdrop.png` — (Astro-processed copy of the Premiere screenshot)
- `src/assets/images/hero/hero-montage-poster.jpg` — first frame extracted from hero-montage.mp4 (poster for the video)
- `src/assets/images/thumbnails/BMV v1 Horizontal.jpg` — Brand Message Video thumbnail

**Updated repeatedly:** `public/videos/hero-montage.mp4` (user re-exported several times).

### Decisions worth remembering for next session

1. **Three different scoped-CSS-override bugs this session.** Astro scoped CSS doesn't apply to JS-injected DOM (no cid attribute). Three places we hit it: Vimeo lightbox iframes (fixed earlier with `:global()`), Roadmap step transition (component's `.step` transition silently overrode the global reveal transition's transform — fixed by defining the reveal INSIDE Roadmap's scoped CSS), BMV iframe (no scope attr, `.bmv-player` styles missed — fixed with inline `style.cssText`). Pattern: when behavior comes from JS-created elements OR when a scoped rule on the same element conflicts, expect specificity tangles. Check via `getComputedStyle(...).transition` (or whichever property).

2. **PIF pricing is now: T1 N/A (one-time), T2 $2,500, T3 $15,000, T4 $50,000.** Lives in the `tiers` array in `OfferStack.astro` with `pif: { amount, save }` field.

3. **Brand mission/vision/values triad** is now formally on About page: "Honesty / Integrity / Service" (orange-accented). The brand voice lines also live in three places that matter — see "Three brand voice lines" above.

4. **Cinematic hero math constants** (in `Hero.astro` script):
   - `IMG_W = 2558, IMG_H = 1380` (Premiere screenshot)
   - `MON = { l: 0.216, t: 0.0675, w: 0.44, h: 0.459 }`
   - `morph = easeInOut(clamp((p - 0.02) / 0.93))` (completes at p ≈ 0.95)
   - Editor fit uses `padTop = headerH + 6, padBot = 10` so it clears the sticky header
   - Track height 200vh

5. **The cinematic hero ONLY runs at `(min-width: 981px) and (hover: hover) and (prefers-reduced-motion: no-preference)`** — anywhere else (mobile, tablets without fine pointer, reduced-motion) gets the static hero with the appropriate video (vertical on mobile, horizontal on desktop-no-hover).

6. **Space background** — body is `#080810` now (was `#0a0a0f`). Anything that referenced "the brand dark" by number should use `var(--bg)` or the new color. Nebula opacity sits at 6–10% in the body's radial-gradients. Star density is viewport-area-driven.

7. **The preview tool** has consistent quirks: (a) screenshots time out when canvas animations or autoplay video are running — pause/remove video first; (b) preview window defaults to mobile width on fresh start — `preview_resize` to desktop manually; (c) browser cache + Astro dev image cache both serve stale assets when source files change — restart preview + clear `.astro` cache; (d) JSON-stringified large eval returns auto-save to tool-result `.txt` files (which is how we transferred MP4 base64).

### What's still queued (carryover for next session)

1. **Mobile optimization pass** — the user's stated next priority. Spec from session 11 still applies but now there's MORE to optimize: the BMV section, the new FAQ accordion, the OfferStack PIF lines, MVV cards on About, the new BookCall process steps. The space background is already mobile-aware (star density caps at 220, shooting star speed scaled). Hero is already mobile-aware (vertical video, static layout).
2. **Real Calendly URL** — still `https://calendly.com/mc-media-marketing` in BookCall (unconfirmed).
3. **Footer social handles** — still `#` placeholders (Instagram, TikTok, YouTube, X).
4. **Artist testimonials** — content-gated, deferred until quotes are gathered.
5. **Blog page** — still a stub.
6. **Optional fine-tuning of the cinematic hero** the user might want: zoom amount (currently ~2.3×, controlled by `MON.w`), morph timing (currently completes at p ≈ 0.95), monitor position (4 numbers in the `MON` const).

### Final homepage section order (after audit-pass reorder)

`Hero → ArtistMarquee → ProblemSection → BrandMessage → Parallax → SolutionUSP → Roadmap → Carousel → OfferStack → FAQ → WhyBlueprint → AboutTease → MarketStats → Guarantee → BookCall`

### Commits in session 12 (chronological, abbreviated)

`72b9f20` editor contain fit · `e0e475f`+`eb54407`+`c44a2fe` BMV play/pill/captions iterations · `f5c25b1` zoom-out hero · `df616af` end-card v2 · `b10e8c4` PIF pricing · `9770520` parked-pause + below-header fit · `056bbc3` end-card MP4 · `0332a4a` mobile hero fit + roadmap spring · `4a4f55e` hero particles re-enabled · `cddc204` particle count tuning · `b7b1a1e` how-it-works MP4 · `93c38ce` how-it-works SVG+JPG · `bc11c13`+`fab80e0` BMV wiring + thumbnail · `1307b5a` BMV vimeo wire · `d3fd929` FAQ + OfferStack ™+chip + reorder · `057d7b3` MVV panel + process steps · `1d7c2be` 3 voice lines · `82bfe25` per-section SpaceBg (rejected) · `faf0f0e` unified SpaceBackground · `aea0c00` star visibility bump.

---

## Session 13 — 2026-05-30 to 2026-06-02 — Tier ecosystem build-out, global polish + functional fixes, copy alignment passes

A very long arc (~30 commits). Built the full offer-page ecosystem (Tier 01–04 + Event Media), shipped global polish + functional fixes, removed the blog, and ran multiple copy/UX alignment passes across every page. Site is now feature-complete on the offer side; remaining work is content (real Calendly URL, real social handles, testimonials, blog content if it comes back).

### Arc 1 — Polish pass (commits `85ae4cf`, `19d1b0e`)

Site-wide interactive polish, opt-in via classes / data-attrs so nothing changes on components that aren't tagged:

- **`.card-trace`** — animated clockwise conic-gradient border on hover, `@property --trace-angle`. `--trace-color` overridable per card so each row of cards reads as distinct ideas.
- **`.card-inner-glow`** — paired soft inset glow.
- **`[data-icon-pop]`** — pop-in entry for icons inside `[data-reveal]` containers (scale + opacity).
- **`[data-title-underline]`** — blue line draws under a heading on reveal.
- **`.stat-underline`** — blue line draws under each stat once its counter finishes (`.is-counted` on parent `.stat`).
- **`[data-shimmer]`** — one-time diagonal light sweep on reveal.
- **`[data-surface-shimmer]`** — slow continuous wash across a card surface.

Applied to: SolutionUSP pillars, ProblemSection pain cards, FAQ (springy chevron + blue accent line on open + question-hover color), WhyBlueprint (per-card colour identity — blue / orange / purple / cyan / white via `--trace-color`), MarketStats (counter completion → underline + label fade-up), Guarantee (later replaced with the calmer breathing-glow effect — see arc 5), AboutTease portraits, /about Vision (left scroll-progress line + paragraph cascade), /about MVV cards (per-card trace/glow + surface shimmer), /about Founders (numbered counter from 0 — later reverted), /about Principles (alternating slide-in + per-card hover icon + surface shimmer), Parallax meter (later reverted to the original thin line), Footer (slide-L→R nav link underline + 9-particle floating row + per-social brand-colour hover glows).

**Polish revisions** (`19d1b0e`):
- Removed the iconPulse scale loop on `.card-trace:hover [data-icon-pop]` and the per-principle rotate / scale transforms. Hover now only changes filter (brightness + colour-matched drop-shadow glow). No movement on enter, no re-entry tween on leave.
- Founder number overlays: removed `data-counter` so 01 and 02 are static text. Bumped `.founder-num` z-index 0 → 2 so the numeral sits in front of the photo. Alpha 0.18 → 0.25 in later About batch.
- Parallax meter reverted to the original 2px line + solid bp-blue fill. Removed leading-edge glow dot, gradient fill, `%` counter span, and the `@property --m-pct` machinery.

### Arc 2 — Drop the 7th pain card (commit `5f5007f`)

"I feel like I'm behind other artists." removed from ProblemSection — the only one without a concrete hook to a Blueprint deliverable. The orphan `.pain:nth-child(7) { grid-column: 1 / -1 }` rule deleted; the 6-card layout drops cleanly into 3×2 desktop / 2×3 tablet / 1×6 mobile.

### Arc 3 — Tier ecosystem build-out (commits `15ff00a`, `a570a08`, `288c085`, `c754c82`)

**Step 1 — Tier 01 architecture + first implementation (`15ff00a`):**
- `src/data/tiers.ts` — typed `Tier` record. Centralised so page components stay structural.
- `src/pages/tiers/[slug].astro` — dynamic route + `getStaticPaths`. `heroBgs` map lives **inside** `getStaticPaths` because Astro evaluates that function in its own scope at build time.
- `src/components/tiers/TierPage.astro` — composer: Hero → WhoFor → WhatYouGet → Roadmap → Why → AddOns → FAQ → BookCall.
- `TierHero / TierWhoFor / TierWhatYouGet / TierRoadmap / TierWhy / TierAddOns` — generic sections.
- Refactored `FAQ.astro` to accept `faqs / eyebrow / headline / lede / footnote / showFootnote / showBtsImage` props with the original homepage data as defaults — backwards-compatible.

**Step 2 — Refactor to focused conversion pacing (`a570a08`):**
- Hero shrunk `clamp(620–900px)` → `clamp(440–620px)`; padding 5rem → 3rem.
- Added 5 quick-value pills to hero data schema.
- Dropped `TierWhy.astro` from composer (component file kept on disk for future).
- Section padding tightened 5rem → 4rem; head margin-bottom 3rem → 2.25rem.

**Step 3 — Hero split LEFT/RIGHT + custom HUD background (`288c085`):**
- Full rewrite. Photo bg replaced with inline SVG HUD (corner brackets, orbital arcs, radar circle, edge ticks, sparse dots, bottom horizon line) + CSS gradient layers (deep-space base + magenta nebula glow bottom-right + blueprint grid).
- Big outlined "TIER + number" marker top-left (later moved top-right in arc 8).
- Split layout: info stack LEFT, premium offer card RIGHT.
- Typography restraint pass — H1 clamp(1.55rem, 2.7vw, 2.25rem) (was clamp(2rem, 4.4vw, 3.5rem)).
- Eyebrow rewritten "Tier 01 — Growth Blueprint Session™" → "Strategy & Foundation" so it doesn't duplicate H1.

**Step 4 — Tier 02/03/04 + Event Media + global wiring + Blog removal (`c754c82`):**
- Tier 02 (Content Engine Starter™), Tier 03 (Fan Growth Engine™), Tier 04 (Artist Growth Infrastructure™) fully populated in data.
- `src/data/event-media.ts` + `src/pages/event-media.astro` — Event Media built by composing the same tier components with event-media-specific copy. Sections: Hero → WhatWeCapture (TierWhoFor with different data) → CoverageFormats (TierWhatYouGet) → DeliverableExamples (TierWhatYouGet) → Workflow (TierRoadmap) → WhoFor (TierWhoFor) → FAQ → BookCall.
- **Component refactor** — TierWhoFor / TierWhatYouGet / TierRoadmap props simplified from `{ tier }` to direct section fields (`{ eyebrow, headline, cards, id? }` etc.) so Event Media can reuse them with different data shapes.
- **Linking** — OfferStack tier CTAs route to `/tiers/<slug>`; Portfolio hero gets new "Request Event Coverage" CTA → `/event-media`; cross-tier "Next Step" cards link to the next tier page.
- **Blog removed** — `src/pages/blog.astro` deleted; Header + Footer nav stripped of blog references.

### Arc 4 — Global functional fixes (commits `269a9c7`, `5021f25`)

- **`src/config/cta.ts`** — single source of truth for CTAs. Exports `CALENDLY_URL`, `INSTAGRAM_URL`, `TIKTOK_URL`, `YOUTUBE_URL`, `X_URL`, `CONTACT_EMAIL`. Every booking CTA across the site imports `CALENDLY_URL`. Original `[…-URL]` placeholders. **`CONTACT_EMAIL` is now `info@bpmktg.com`** (updated in About batch).
- **SpaceBackground** canvas marked `transition:persist="space-bg"` so it survives view transitions instead of being torn down + re-created on every navigation. Eliminated the rAF re-init churn that was the likely "slows down after a few minutes" cause.
- **Custom cursor** — created with `data-astro-transition-persist="bp-cursor"` → DOM survives swap. State (`tx/ty/x/y`) cached on `window` before swap and restored on init so the cursor doesn't snap to (-100, -100). Lerp factor `0.28 → 0.55` for snappier trackpad response. Hidden-tab guard inside `tick()`.
- **Mobile nav rebuild** — full-screen overlay using `100dvh` (svh fallback), prominent X close button (44px hit target, blue accent ring, rotates on hover), centred link stack at `clamp(1.6rem, 5.5vw, 2.2rem)` with left-side bullets, slide-into-padding hover, soft blue glow + grid overlay backdrop. Closes on X / link / Escape / backdrop tap / `astro:before-swap`.
- **`initMediaLoading()` in motion.client.ts** — images only (NOT videos — they have their own hover-driven opacity lifecycle). Tags only NOT-yet-loaded `<img>` with `data-mx-loading`; CSS rule fades in on `load` / `error`. Already-decoded media untouched. Makes slow first-visit loads feel graceful instead of broken. Video tagging was tried and reverted (`5021f25`) because it was overriding the hover-preview videos' default `opacity: 0`.
- **Header / Footer** — Event Media removed from Header nav; only reachable from Portfolio hero CTA. Footer Site col also removed Event Media at this point (later moved into Footer Tiers col in arc 7).

### Arc 5 — Copy / UX batches

**Batch 2 — homepage + about + footer (`2afd756`):**
- Hero CTA copy unified to "Book a Strategy Call" across Hero / Header / Footer / BookCall / BrandMessage.
- Hero stats source attribution: "Sources: IMS Business Report 2025 · Chartmetric 2025 · Luminate 2024" at 0.68rem / 0.4 opacity.
- Parallax headline "The growth system behind the artists everyone's watching" → "In the rooms where it happens."
- SolutionUSP: "We don't manage your content" → "We don't just manage your content."
- WhyBlueprint cards 1, 4, 5 rewritten (later card 4 changed again to introduce Blueprint Preferred™ name).
- AboutTease copy "a photographer and an editor" → "2 friends"; portraits now open in an in-section `<dialog>` lightbox instead of linking to /about.
- **Guarantee shimmer replaced with calm breathing glow** — `var(--bp-orange)` colour + pulsing text-shadow 8px → 22px over 3s ease-in-out infinite on the "30 days" span. No movement.
- FAQ subheading "…over a coffee" → "…over a coffee or joint. Whichever you're into."; first item opens by default; **accordion mode** (only one open at a time, listens to native `toggle` events on `<details>` inside `[data-faq-list]`); footnote restyled as centred body line with bp-blue underlined link.
- **FAQ BTS pic** — added via `showBtsImage` prop. After two layout iterations, final placement is **LEFT column (5fr image / 7fr questions) with `align-items: center`** so the image vertically centres against the question list. Stacks above the list at ≤900px. Subtle blue light-leak overlay. Image is `src/assets/images/about-us/mason-bts.jpg`. Homepage uses `<FAQ showBtsImage={true} />`; tier + event-media pages stay false.
- About hero copy "Built by photographers and editors" → "Built by two friends"; bg swapped to `carousel-wooliees-silo.jpg`.
- About MVV H2 dropped "In our own words."
- Founder big 01 / 02 numbers alpha 0.18 → 0.25 (color + text-shadow).
- Mobile creed pill stacks: switched to `flex-direction: column` at ≤760px after the wrap approach didn't reliably stack.
- Footer: Tier 02/03/04 + Event Media all in the Tiers col (Event Media moved here from Site col); social URLs reference config constants; mobile (≤480px) swaps stacked icon mark for horizontal wordmark logo.

**About batch (`454f821`):**
- Mason bio updated with "more than a decade of content creation" phrasing + "leads vision, client strategy, and every growth system that powers Blueprint's partnerships."
- Clayton bio rewritten to explicitly name CRM systems, automation workflows, reporting dashboards, operational infrastructure. Role: "Co-Founder & CTO — Systems, Automation & Operations". **Every reference to editing/content production removed.**
- About hero mobile: added `@media (max-width: 600px)` block — `.hero-inner` padding 5rem 1.5rem → 4rem 1.25rem; h1 `clamp(1.75rem, 8vw, 2.4rem)` with `max-width: 18ch`; tagline `0.92rem`; lede `1rem`. Plus `overflow-wrap: break-word` defenses.
- `CONTACT_EMAIL` finalized to `info@bpmktg.com`. Updated `BookCall.astro` to import + render `CONTACT_EMAIL` (the hardcoded `hello@blueprintmkt.com` was removed).

**Tier alignment batch (`79a2043`) — biggest tier copy revision:**
- Added optional `pif?: { amount, save }` to `Tier.hero` (Tier 01: $1,000 credit toward Tier 02, T02: $2,500/$500, T03: $15,000/$3,000). Renders below the price block in the offer card as "or {amount} paid-in-full · saves {save}" with bp-light strong + orange em.
- Added optional `addOns.featured?: { eyebrow, title, body, bullets?, ctaLabel, ctaHref }` for a larger glass card rendered above the smaller items grid. Used by Tier 02 + Tier 03 to feature Event Media as an add-on (orange-bordered glass treatment).
- TierWhoFor headline rendered as HTML (`set:html`) so each tier's Who-It's-For headline carries an orange `<span class="highlight">` accent word.
- TierHero watermark stroke alpha 0.55 → 0.22 — recedes behind the H1.
- `.tier-offer-highlights` grid → `repeat(2, minmax(0, 1fr))` + `min-width: 0` + `overflow-wrap: break-word` on each `<li>`. Fixes T01 "7-10 day turnaround" and T03 "brand positioning" hanging off the card.
- **Blueprint Preferred™** introduced as the network name. WhyBlueprint card 4: "National creator network" → "Blueprint Preferred™". Tier 04 deliverables call out Blueprint Preferred™ on show-day capture + creator network access.
- Tier 02 hero sub rewritten to drop the Tier 01 prerequisite implication: "The plug-and-play content system for artists who are ready to show up consistently and start building real momentum."
- Tier 04 price: `$5,000+ → "Starting at $5,000"` and PIF dropped — **THEN immediately reverted** to `$10,000` + PIF `$50,000 / saves $10,000` (`2ef55b9`) per user follow-up.
- Event Media: all delivery refs switched from "Same-week" to **48-hour delivery** (sub, pills, offerHighlights, workflow steps, FAQ q1). "B-stage" → "backstage" everywhere; workflow step 5 no longer mentions raws; whoFor card 3 Wicked Oaks → Electric Forest.

**Tier consolidation batch (`1daf269`, `6261c11`) — final pass for the moment:**
- **Hero background flip** per user reference: `.tier-hud-marker` left → right (top-right corner); SVG radar group `translate(1280, 290)` → `translate(320, 290)` (now on the left); orbital arcs `cx=-180` → `cx=1780` (sweeping from bottom-right). Layout: radar + orbits frame left/bottom, marker chrome sits top-right where it no longer overlaps the H1.
- **Title paren cleanup** across every "What You Get" card on Tier 01-04. Parenthetical details moved into the body where they read instead of shouting in caps. E.g. "SHOW-DAY CAPTURE FOR SELECT EVENTS (OR COORDINATED VIA BLUEPRINT PREFERRED™ CREATOR NETWORK)" → title "Show-day capture via Blueprint Preferred™".
- **Tier 03 price** $2,000+ → **$3,000**. PIF $15,000 / saves $3,000 stays consistent.
- **Tier 03 What You Get consolidated 16 → 10 cards** (merged performance/iteration beats, reporting + strategy call, trend alignment + format deployment + editing, show + release planning). **NEW "Posting management + scheduling" card added to deliverables** (was in add-ons). Add-on slot replaced with **"Custom release / campaign page" at +$750 one-time**.
- **Tier 04 What You Get consolidated 32 → 14 cards** (3 release/show campaigns → 1; 3 fan-funnel → 1; 3 paid amp → 1; 4 brand identity → 1; 5 tracking/trends → 1; 4 Blueprint Preferred / regional → 1). NEW "Posting + scheduling management" card explicitly added.
- **Section headline accent system** — TierWhatYouGet / TierRoadmap / TierAddOns h2s switched to `set:html` so each section headline can carry a coloured accent span. **Then scaled back** (`6261c11`) per user feedback: accents now only on Hero + Who It's For + FAQ — the descriptive middle sections (whatYouGet / howItWorks / addOns / Event Media coverage sections) all read clean in white. Color punctuates rather than chatters.

### Arc 6 — Functional fix batch (commit `5a9600a`)

- **Carousel edge-hover scroll** — fixed glitchy stop (clears `edgeDir` AND `edgeSpeed` before `cancelAnimationFrame`, defers `scroll-snap` restore 80ms so the rail lands softly). **Added progressive speed**: `pointermove` measures distance to outer edge and maps through `t * t` ease-in from `MIN_SPEED 1.2 px/frame` at 90px in → `MAX_SPEED 9 px/frame` at 0px. `pointercancel` handled.
- **OfferStack Tier 01 price alignment** — rendered same-class `.price-pif--spacer` (with `&nbsp;`, aria-hidden) for tiers without PIF, reserves the same vertical height across all four cards.
- **MarketStats counter reliability** — `initCounters` IO threshold `0.5 → 0.25` with `rootMargin: '0px 0px -5% 0px'`. The 0.5 threshold meant bottom-row stats sometimes never reached 50% visibility. Lower threshold = every stat fires reliably.
- **Compositor hints on MarketStats `.bg`** — `will-change: transform`, `transform: translateZ(0)`, `backface-visibility: hidden`. Stops parallax/scale/Ken Burns from fighting AboutTease transforms during scroll-between.
- **Hero white-lines bug** — `.hero-video` got `background: #060614` + `transform: translateZ(0)` + `backface-visibility: hidden`. Dark bg covers any sub-pixel rounding gap at the video's bottom edge once the cinematic zoom-out lands.
- **BookCall process equal widths** — `grid-template-columns: repeat(5, minmax(0, 1fr))` + `min-width: 0` + `overflow-wrap: break-word` on each `.process-step`. Same fix on the 2-col mobile breakpoint.
- **BookCall mobile particles full-section** — `initCtaParticles` now sets `--rise` on the host to `${host.offsetHeight + 100}px`, re-measured on resize. `ctaFloat` keyframe uses `translateY(calc(-1 * var(--rise, 110vh)))`. Replaces the fixed `-110vh` that cropped particles halfway up tall mobile sections.
- **BookCall card width second pass (`2a65a4b`)** — `.process` moved out of `.content` in markup so the 5-col grid no longer inherits `.content`'s `max-width: 720px`. Now uses container's full width up to 1040px. Fixes "Discovery + audit" wrapping awkwardly.

### Arc 7 — Portfolio fixes (commit `91d1b8e`)

- **Access cards rounded-corner flicker** — `.feat-card .img-wrap` and its inner `<img>` got `transform: translateZ(0)`, `backface-visibility: hidden`, `isolation: isolate`, `will-change: transform`. Pins the rounded-corner clip to its own layer so Chrome stops dropping the radius mid-hover.
- **Lightbox arrows** — added prev/next `.lightbox-arrow.lightbox-prev / .lightbox-next` circular glass chips, blue accent border, fixed vertical-centred. Mobile bumps to 44px and pulls into edges.
- **Navigation order** — `openers` built once from `document.querySelectorAll('[data-lightbox-open]')` in DOM order. Access cards (5) → gallery tiles (54). Continuous wrap at both ends.
- **Keyboard** — ArrowLeft / ArrowRight while dialog open. **Touch swipe** — `pointerdown` captures clientX on touch only, `pointerup` measures delta; >50px navigates (left → next, right → prev); smaller deltas ignored as taps.
- **Mobile Load More** — tiles with index ≥ 20 get `data-mobile-deferred`. At ≤760px, CSS hides those until `.is-expanded` flips on `.masonry`. New `.load-more-wrap` with "Load More +N photos" button below the grid (only ≤760px). Tap adds `.is-expanded` + hides button. **Deferred tiles are still in the DOM** so they're already in `openers` — arrow/swipe nav works through all 59 photos even before tapping Load More.

### Decisions worth remembering for next session

1. **Color punctuates, doesn't chatter.** Final accent policy: Hero + Who It's For + FAQ headlines get colored span. Every other section headline reads plain white. Same on Event Media. If you add new sections, default to white; only accent if there's a real emphasis reason.
2. **`CONTACT_EMAIL` and `CALENDLY_URL` live in `src/config/cta.ts`.** Every CTA imports them. `[INSTAGRAM-URL] / [TIKTOK-URL] / [YOUTUBE-URL] / [X-URL]` placeholders still need real values. **Real Calendly URL still pending.**
3. **Tier 04 stays at $10,000.** It was flipped to $5,000 then immediately flipped back. Future me: don't move it without the user explicitly asking.
4. **Tier 03 is now $3,000.** PIF $15,000 / saves $3,000.
5. **PIF schema**: `Tier.hero.pif?: { amount, save }`. T01 has the upgrade-credit pattern (`'$1,000 credit'` / `'toward Tier 02 within 30 days'`); T02/T03 have real PIF; T04 has standard 6-month-PIF math.
6. **Featured add-on schema**: `Tier.addOns.featured?: { eyebrow, title, body, bullets?, ctaLabel, ctaHref }`. T02 + T03 use it to feature Event Media. Orange-bordered glass card rendered above the smaller items grid.
7. **`TierWhy.astro` is on disk but unused.** Composer doesn't import it. If a future premium tier wants a manifesto block, it's the existing component to reach for.
8. **Tier hero layout is now LEFT info / RIGHT offer card; HUD marker top-RIGHT; radar LEFT.** Per user reference image. Don't undo unless asked.
9. **FAQ BTS pic** — `showBtsImage={true}` is on the homepage only. Image is `src/assets/images/about-us/mason-bts.jpg`. LEFT column (5fr / 7fr split with `align-items: center`).
10. **Section headlines all use `set:html`** in TierWhoFor / TierWhatYouGet / TierRoadmap / TierAddOns and the Event Media equivalents (same components). FAQ headline already supported HTML.
11. **Cursor + SpaceBackground both use `data-astro-transition-persist`** — they survive view transitions. The cursor also caches its position state on `window` so it doesn't snap on navigation. Lerp is 0.55 (was 0.28).
12. **Image loading fade-in is image-only.** `initMediaLoading()` skips `<video>` because hover-preview videos have their own opacity lifecycle. Don't add videos back without testing FilmTile / BrandMessage hover state.
13. **Blueprint Preferred™** is the official name for the creator network. Used in: WhyBlueprint card 4, Tier 04 deliverables. Don't call it "creator network" alone — always with the trademark.
14. **Tier deliverable counts after consolidation**: T01 = 6, T02 = 7, T03 = 10 (was 16), T04 = 14 (was 32). T03 + T04 both explicitly include Posting Management in deliverables.

### What's still queued (carryover for next session)

1. **Real Calendly URL** — replace `[CALENDLY-URL]` in `src/config/cta.ts`. Single change, every CTA picks it up.
2. **Real social handles** — replace `[INSTAGRAM-URL] / [TIKTOK-URL] / [YOUTUBE-URL] / [X-URL]` in the same file.
3. **Artist testimonials** — content-gated, still deferred.
4. **Blog** — fully removed from the site. Re-add (new design / new route) if/when content is ready.
5. **Mobile testing** — site has been responsively tightened across multiple batches but no one has done a full device sweep. Especially: tier hero offer-card on narrow phones, FAQ BTS stacking, BookCall process steps at <600px, About founder rows.
6. **Cinematic hero** — unchanged this session. Math constants + persistence behavior all still as documented in Session 12.

### Final route map

- `/` — homepage (Hero → Marquee → Problem → BrandMessage → Parallax → Solution → Roadmap → Carousel → OfferStack → FAQ → WhyBlueprint → AboutTease → MarketStats → Guarantee → BookCall)
- `/about` — Hero → Vision → MVV → Founders → Principles → BookCall
- `/portfolio` — Hero (with Event Coverage CTA) → Access → OnFilm → Gallery (54 tiles with lightbox + mobile Load More) → BookCall
- `/event-media` — Hero (HUD bg, "LV" marker) → WhatWeCapture → CoverageFormats → DeliverableExamples → Workflow → WhoFor → FAQ → BookCall
- `/tiers/tier-01` through `/tiers/tier-04` — all on the same `[slug].astro` dynamic route, all composed by `TierPage.astro`

### Commits in session 13 (chronological, abbreviated)

`85ae4cf` polish pass · `19d1b0e` polish revisions · `5f5007f` drop 7th pain card · `15ff00a` tier architecture + Tier 01 · `a570a08` tier pages refactor to focused pacing · `288c085` Tier 01 hero LEFT/RIGHT + HUD bg · `c754c82` Tier 02/03/04 + Event Media + Blog removal · `269a9c7` global fixes (cursor, mobile nav, CALENDLY_URL, media fade, transition:persist) · `5021f25` exclude videos from media fade · `50fe3e9` mason-bts.jpg added (user, PC) · `2afd756` Batch 2 (homepage + about + footer) · `db6271d` FAQ BTS centred against header + accordion · `5a9600a` carousel edge-scroll, offer alignment, market stats, hero white lines, book-call · `91d1b8e` portfolio lightbox arrows + swipe + load more · `454f821` About bios + mobile hero + creed + email finalised · `79a2043` Tier + Event Media alignment (Blueprint Preferred™, PIF, featured add-on, watermark) · `2ef55b9` Tier 04 revert to $10,000 · `2a65a4b` BookCall card width second pass · `1daf269` hero layout flip + Tier 3 = $3,000 + deliverable consolidation + paren cleanup + section accents · `6261c11` scale back headline accents.

---

## Laptop handoff checklist

Last-known good state: commit on `main` after this session is pushed. To continue on laptop:

```bash
gh repo clone BPMKTG/BPMKTG-Website
cd BPMKTG-Website
npm ci          # respects package-lock.json -> Astro 6.3.3
npm run dev     # http://localhost:4321
```

Then in Claude on the laptop, first message:

> *"Continuing on BPMKTG-Website. Read `docs/SESSION_LOG.md` and `docs/CONTENT_BRIEF.md` first."*

Memory rule **"always push directly to main"** lives at `~/.claude/projects/C--Users-Mason-Documents-Claude-BPMKTG-Website/memory/feedback_git_workflow.md` on this PC — it's local-only and won't transfer. Either copy that file over to the equivalent path on the laptop, OR add the rule to the first laptop message: *"Always push directly to main on this repo, no PR/branch flow."*

---

## ⚠️ OPEN BUG — Portfolio lightbox "glitch" after playing a video (UNRESOLVED)

**Symptom (real Chrome, deployed `bpmktg-website.pages.dev`, desktop):** On `/portfolio`, after **playing a video in the On Film lightbox** and then opening a **photo** in the gallery lightbox, the site "glitches": the lightbox photo shows its **caption but a black/empty image**, **already-loaded gallery images turn into empty dark placeholders**, and **internal navigation dies** (header/footer/logo/CTA links to other pages do nothing). What KEEPS working: hover-video previews, opening videos in lightbox, external Calendly links (`target="_blank"`), scrolling. The page is **not frozen** (main thread alive) — it's images + nav that break. Hard refresh recovers it. It's **progressive**: the more images that have decoded (the further you've scrolled), the sooner it trips. Latest report: it still happens specifically **after a video has been played** in the lightbox, even with all fixes below.

**Diagnosis so far = GPU / decoded-image-texture memory exhaustion.** Chrome evicts/fails image textures under memory pressure (images render black) while text + the separate video decoder keep working. The Vimeo iframe (video player) is a big memory spike; playing one then decoding a photo tips it over.

**What was already tried (all committed to `main`, all verified mechanically in the headless preview but NOT reproducible there — the offscreen preview pauses rAF/compositor and can't reproduce real GPU pressure):**
1. `abece9a` — full lifecycle refactor: every component script (Carousel, OnFilm, Parallax, ArtistMarquee, BrandMessage, AboutTease, Header, portfolio lightbox) now inits on `astro:page-load` + re-inits, and tears down on `astro:before-swap` via one `AbortController` + tracked rAF/interval/IO. Canvas paint loops skip drawing while `dialog[open]`. Removed conflicting global `initLightboxArrows`. Global before-swap net closes dialogs + clears body/html locks. **Did NOT fix the freeze.**
2. `7754a5f` — SpaceBackground canvas (transition:persist) hard-stops its rAF on before-swap, restarts on page-load (so it doesn't paint while a view transition moves/animates it). View-transition watchdog (3s → hard nav). **Got further but still broke.**
3. `22d8fa6` — **Removed `<ClientRouter />` (Astro view transitions) entirely** from `Layout.astro`. Navigation is now full page load. This fixed all the cross-page failures. Lightbox img also opted out of the `img[data-mx-loading]{opacity:0}` fade system (force opacity:1) so a missed load can't hide it. **User confirmed "got a lot further" but it STILL glitches after heavy use.**
4. `22787f7` — Memory reduction: gallery `.tile` got `content-visibility:auto` + `contain-intrinsic-size:auto 360px` (frees off-screen image decode; masonry layout verified stable — fixed grid-auto-rows so no collapse). Lightbox source `getImage` width **1800→1440**. SpaceBackground canvas DPR cap **2→1.5**. **User: "i think we fixed it!" then later it broke again specifically video→photo.**
5. `a93ef70` — Replaced all four lightbox `::backdrop` `backdrop-filter: blur()` (full-viewport GPU filter) with solid dark overlays (~0.95–0.97 opacity, near-identical look). Photo & video lightboxes now **mutually exclusive**: opening a photo tears down the video `<iframe>` (frees video memory) + closes the video dialog; opening a video closes the photo dialog. **STILL glitches after playing a video.** ← current state

**Key files:**
- Photo lightbox: inline `<script>` in `src/pages/portfolio.astro` (initLightbox, lbCleanup). `lightboxOf()` width=1440 at top. Gallery `<Image width={800}>`, Access `<Image width={900}>`.
- Video lightbox: inline `<script>` in `src/components/OnFilm.astro` (openVideoLightbox/closeVideoLightbox; iframe is `frame.innerHTML=...`/`''`).
- SpaceBackground canvas: `src/components/SpaceBackground.astro` (transition:persist, dpr cap 1.5, dialog-gated paint).
- Custom cursor + global net + watchdog + counters/reveal/etc: `src/scripts/motion.client.ts`.
- Image fade CSS `img[data-mx-loading]`: `src/styles/global.css` ~line 1089. Custom-cursor hide-native rule ~line 376.

**NEXT STEPS to try (in a real browser — must reproduce + profile, the headless preview CANNOT):**
- **Profile GPU/memory in real Chrome**: DevTools → Performance/Memory + `chrome://gpu`, watch "GPU memory" while doing video→photo. Confirm texture exhaustion vs. a true leak.
- The Vimeo iframe may not release GPU memory immediately on `innerHTML=''`. Try: on video close, also set the iframe `src=''` before removing, and/or wait a frame. Consider `dnt=1` already set.
- Lower image memory further: gallery tile `width={800}→640`, Access `width={900}→700`, lightbox `1440→1200`. Add `content-visibility:auto` to On Film `.film-tile` + Access `.feat-card` too.
- Consider NOT loading the full Vimeo player — use a lightweight facade (poster + play → only load iframe on explicit play), or `loading="lazy"` iframe, or limit to one iframe ever.
- Check if the SpaceBackground canvas (still full-screen, persistent) can be made smaller or paused harder on the portfolio page specifically.
- Verify there's no real JS leak: after the glitch, in console check `performance.memory`, count `<img>` with decoded data, `document.querySelectorAll('iframe').length`, any `dialog[open]`.

**Reproduction recipe (give to next session):** Load `/portfolio` fresh → scroll most of the gallery → play a video in On Film lightbox → close → open a gallery photo. Observe black image + dead nav.

---

*Add a new section above this line each session. Keep entries short and decision-focused — this is a context primer, not a changelog (use `git log` for that).*
