/* ──────────────────────────────────────────────────────────────
   A preview picture, shown only when all of it has arrived.

   Handing a browser an address (`img.src = ...`) leaves the download
   to the browser, and a browser paints a picture as it comes in. On a
   phone a download sometimes stops part way: the connection is still
   open, nothing more arrives, and nothing says so. The page is left
   showing the top of the photo over a black box, for good. It is not
   an error, so nothing tries again; closing the card and opening it
   starts a new download, which is why it "fixed itself".

   So the page fetches the bytes itself, where it can see what is
   happening:

     a download that goes quiet        given up on, and started again
     one that ends early or is cut     started again
     one that comes back whole         decoded, and only then shown

   and a picture that could not be had after a few tries says so and
   offers another go, instead of sitting there half drawn.

   The address is the same one, behind the same sign-in, and the
   browser's own cache still answers the second time a slide is
   opened. The service worker is not involved: it does not answer for
   a preview, whoever asks.
   ────────────────────────────────────────────────────────────── */

/** How long a download may go without a single byte arriving before
 *  it is taken to have stopped. */
export const PICTURE_IDLE_MS = 8000;
/** How many times a picture is asked for before the page says it
 *  could not be loaded. */
export const PICTURE_TRIES = 3;

export type Whole =
  | { ok: true; blob: Blob }
  /** `gone`: the server says there is no such file (or not for this
   *  person). Asking again will not change that; the preview itself
   *  needs looking at. Otherwise it was the connection. */
  | { ok: false; gone: boolean };

interface WholeOptions {
  tries?: number;
  idleMs?: number;
  /** Between tries, so three failures are not three in one second. */
  pause?: (attempt: number) => Promise<void>;
}

const rest = (attempt: number): Promise<void> => new Promise((r) => setTimeout(r, 400 * attempt));

/**
 * One download of `url`, to the end. Null when it stopped, was cut,
 * or came back a different length than it said it would be.
 */
async function once(url: string, fresh: boolean, idleMs: number): Promise<Whole | null> {
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Wound up again every time something arrives. A slow download is
  // left alone; a silent one is not.
  const wind = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => ctl.abort(), idleMs);
  };
  try {
    wind();
    const res = await fetch(url, {
      credentials: 'same-origin',
      // After a bad download, not whatever the browser kept of it.
      cache: fresh ? 'reload' : 'default',
      signal: ctl.signal,
    });
    if (res.status === 404 || res.status === 403 || res.status === 401 || res.status === 410) return { ok: false, gone: true };
    if (!res.ok) return null;
    const said = Number(res.headers.get('Content-Length'));
    const type = res.headers.get('Content-Type') || 'image/jpeg';

    let blob: Blob;
    const reader = res.body?.getReader?.();
    if (reader) {
      const parts: Uint8Array[] = [];
      for (;;) {
        wind();
        const { done, value } = await reader.read();
        if (done) break;
        if (value) parts.push(value);
      }
      blob = new Blob(parts as BlobPart[], { type });
    } else {
      blob = await res.blob();
    }
    if (!blob.size) return null;
    // The server says how long every preview is. Shorter is not it.
    if (Number.isFinite(said) && said > 0 && blob.size !== said) return null;
    return { ok: true, blob };
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** The whole of a picture, asked for until it comes or it is clear it
 *  will not. Never throws. */
export async function wholePicture(url: string, opts: WholeOptions = {}): Promise<Whole> {
  const tries = opts.tries ?? PICTURE_TRIES;
  const idleMs = opts.idleMs ?? PICTURE_IDLE_MS;
  const pause = opts.pause ?? rest;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    if (attempt) await pause(attempt);
    const got = await once(url, attempt > 0, idleMs);
    if (got) return got;
  }
  return { ok: false, gone: false };
}

export type Shown = 'shown' | 'gone' | 'failed';

/**
 * Put the picture at `url` into `img`, whole. Resolves when it is
 * decoded and ready to be put on the page, so the first thing anyone
 * sees is all of it. The caller decides what a 'gone' or a 'failed'
 * looks like.
 */
export async function showWhole(img: HTMLImageElement, url: string): Promise<Shown> {
  const got = await wholePicture(url);
  if (!got.ok) return got.gone ? 'gone' : 'failed';
  const address = URL.createObjectURL(got.blob);
  const drawn = await new Promise<boolean>((resolve) => {
    img.addEventListener('load', () => resolve(true), { once: true });
    img.addEventListener('error', () => resolve(false), { once: true });
    img.src = address;
  });
  if (drawn) {
    try { await img.decode(); } catch { /* it loaded; it will decode when it is painted */ }
  }
  // The picture holds its own bytes now. The address was only the
  // way to hand them over, and one left behind is memory never freed.
  URL.revokeObjectURL(address);
  // Whole, and still not a picture: said as a failure, since the
  // file is there and asking the server about it would find it so.
  return drawn ? 'shown' : 'failed';
}
