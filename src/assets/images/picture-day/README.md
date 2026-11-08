# Picture day photos

These are the photos behind the Example Poses section on `/picture-day`.
They are real frames from recent Blueprint shoots, so they double as the
sample of what a parent is ordering.

Not all of them are Rebelz. Sixteen are, and the rest come from an EV
Soccer team shoot and a UMHB cheer shoot, which carry those clubs' own
branding in the frame. That is deliberate and the section lede says so,
so the other logos read as a portfolio rather than as a mistake.

## The three groups

The filename prefix decides which group a photo lands in. Nothing else
reads the name, so renaming a file moves it between groups.

| Prefix        | Group on the page    | Frame | Grid                       |
| ------------- | -------------------- | ----- | -------------------------- |
| `team-`       | Example team shots   | 3:2   | 2 across, 1 on a phone     |
| `pose-`       | Individual poses     | 2:3   | 4 across, down to 2        |
| `buddy_pose-` | Buddy poses          | 2:3   | 4 across, down to 2        |

Team shots stack to one column below 620px on purpose. Two 3:2 frames
side by side at 375px put eleven athletes in about 165px, which is not
a photo any more.

## Adding or swapping one

1. Drop the file in here with the right prefix (`.jpg`, `.jpeg` and
   `.png` all work).
2. Add its slug to the matching list in `src/data/picture-day.ts`:
   `teamShots`, `individualPoses` or `buddyPoses`. The list holds plain
   filenames, nothing else. A slug with no file renders a placeholder
   tile rather than collapsing the grid, and a file with no slug is
   simply not shown.

Order inside a list is the order on the page, and the group counts in
the headings are computed, so nothing needs updating by hand.

There is no written description per photo, and nothing to write. Alt
text comes from the group (`Example buddy pose 4 of 17`), which is short
and always true; the first pass described each scene and was wrong often
enough to be worse than nothing. There is no `focus` field either: every
tile's `aspect-ratio` matches its photos, so `object-fit: cover` crops
nothing and there is no crop to steer.

## Sizes

Astro resizes and converts to webp at build time and emits several
widths, so there is no need to shrink anything for the page. Around
2000px on the long edge is the sweet spot: enough for the lightbox,
small enough that the repo stays reasonable. The current set is about
10MB in all. Full-resolution camera files (15MB+ each) will work but
bloat the repo permanently, since git keeps every version forever, so
downscale before committing.

`team-01` is also the link preview image for the page in texts and
iMessage, cropped to 1200x630, and it is the print shown in the hero.
It should be a photo that reads at thumbnail size, which is why it is a
team shot. The slug is `OG_POSE_SLUG` in the data file.
