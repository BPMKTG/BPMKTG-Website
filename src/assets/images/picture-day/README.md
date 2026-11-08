# Picture day pose photos

These are the photos behind the Example Poses collage on `/picture-day`.
They are the real Rebelz team and individual frames, so they double as
the sample of what a parent is ordering.

## Adding or swapping one

1. Drop the file in here as `pose-NN.jpg` (`.jpeg` and `.png` work too).
2. Add a matching row to `poses` in `src/data/picture-day.ts`, with real
   alt text. A slug with no file renders a placeholder tile rather than
   collapsing the grid, and a file with no row is ignored.

**Read the note on `poses` before reordering.** The collage is three
columns wide and every tile is two rows tall, so a two-column team photo
takes two of the three slots in its band. The current sixteen fill six
bands exactly because the team photos sit at positions 1 and 10. Move
one and the last row goes ragged.

`focus` on a row sets `object-position` for that photo. The three frames
shot on the floor use `center bottom`, which keeps the athlete and the
team logo in the tile instead of cropping to the middle.

## Sizes

Astro resizes and converts to webp at build time and emits several
widths, so there is no need to shrink anything first. Around 2000px on
the long edge is the sweet spot: enough for the lightbox, small enough
that the repo stays reasonable. These sixteen come to about 4MB in all.
Full-resolution camera files (15MB+ each) will work but bloat the repo
permanently, since git keeps every version forever.

`pose-01` is also the link preview image for the page in texts and
iMessage, cropped to 1200x630. It should be a photo that reads at
thumbnail size, which is why it is a team shot.
