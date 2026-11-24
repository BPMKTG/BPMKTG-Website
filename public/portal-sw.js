/* ──────────────────────────────────────────────────────────────
   The portal's service worker. One, for everything under /portal/:
   the client's portal and Blueprint HQ.

   It does three things and is careful to do nothing else.

   1. PAGES are fetched from the network every time. If the network is
      not there, a plain offline screen is shown instead of the
      browser's error. Pages are never stored.

   2. STATIC FILES (the built scripts and styles, the brand art, the
      fonts) are kept, so the app opens quickly. Nothing else is kept.

   3. NOTIFICATIONS are shown when they arrive, and a tap opens the
      thing they are about, inside the app.

   What it never touches, and this is the important part: anything
   behind sign-in. Data, previews, files, uploads, every POST, and
   every request with a Range header are not handled here at all.
   There is no respondWith on those paths, so the browser makes those
   requests exactly as it would with no worker installed. A phone's
   video player asks for a preview in byte ranges, and it gets them
   from the server untouched.

   This file is served from the site root with
   `Service-Worker-Allowed: /portal/` (see public/_headers), because a
   file under /portal/ would be answered by the portal's own routes.
   The page registers it as /portal-sw.js?v=<build>, so each deploy is
   a new worker: it installs alongside the old one and takes over the
   next time the app is opened, or at once when the person taps
   "Updated, tap to refresh".
   ────────────────────────────────────────────────────────────── */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const STATIC = `bp-static-${VERSION}`;
// Without the .html: the host answers the .html address with a redirect,
// and a browser will not show a redirected answer for a page.
const OFFLINE = '/portal-offline';
const PRECACHE = [OFFLINE, '/brand/logo-header-navy.svg'];

/** The pages of the app: the start address, sign-in, HQ, and one
 *  client's portal. Exactly these shapes. Anything deeper under
 *  /portal/ is data, a preview or a file, and is not ours to answer. */
function isAppPage(pathname) {
  return /^\/portal\/(?:start|login|hq|[a-z0-9][a-z0-9-]*)\/?$/.test(pathname);
}

/** Files that are the same for everybody and hold nothing private. */
function isStaticFile(pathname) {
  return pathname.startsWith('/_astro/') || pathname.startsWith('/brand/') || pathname.startsWith('/fonts/')
    || pathname === '/favicon.ico' || pathname === '/apple-touch-icon.png';
}

/**
 * What to do with a request: 'page', 'static', or null for "leave it
 * completely alone". Its own function so the rule can be tested
 * without a browser.
 */
function routeFor(request) {
  if (request.method !== 'GET') return null;
  if (request.headers.has('range')) return null;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (request.mode === 'navigate') return isAppPage(url.pathname) ? 'page' : null;
  return isStaticFile(url.pathname) ? 'static' : null;
}

self.addEventListener('install', (event) => {
  // No skipWaiting here: a new version waits until the app is next
  // opened, or until the person taps "refresh".
  event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n.startsWith('bp-static-') && n !== STATIC).map((n) => caches.delete(n)),
    )),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function offlinePage() {
  const cache = await caches.open(STATIC);
  return (await cache.match(OFFLINE)) || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function staticFile(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Only a plain, successful, same-origin answer is kept.
  if (res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', (event) => {
  const route = routeFor(event.request);
  if (route === 'page') {
    event.respondWith(fetch(event.request).catch(() => offlinePage()));
  } else if (route === 'static') {
    event.respondWith(staticFile(event.request));
  }
  // Anything else: no respondWith. The browser does what it always did.
});

/* ── notifications ────────────────────────────────────────────── */

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const title = typeof d.title === 'string' && d.title ? d.title : 'Blueprint';
  // Only ever an address inside the app.
  const url = typeof d.url === 'string' && d.url.startsWith('/portal/') ? d.url : '/portal/start';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof d.body === 'string' ? d.body : '',
    // The same tag replaces the last one, so five items in ten minutes
    // end as one notification that says five.
    tag: typeof d.tag === 'string' ? d.tag : undefined,
    renotify: false,
    icon: '/brand/app/client-192.png',
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/portal/start';
  const target = new URL(url, self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // A window already on that page is brought forward and told where
    // to go, so the app does not open a second copy of itself.
    for (const client of windows) {
      const at = new URL(client.url);
      if (at.origin === target.origin && at.pathname.replace(/\/+$/, '') === target.pathname.replace(/\/+$/, '')) {
        client.postMessage({ type: 'bp-open', url: target.pathname + target.hash });
        if ('focus' in client) return client.focus();
        return undefined;
      }
    }
    return self.clients.openWindow(target.pathname + target.search + target.hash);
  })());
});
