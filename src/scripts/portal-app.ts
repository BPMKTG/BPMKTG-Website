/* ─────────────────────────────────────────────────
   The installed app, from the page's side.

   Four small things, used by the client's portal, by Blueprint HQ
   and by the sign-in screen:

     startServiceWorker   registers the one worker for /portal/, shows
                          "Updated, tap to refresh" when a new version
                          is waiting, and follows a tapped notification
                          to the thing it was about
     installCard          the one-time "add this to your home screen"
                          card in the client's portal
     notificationSheet    turn notifications on, and choose which kinds
     isInstalled          is this the home-screen app, or a browser tab

   Nothing here asks for a permission on its own. The browser is asked
   whether it may show notifications only after a tap on "Turn on
   notifications", and never when a page loads.
   ───────────────────────────────────────────────── */

import { el, icon } from './portal-dom';
import { openSheet } from './portal-sheet';

/* ── where are we ─────────────────────────────────────────────── */

/** Opened from the home screen, in its own window. */
export function isInstalled(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  } catch { /* an old browser: not installed, as far as we can tell */ }
  return (navigator as any).standalone === true;
}

/** An iPhone or an iPad. An iPad says it is a Mac, so touch points
 *  are what tell them apart. */
export function isIos(): boolean {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
}

const buildId = (): string => document.querySelector('meta[name="bp-build"]')?.getAttribute('content') || 'dev';

/* ── the service worker ───────────────────────────────────────── */

let REGISTRATION: ServiceWorkerRegistration | null = null;

/** A small bar at the bottom: a new version is ready. Its own element
 *  rather than the page's toast, because it has to stay until tapped
 *  and it is on the sign-in screen too, which has no toast. */
function showUpdateNotice(waiting: ServiceWorker): void {
  if (document.querySelector('[data-app-update]')) return;
  const bar = el('button', 'pt-app-update');
  bar.type = 'button';
  bar.dataset.appUpdate = '1';
  bar.append(el('span', undefined, 'Updated, tap to refresh'));
  bar.addEventListener('click', () => {
    bar.disabled = true;
    // The new worker takes over, and the page reloads when it has.
    waiting.postMessage({ type: 'SKIP_WAITING' });
  });
  document.body.appendChild(bar);
}

/**
 * Register the worker and listen for what it has to say.
 *
 * Safe to call on every page under /portal/. With no service worker
 * support the portal works exactly as it did, as a web page.
 */
export function startServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;

  // A tapped notification: the worker tells the open window where to
  // go. Inside the same page that is a change of hash, which the
  // page's own router follows.
  sw.addEventListener('message', (ev) => {
    const d = ev.data as { type?: string; url?: string } | null;
    if (!d || d.type !== 'bp-open' || typeof d.url !== 'string' || !d.url.startsWith('/portal/')) return;
    const to = new URL(d.url, location.origin);
    if (to.pathname.replace(/\/+$/, '') === location.pathname.replace(/\/+$/, '')) {
      if (to.hash && to.hash !== location.hash) location.hash = to.hash;
      else window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      location.assign(to.pathname + to.search + to.hash);
    }
  });

  // The new worker has taken over because someone tapped "refresh".
  let reloaded = false;
  let hadController = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    // The very first worker taking control of a page is not an update.
    if (!hadController) { hadController = true; return; }
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });

  const start = async () => {
    try {
      const reg = await sw.register(`/portal-sw.js?v=${encodeURIComponent(buildId())}`, { scope: '/portal/' });
      REGISTRATION = reg;
      // Already waiting from an earlier visit.
      if (reg.waiting && sw.controller) showUpdateNotice(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          // Installed while an older one is still in charge: that is
          // an update. Installed with nothing in charge is first use.
          if (next.state === 'installed' && sw.controller) showUpdateNotice(next);
        });
      });
    } catch (err) {
      console.warn('portal: the service worker did not register', err);
    }
  };
  if (document.readyState === 'complete') void start();
  else window.addEventListener('load', () => { void start(); }, { once: true });
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  if (REGISTRATION) return REGISTRATION;
  try { return (await navigator.serviceWorker.getRegistration('/portal/')) ?? null; } catch { return null; }
}

/* ── the install card ─────────────────────────────────────────── */

const DISMISSED = 'bp.app.install.dismissed';
let PROMPT: any = null;
const promptWaiters: Array<() => void> = [];

// Chrome and Android offer an install prompt by firing this. It is
// caught as early as possible, because it fires once, soon after the
// page loads, whether or not the card has been drawn yet.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    PROMPT = ev;
    for (const w of promptWaiters.splice(0)) w();
  });
}

function dismissed(): boolean {
  try { return localStorage.getItem(DISMISSED) === '1'; } catch { return false; }
}

