# Picture day pose photos

Drop the example poses in here and the collage on `/picture-day` builds
itself. Nothing else needs editing.

**Filenames:** `pose-01.jpg` … `pose-08.jpg` (`.jpeg` and `.png` work
too). The list, and the alt text that goes with each one, is in
`src/data/picture-day.ts` under `poses`.

A tile whose file is not here yet renders as a placeholder, and the
whole Example Poses section stays hidden until at least one real photo
exists, so the page never shows parents a wall of empty boxes.

`pose-01` also becomes the link preview image for the page in texts and
iMessage. Until it exists the preview is title and description only.

Shoot wide: Astro resizes and converts to webp at build time, so put the
full-resolution frames in rather than pre-cropped ones.
