# Wedding page assets

Everything here is wired by **filename → slug**, defined in
`src/data/weddings.ts`. Drop a file in with the matching name and the
page picks it up on the next build — no code change needed. Until then
each tile renders a designed placeholder instead of a broken image.

```
weddings/
  hero.jpg                  optional full-bleed hero background
  thumbnails/<slug>.jpg     film tile posters   (slug = WeddingFilm.slug)
  gallery/<slug>.jpg        photo gallery tiles (slug = WeddingPhoto.slug)
```

Gallery slugs carry their service line, because the gallery filters on it:
`wedding-01.jpg`, `engagement-01.jpg`, `proposal-01.jpg`. A filter tab
appears only once that category has at least one real image here, and the
whole tab bar stays hidden while only one category does, so you can add a
line one photo at a time without the page ever offering an empty tab.

**A file on its own is not enough.** Every gallery image needs a matching
entry in `galleryPhotos` (`src/data/weddings.ts`) carrying its caption,
tag, category, and tile shape. A file with no entry does not render.

`.jpg`, `.jpeg`, and `.png` are all picked up.

## Sizes

| Where | Aspect | Minimum |
|---|---|---|
| `hero.jpg` | wide landscape | 2400px wide |
| `thumbnails/*` with `orientation: 'h'` | 16:9 | 1600px wide |
| `thumbnails/*` with `orientation: 'v'` | 4:5 | 1200px wide |
| `gallery/*` with `orientation: 'h'` | square crop-safe | 1600px wide |
| `gallery/*` with `orientation: 'v'` | 3:4 crop-safe | 1400px wide |

Astro re-encodes everything to WebP at build time, so upload full-quality
originals — don't pre-compress.

## Video

Film tiles play through Vimeo. Add the numeric id as `vimeoId` in
`src/data/weddings.ts` and the tile becomes clickable; without one it
shows a "Coming soon" state and stays inert.

Optional hover previews are short muted mp4s in
`public/videos/previews/`, referenced by the `preview` field — same
convention as the EDM portfolio tiles.