/** The picture for an iPhone: the Share button, then the row to tap. */
function iosPicture(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 132');
  svg.setAttribute('class', 'pt-app-pic');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'The Share button at the bottom of Safari, then Add to Home Screen in the list that opens');
  svg.innerHTML = `
    <rect x="0.5" y="0.5" width="319" height="131" rx="14" fill="#fff" stroke="rgba(35,42,59,.14)"/>
    <g transform="translate(22 22)">
      <rect width="88" height="88" rx="16" fill="#eef4fa"/>
      <path d="M44 52V24m0 0-11 11m11-11 11 11" fill="none" stroke="#264fa0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 42h-4a4 4 0 0 0-4 4v18a4 4 0 0 0 4 4h36a4 4 0 0 0 4-4V46a4 4 0 0 0-4-4h-4" fill="none" stroke="#264fa0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <path d="M124 66h22m0 0-8-8m8 8-8 8" fill="none" stroke="#6c727f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(160 40)">
      <rect width="140" height="52" rx="12" fill="#eef4fa"/>
      <text x="14" y="23" font-family="-apple-system, Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="600" fill="#232a3b">Add to</text>
      <text x="14" y="40" font-family="-apple-system, Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="600" fill="#232a3b">Home Screen</text>
      <rect x="104" y="15" width="22" height="22" rx="6" fill="none" stroke="#264fa0" stroke-width="2.5"/>
      <path d="M115 21v10m-5-5h10" stroke="#264fa0" stroke-width="2.5" stroke-linecap="round"/>
    </g>`;
  return svg;
}

/**
 * The one-time card that says the portal can be put on a home screen.
 *
 * Null when there is nothing to offer: it is already installed, it
 * has been dismissed, or one of us is looking at a client's portal
 * (`admin`). On an iPhone it is instructions and a picture, because
 * an iPhone has no install button a page can press. Everywhere else
 * it is a button, and it only appears once the browser has said it
 * will install.
 */
export function installCard(opts: { admin: boolean }): HTMLElement | null {
  if (opts.admin || isInstalled() || dismissed()) return null;
  const ios = isIos();

  const card = el('aside', 'pt-app-card');
  card.dataset.appInstall = ios ? 'ios' : 'prompt';
  card.setAttribute('aria-label', 'Install Blueprint');
  const close = el('button', 'pt-app-x');
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss');
  close.appendChild(icon('close'));
  close.addEventListener('click', () => {
    try { localStorage.setItem(DISMISSED, '1'); } catch { /* private mode: it comes back next visit */ }
    card.remove();
  });

  const text = el('div', 'pt-app-text');
  text.appendChild(el('strong', undefined, 'Put Blueprint on your home screen'));

  if (ios) {
    text.appendChild(el('p', undefined, 'It opens like an app, and it can tell you when something needs your review.'));
    const steps = el('ol', 'pt-app-steps');
    steps.append(
      el('li', undefined, 'Tap the Share button at the bottom of Safari.'),
      el('li', undefined, 'Scroll down and tap Add to Home Screen.'),
      el('li', undefined, 'Tap Add.'),
    );
    text.appendChild(steps);
    card.append(close, text, iosPicture());
    return card;
  }

  text.appendChild(el('p', undefined, 'It opens like an app, and it can tell you when something needs your review.'));
  const go = el('button', 'pt-btn pt-btn-primary', 'Install') as HTMLButtonElement;
  go.type = 'button';
  go.addEventListener('click', async () => {
    if (!PROMPT) return;
    go.disabled = true;
    try {
      await PROMPT.prompt();
      await PROMPT.userChoice;
    } catch { /* closed without choosing */ }
    PROMPT = null;
    card.remove();
  });
  card.append(close, text, go);

  // Not shown until the browser has said it can install. A card with a
  // button that does nothing is worse than no card.
  if (!PROMPT) {
    card.hidden = true;
    promptWaiters.push(() => { if (!isInstalled() && !dismissed()) card.hidden = false; });
  }
  window.addEventListener('appinstalled', () => card.remove(), { once: true });
  return card;
}

/* ── notifications ────────────────────────────────────────────── */

interface Kind { id: string; label: string }
interface Info { ok: boolean; key: string | null; kinds: Kind[] }

