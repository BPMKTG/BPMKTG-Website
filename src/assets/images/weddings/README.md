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

Astro re-encodes everything to WebP at build time, so don't pre-compress
for quality. **But do downscale for size.**

### Downscale before committing. This matters.

Camera originals do not belong in git. The engagement and proposal sets
arrived as 39 files totalling **720 MB** (4000x6000 to 4672x7008, up to
47 MB each) and went in at **21.5 MB** after a resize to 2400px on the long
edge at quality 88, with zero visible loss: the gallery renders at 1100px
and the lightbox at 1800px, so nothing above 2400px is ever seen.

Committing the originals would have put 720 MB in git history permanently
and made Cloudflare re-encode all of it on every build.

```bash
# From the repo root. Resizes in place, keeps EXIF orientation.
node -e "
const sharp=require('sharp'),fs=require('fs'),p=require('path');
const d='src/assets/images/weddings/gallery';
(async()=>{for(const f of fs.readdirSync(d).filter(f=>/\.jpe?g\$/i.test(f))){
  const i=p.join(d,f), t=i+'.tmp.jpg';
  await sharp(i).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true})
    .jpeg({quality:88,mozjpeg:true}).toFile(t);
  fs.renameSync(t,i);
}})();"
```

Keep the full-resolution originals somewhere outside the repo.

## Video

Film tiles play through Vimeo. Add the numeric id as `vimeoId` in
`src/data/weddings.ts` and the tile becomes clickable; without one it
shows a "Coming soon" state and stays inert.

Optional hover previews are short muted mp4s in
`public/videos/previews/`, referenced by the `preview` field — same
convention as the EDM portfolio tiles.
