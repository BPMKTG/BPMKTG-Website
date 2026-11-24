// Draws the app icons and iOS launch screens from the brand SVGs. Re-run it if the art changes.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = new URL('../public/brand', import.meta.url).pathname;
const OUT = `${ROOT}/app`;
// The mark with its light-mode colours fixed: an app icon must not swap colours with the system theme.
const mark = readFileSync(`${ROOT}/icon.svg`, 'utf8').replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/, '').replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\}\s*\}\s*\}/, '');
const word = readFileSync(`${ROOT}/logo-header-navy.svg`, 'utf8').replace(/<\?xml[^>]*\?>/, '');
const uri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const PAGE = '#f6f9fc', WHITE = '#ffffff', ORANGE = '#e3703b';
const b = await chromium.launch();
const shot = async (file, w, h, html) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const p = await ctx.newPage(); await p.setContent(`<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${html}</body></html>`); await p.waitForTimeout(120); await p.screenshot({ path: `${OUT}/${file}`, clip: { x: 0, y: 0, width: w, height: h } }); await ctx.close(); };
// An icon: the mark on white. `fill` is how much of the square the mark takes; a maskable icon keeps to the middle
// so a round or squircle mask never cuts it. The HQ badge sits bottom right, inside that same safe area.
const icon = (size, fill, hq) => `<div style="width:${size}px;height:${size}px;background:${WHITE};position:relative;display:grid;place-items:center">
  <img src="${uri(mark)}" style="width:${Math.round(size * fill)}px;height:${Math.round(size * fill)}px">
  ${hq ? `<div style="position:absolute;right:${Math.round(size * (fill < 0.7 ? 0.17 : 0.07))}px;bottom:${Math.round(size * (fill < 0.7 ? 0.17 : 0.07))}px;background:${ORANGE};color:#fff;font:800 ${Math.round(size * (fill < 0.7 ? 0.15 : 0.19))}px/1 -apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:.04em;padding:${Math.round(size * 0.035)}px ${Math.round(size * 0.06)}px;border-radius:${size}px;box-shadow:0 0 0 ${Math.max(2, Math.round(size * 0.018))}px ${WHITE}">HQ</div>` : ''}
</div>`;
for (const [who, hq] of [['client', false], ['hq', true]]) {
  await shot(`${who}-192.png`, 192, 192, icon(192, 0.86, hq));
  await shot(`${who}-512.png`, 512, 512, icon(512, 0.86, hq));
  await shot(`${who}-maskable-512.png`, 512, 512, icon(512, 0.6, hq));
  await shot(`${who}-apple-180.png`, 180, 180, icon(180, 0.84, hq));
  await shot(`${who}-apple-167.png`, 167, 167, icon(167, 0.84, hq));
  await shot(`${who}-apple-152.png`, 152, 152, icon(152, 0.84, hq));
}
// Launch screens: the page colour, with the wordmark the header uses. iOS wants one image per screen size, exactly.
export const SCREENS = [[440, 956, 3], [430, 932, 3], [428, 926, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2], [360, 780, 3], [320, 568, 2],
  [744, 1133, 2], [768, 1024, 2], [810, 1080, 2], [820, 1180, 2], [834, 1112, 2], [834, 1194, 2], [834, 1210, 2], [1024, 1366, 2], [1032, 1376, 2]];
for (const [who, hq] of [['client', false], ['hq', true]]) {
  for (const [w, h, r] of SCREENS) {
    const W = w * r, H = h * r, word_w = Math.round(Math.min(W * 0.5, 620 * r / 2));
    await shot(`splash-${who}-${W}x${H}.png`, W, H, `<div style="width:${W}px;height:${H}px;background:${PAGE};display:grid;place-items:center"><div style="display:flex;align-items:center;gap:${Math.round(word_w * 0.06)}px">
      <img src="${uri(word)}" style="width:${word_w}px;height:auto">${hq ? `<span style="background:${ORANGE};color:#fff;font:800 ${Math.round(word_w * 0.085)}px/1 -apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:.12em;padding:${Math.round(word_w * 0.028)}px ${Math.round(word_w * 0.05)}px;border-radius:${W}px">HQ</span>` : ''}</div></div>`);
  }
}
await b.close(); console.log('drawn');