function keyBytes(b64u: string): Uint8Array {
  const pad = b64u.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64u.length % 4)) % 4);
  const raw = atob(pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function send(url: string, body: Record<string, unknown>): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(url, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/**
 * The notification settings, as a sheet.
 *
 * `url` is this portal's settings address: /portal/<slug>/push for a
 * client, /portal/hq/push for us. The page it is opened from decides
 * which, and the server decides again from the session.
 */
export function notificationSheet(opts: { url: string; toast: (text: string, bad?: boolean) => void }): void {
  openSheet('Notifications', (form, close) => {
    form.classList.add('pt-app-notify');
    const status = el('p', 'pt-sheet-note', 'Checking…');
    const body = el('div', 'pt-app-notify-body');
    const done = el('button', 'pt-btn', 'Close') as HTMLButtonElement;
    done.type = 'button';
    done.addEventListener('click', close);
    form.append(status, body, done);
    form.addEventListener('submit', (ev) => ev.preventDefault());

    const say = (text: string) => { status.textContent = text; };

    const drawToggles = (kinds: Kind[], prefs: Record<string, boolean>, endpoint: string) => {
      body.replaceChildren();
      const list = el('div', 'pt-app-kinds');
      for (const k of kinds) {
        const row = el('label', 'pt-app-kind');
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.checked = prefs[k.id] !== false;
        box.dataset.kind = k.id;
        box.addEventListener('change', async () => {
          box.disabled = true;
          const next = { ...prefs, [k.id]: box.checked };
          const out = await send(opts.url, { action: 'prefs', endpoint, prefs: next });
          box.disabled = false;
          if (out?.ok) { Object.assign(prefs, out.prefs); } else { box.checked = !box.checked; opts.toast('That did not save. Try again.', true); }
        });
        row.append(box, el('span', undefined, k.label));
        list.appendChild(row);
      }
      body.appendChild(list);
      const off = el('button', 'pt-btn pt-btn-sm', 'Turn off on this device') as HTMLButtonElement;
      off.type = 'button';
      off.addEventListener('click', async () => {
        off.disabled = true;
        const reg = await registration();
        const sub = await reg?.pushManager.getSubscription();
        await send(opts.url, { action: 'unsubscribe', endpoint });
        try { await sub?.unsubscribe(); } catch { /* already gone */ }
        void load();
      });
      body.appendChild(off);
    };

    const drawTurnOn = (info: Info) => {
      body.replaceChildren();
      const on = el('button', 'pt-btn pt-btn-primary', 'Turn on notifications') as HTMLButtonElement;
      on.type = 'button';
      on.dataset.pushOn = '1';
      on.addEventListener('click', async () => {
        on.disabled = true;
        // The one place the browser is asked, and only because of this tap.
        let answer: NotificationPermission = 'default';
        try { answer = await Notification.requestPermission(); } catch { answer = 'denied'; }
        if (answer !== 'granted') {
          on.disabled = false;
          say(answer === 'denied'
            ? 'Notifications are blocked for Blueprint on this device. Allow them in your device settings, then come back here.'
            : 'Notifications were not turned on.');
          return;
        }
        const reg = await registration();
        if (!reg || !info.key) { on.disabled = false; say('Notifications are not available on this device.'); return; }
        try {
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(info.key) });
          const out = await send(opts.url, { action: 'subscribe', subscription: sub.toJSON() });
          if (!out?.ok) throw new Error('not saved');
          say('Notifications are on for this device.');
          drawToggles(info.kinds, out.prefs ?? {}, sub.endpoint);
        } catch (err) {
          console.warn('portal: subscribing to notifications failed', err);
          on.disabled = false;
          say('Notifications could not be turned on. Try again in a moment.');
        }
      });
      body.appendChild(on);
    };

    async function load(): Promise<void> {
      body.replaceChildren();
      let info: Info | null = null;
      try {
        const res = await fetch(opts.url, { credentials: 'same-origin' });
        info = res.ok ? await res.json() as Info : null;
      } catch { info = null; }
      if (!info?.ok) { say('Notification settings could not be loaded.'); return; }
      if (!info.key) { say('Notifications are not set up yet.'); return; }

      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      // An iPhone only delivers notifications to the home-screen app.
      // In a Safari tab there is nothing to turn on, so the offer is
      // the way to get there instead.
      if (isIos() && !isInstalled()) {
        say('On an iPhone, notifications work once Blueprint is on your home screen. Tap Share, then Add to Home Screen, and open it from there.');
        return;
      }
      if (!supported) { say('This browser cannot show notifications.'); return; }
      if (Notification.permission === 'denied') {
        say('Notifications are blocked for Blueprint on this device. Allow them in your device settings, then come back here.');
        return;
      }
      const reg = await registration();
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      if (sub && Notification.permission === 'granted') {
        const out = await send(opts.url, { action: 'status', endpoint: sub.endpoint });
        if (out?.ok && out.subscribed) {
          say('Notifications are on for this device.');
          drawToggles(info.kinds, out.prefs ?? {}, sub.endpoint);
          return;
        }
      }
      say('Get a notification on this device when there is something for you.');
      drawTurnOn(info);
    }
    void load();
  });
}
