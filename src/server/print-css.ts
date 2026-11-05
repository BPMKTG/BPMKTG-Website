/* ──────────────────────────────────────────────────────────────
   Report and audit PDFs: the stylesheet, and the shell around it.

   SERVER ONLY, though nothing here is secret: it is in src/server
   because the only things that import it are Pages Functions.

   The design is the "Blueprint Report Templates" canvas, carried over
   as classes rather than as the canvas's inline styles. Two reasons:
   the canvas repeats the same header, footer and card on fourteen
   boards, and a stylesheet is the only way a change lands on all of
   them at once; and a 40KB page is a faster, more reliable thing to
   hand Browser Rendering than a 400KB one.

   Three rules hold the page together:

     1. ONE PAGE IS 816 x 1056 CSS PIXELS, which at 96dpi is exactly
        Letter. Every page is that size, overflow hidden, so content
        that grows cannot silently push a seventh page into a six-page
        report.
     2. BREAKS ARE BEFORE, NOT AFTER. `page-break-after: always` on
        every page emits a trailing blank sheet, because the last page
        breaks too. `.pg + .pg { break-before: page }` cannot.
     3. THE FONTS ARE OURS. Self-hosted woff2, so the renderer is not
        racing fonts.googleapis.com while it captures, and a PDF a
        client keeps for a year does not depend on a third party.
   ────────────────────────────────────────────────────────────── */

/** The canvas tokens, named once. */
export const T = {
  navy: '#264fa0',
  navyDeep: '#1d3d7d',
  blue: '#62a6db',
  light: '#b3e0f6',
  tint: '#eef4fa',
  tint2: '#dfeaf5',
  tint3: '#e4effa',
  orange: '#e3703b',
  orangeInk: '#aa542c',
  orangeTint: '#fdebe2',
  ink: '#232a3b',
  ink2: '#4a5265',
  muted: '#6c727f',
  up: '#15803d',
  upTint: '#dcfce7',
  down: '#b91c1c',
  downTint: '#fee2e2',
  rule: 'rgba(35,42,59,.12)',
  ruleStrong: 'rgba(35,42,59,.25)',
  ruleSoft: 'rgba(35,42,59,.1)',
} as const;

/** 8.5in x 11in at 96dpi. */
export const PAGE_W = 816;
export const PAGE_H = 1056;

export const PRINT_CSS = `
@font-face{
  font-family:'Orbitron';
  src:url('/fonts/orbitron-latin-var.woff2') format('woff2-variations');
  font-weight:400 900;font-style:normal;font-display:block;
}
@font-face{
  font-family:'Roboto';
  src:url('/fonts/roboto-latin-var.woff2') format('woff2-variations');
  font-weight:100 900;font-style:normal;font-display:block;
}

@page{size:Letter;margin:0}

*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#ffffff}
body{
  font-family:Roboto,'Helvetica Neue',Arial,sans-serif;
  color:${T.ink};
  -webkit-font-smoothing:antialiased;
  /* Without this, Chrome drops every background colour in print, and
     the navy bands and tinted cards come out white. */
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}

/* ── the page ───────────────────────────────────────────────── */

.pg{
  position:relative;width:${PAGE_W}px;height:${PAGE_H}px;
  background:#ffffff;overflow:hidden;
}
/* Before, not after: see rule 2 at the top of this file. */
.pg + .pg{break-before:page;page-break-before:always}

/* Interior pages. The cover sets its own geometry. */
.pg--body{padding:112px 64px 96px}

.grid{
  background-color:${T.tint};
  background-image:
    linear-gradient(rgba(38,79,160,.09) 1px,transparent 1px),
    linear-gradient(90deg,rgba(38,79,160,.09) 1px,transparent 1px);
  background-size:32px 32px;
}

/* ── header and footer ──────────────────────────────────────── */

.hd{
  position:absolute;left:64px;right:64px;top:40px;
  display:flex;justify-content:space-between;align-items:center;
  border-bottom:1px solid ${T.rule};padding-bottom:14px;
}
.hd__logo{height:22px;width:auto;display:block}
.hd__right{display:flex;gap:12px;align-items:center}
.hd__who{
  font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:2px;
  color:${T.muted};text-transform:uppercase;
}
.flag{
  font-size:10px;font-weight:700;letter-spacing:1px;color:${T.orangeInk};
  background:${T.orangeTint};padding:3px 8px;border-radius:99px;
}

.ft{
  position:absolute;left:64px;right:64px;bottom:36px;
  display:flex;justify-content:space-between;font-size:12px;
  color:${T.muted};border-top:1px solid ${T.rule};padding-top:12px;
}

/* ── type ───────────────────────────────────────────────────── */

.eyebrow{
  font-family:Orbitron,sans-serif;font-size:11px;font-weight:600;
  letter-spacing:2.5px;color:${T.orangeInk};text-transform:uppercase;
}
.h1{
  margin:0;font-family:Orbitron,sans-serif;font-size:30px;font-weight:700;
  color:${T.navyDeep};line-height:1.15;
}
.h2{
  margin:0;font-family:Orbitron,sans-serif;font-size:24px;font-weight:700;
  color:${T.navyDeep};
}
.h2--sm{font-size:22px}
.h2--lg{font-size:28px}
.lede{font-size:15px;line-height:1.55;color:${T.ink2}}
.quote{font-size:15px;line-height:1.55;color:${T.ink2};font-style:italic;margin:0}
.note{font-size:13px;color:${T.ink2};line-height:1.5}
.note--sm{font-size:12px;color:${T.muted}}
.strong{font-weight:700}

.stack{display:flex;flex-direction:column}
.g4{gap:4px}.g6{gap:6px}.g8{gap:8px}.g10{gap:10px}.g12{gap:12px}
.g14{gap:14px}.g16{gap:16px}.g18{gap:18px}.g22{gap:22px}.g26{gap:26px}
.g28{gap:28px}
.row{display:flex;align-items:center;justify-content:space-between}
.row--end{align-items:flex-end}
.rule{height:1px;background:${T.rule}}
.grow{flex:1}

/* One through five, because the page builders pick the column count
   from how many things there actually are. A missing .c5 is why the
   five top posts stacked and pushed page three over by 119px. */
.c1{display:grid;grid-template-columns:minmax(0,1fr)}
.c2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.c3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.c4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.c5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}

/* ── cards ──────────────────────────────────────────────────── */

.card{border:1px solid ${T.rule};border-radius:16px;padding:20px 22px}
.card--sm{border-radius:14px;padding:14px 16px}
.card--tint{background:${T.tint};border:0;border-radius:18px;padding:26px 28px}
.card--tint-sm{background:${T.tint};border:0;border-radius:14px;padding:16px 18px}
.card--warm{background:${T.orangeTint};border:0;border-radius:14px;padding:16px 18px}
.card--navy{background:${T.navy};border:0;border-radius:16px;padding:18px;color:#ffffff}

.kicker{
  font-size:12px;letter-spacing:1px;text-transform:uppercase;
  color:${T.muted};font-weight:500;
}
.big{font-size:40px;font-weight:300;color:${T.navyDeep};line-height:1.1}
.mid{font-size:28px;font-weight:300;color:${T.navyDeep};line-height:1.15}
.small{font-size:26px;font-weight:300;color:${T.navyDeep};line-height:1.15}

.up{color:${T.up};font-weight:500}
.down{color:${T.down};font-weight:500}
.flat{color:${T.ink2}}
.arrow{width:8px;height:8px;display:inline-block;vertical-align:-1px;margin-right:3px}

/* ── the from-Mason band ────────────────────────────────────── */

.ava{
  width:40px;height:40px;border-radius:99px;background:${T.navy};
  color:#ffffff;font-weight:700;display:flex;align-items:center;
  justify-content:center;font-size:15px;flex-shrink:0;
}
.said{margin:0;font-size:16px;line-height:1.6;color:${T.ink}}

/* ── three-up tops ──────────────────────────────────────────── */

.tt{padding-top:12px;display:flex;flex-direction:column;gap:4px}
.tt--navy{border-top:3px solid ${T.navy}}
.tt--orange{border-top:3px solid ${T.orange}}
.tt--blue{border-top:3px solid ${T.blue}}
.tt__h{font-weight:700;font-size:14px;color:${T.navyDeep}}
.tt__b{font-size:14px;color:${T.ink2};line-height:1.5}

/* ── bars ───────────────────────────────────────────────────── */

.track{height:10px;background:${T.tint2};border-radius:99px;overflow:hidden}
.fill{height:10px;border-radius:99px;background:${T.navy}}
.fill--orange{background:${T.orange}}

.brow{display:grid;grid-template-columns:120px minmax(0,1fr) 28px;gap:10px;align-items:center;font-size:13px}
.brow__bar{height:9px;background:${T.navy};border-radius:99px}
.brow__n{text-align:right}

.mix{display:flex;height:14px;border-radius:99px;overflow:hidden}
.swatch{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.legend{display:flex;gap:8px;align-items:center;font-size:13px;color:${T.ink2}}

/* ── tables ─────────────────────────────────────────────────── */

table{border-collapse:collapse;width:100%}
.t-num th{
  font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:${T.muted};
  font-weight:500;text-align:right;padding:6px 10px;
  border-bottom:1px solid ${T.ruleStrong};
}
.t-num th:first-child{text-align:left}
.t-num td{
  font-size:13.5px;padding:6px 10px;border-bottom:1px solid ${T.ruleSoft};
  text-align:right;color:${T.ink};
}
.t-num td:first-child{text-align:left;color:${T.ink2}}
.t-num tr.grp td{
  background:${T.tint};font-weight:700;color:${T.navyDeep};text-align:left;
  font-size:13px;letter-spacing:.3px;padding:7px 10px;border-bottom:0;
}

.t-txt th{
  font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:${T.muted};
  font-weight:500;text-align:left;padding:7px 10px;
  border-bottom:1px solid ${T.ruleStrong};
}
.t-txt td{
  font-size:13px;line-height:1.45;padding:8px 10px;
  border-bottom:1px solid ${T.ruleSoft};vertical-align:top;color:${T.ink2};
}
.t-txt td:first-child{color:${T.ink};font-weight:500}
.t-txt--lead2 td:nth-child(2){color:${T.navyDeep};font-weight:700;white-space:nowrap}
.t-txt--right2 td:nth-child(2){text-align:right}
.t-txt--tight td{font-size:12.5px;padding:7px 8px}
.t-txt--tight th{padding:7px 8px}
.t-txt--bold1 td:first-child{font-weight:700}

/* ── pills and tags ─────────────────────────────────────────── */

.pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px}
.pill--good{background:${T.upTint};color:${T.up}}
.pill--warn{background:${T.orangeTint};color:${T.orangeInk}}
.pill--bad{background:${T.downTint};color:${T.down}}
.pill--info{background:${T.tint3};color:${T.navyDeep}}
.tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px}

/* ── bullets ────────────────────────────────────────────────── */

.li{display:flex;gap:10px;font-size:13px;line-height:1.5;color:${T.ink2}}
.li b,.li strong{color:${T.ink}}
.dot{width:6px;height:6px;border-radius:9px;background:${T.navy};margin-top:7px;flex-shrink:0}

.ck{
  display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.5;
  color:${T.ink};padding:8px 0;border-bottom:1px solid ${T.ruleSoft};
}
.ck:last-child{border-bottom:0}
.box{
  width:16px;height:16px;border:1.5px solid ${T.navy};border-radius:4px;
  margin-top:2px;flex-shrink:0;
}
.box--orange{border-color:${T.orange}}

.ck--light{font-size:14px;padding:0;border-bottom:0;align-items:flex-start;gap:10px}
.ck--light .box{width:14px;height:14px}

/* ── definition rows ────────────────────────────────────────── */

.dl{
  display:grid;grid-template-columns:130px minmax(0,1fr);gap:14px;
  padding:7px 0;border-bottom:1px solid ${T.ruleSoft};
  font-size:13.5px;line-height:1.5;
}
.dl:last-child{border-bottom:0}
.dl b{color:${T.navyDeep}}
.dl span{color:${T.ink2}}

/* ── date chips ─────────────────────────────────────────────── */

.when{display:flex;gap:14px;align-items:center;border-bottom:1px solid ${T.ruleSoft};padding-bottom:10px}
.when__chip{width:52px;text-align:center;background:${T.tint3};border-radius:10px;padding:6px 0;flex-shrink:0}
.when__chip--orange{background:${T.orangeTint}}
.when__m{font-size:10px;font-weight:700;color:${T.navy}}
.when__d{font-size:20px;font-weight:700;color:${T.navyDeep}}
.when__chip--orange .when__m,.when__chip--orange .when__d{color:${T.orangeInk}}
.when__t{font-weight:700;font-size:14px}

/* ── thumbs ─────────────────────────────────────────────────── */

.thumb{border:1px solid ${T.rule};border-radius:14px;overflow:hidden}
.thumb__top{
  height:92px;background:${T.tint2};display:flex;align-items:center;
  justify-content:center;font-family:Orbitron,sans-serif;font-size:11px;
  letter-spacing:1.5px;text-transform:uppercase;color:${T.navy};
}
.thumb__body{padding:10px 12px;display:flex;flex-direction:column;gap:3px}
.thumb__t{
  font-size:12px;font-weight:700;line-height:1.3;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}

/* ── scorecard ──────────────────────────────────────────────── */

.sc{
  display:grid;grid-template-columns:170px 150px 28px minmax(0,1fr);gap:14px;
  align-items:center;padding:8px 0;border-bottom:1px solid ${T.ruleSoft};
}
.sc:last-child{border-bottom:0}
.sc__n{font-size:13.5px;font-weight:500;color:${T.ink}}
.segs{display:flex;gap:4px}
.seg{height:12px;flex:1;border-radius:3px;background:${T.tint2}}
.seg--on{background:${T.navy}}
.seg--lo{background:${T.orange}}
.sc__v{font-family:Orbitron,sans-serif;font-weight:700;font-size:15px;color:${T.navyDeep};text-align:center}
.sc__w{font-size:12.5px;line-height:1.45;color:${T.ink2}}

/* ── opportunity cards ──────────────────────────────────────── */

/* Measured against the real audit: three opportunity cards plus the
   five direction rows left 3px of page seven. Tightened to 14/16 so a
   longer "why" line has somewhere to go rather than being cut off by
   the page's own overflow:hidden. */
.opp{
  display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;
  border:1px solid ${T.rule};border-radius:16px;padding:13px 16px;
}
.opp__n{font-family:Orbitron,sans-serif;font-size:34px;font-weight:700;color:${T.navy};line-height:1}

/* ── closing bands ──────────────────────────────────────────── */

.band{
  background:${T.tint};border-radius:18px;padding:22px 26px;
  display:flex;justify-content:space-between;align-items:center;gap:20px;
}
.band--navy{background:${T.navy};color:#ffffff}
.band__h{font-weight:700;font-size:16px;color:${T.navyDeep}}
.band--navy .band__h{font-family:Orbitron,sans-serif;color:#ffffff}
.band__b{font-size:14px;color:${T.ink2}}
.band--navy .band__b{font-size:13.5px;line-height:1.5;color:${T.tint2}}
.band__r{text-align:right;font-size:14px;color:${T.navy};font-weight:500;line-height:1.5;flex-shrink:0}
.band--navy .band__r{font-size:13px;line-height:1.6;color:#ffffff}
.cta{display:inline-block;background:${T.orange};color:#ffffff;font-weight:700;
  font-size:14px;padding:11px 20px;border-radius:99px;text-decoration:none}

/* ── the short-version band ─────────────────────────────────── */

.short{background:${T.navy};border-radius:18px;padding:26px 28px;color:#ffffff}
.short__k{
  font-family:Orbitron,sans-serif;font-size:11px;font-weight:600;
  letter-spacing:2.5px;color:${T.light};text-transform:uppercase;
}
.short p{margin:10px 0 0;font-size:15.5px;line-height:1.6;color:#ffffff}

/* ── cover ──────────────────────────────────────────────────── */

.cv__hd{position:absolute;left:64px;top:56px;right:64px;display:flex;justify-content:space-between;align-items:center}
.cv__logo{height:40px;width:auto;display:block}
.cv__doc{
  font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:2.5px;
  color:${T.ink2};text-transform:uppercase;
}
.cv__hero{
  position:absolute;left:64px;right:64px;top:150px;height:400px;
  border-radius:22px;overflow:hidden;background:${T.tint2};
}
.cv__hero img{width:100%;height:100%;object-fit:cover;display:block}
.cv__title{
  font-family:Orbitron,sans-serif;font-size:64px;font-weight:700;
  color:${T.navyDeep};line-height:1.02;letter-spacing:-0.5px;margin:0;
}
.cv__title--audit{font-size:72px;line-height:1}
/* A name that would run to a third line at 72px. Smaller type, so the
   title stays a title instead of running into the dial below it. */
.cv__title--long{font-size:56px;letter-spacing:-0.3px}
.cv__kick{
  font-family:Orbitron,sans-serif;font-size:13px;font-weight:600;
  letter-spacing:3px;color:${T.orangeInk};text-transform:uppercase;
}
.cv__bar{width:72px;height:4px;background:${T.orange};border-radius:4px}
.cv__sub{font-size:17px;color:${T.ink2};line-height:1.5}
.cv__sub--audit{font-size:18px;max-width:480px}
/* Clear of the page footer, which sits at bottom:36 on every page
   including this one. At bottom:48 the two overlapped, and a cover
   with "Blueprint Marketing · Monthly Report" printed through the
   middle of Mason's name is not a thing you notice until it is a PDF
   in a client's inbox. */
.cv__ft{
  position:absolute;left:64px;right:64px;bottom:92px;display:flex;
  justify-content:space-between;align-items:flex-end;
  border-top:1px solid ${T.rule};padding-top:16px;
}
/* A ring, not a drop shadow. Chrome's print rasteriser renders a
   large blurred shadow as its own opaque bounding box, so the canvas's
   soft shadow came out of the PDF as two grey squares behind the
   dial. The disc is 220px and the arc only 190, so there is already a
   white margin around it; a hairline is all it needed. A border would
   have been wrong here, because the SVG is positioned against the
   padding box and would have overflowed it. */
/* ── the audit cover, with and without a photo ──────────────────
   A prospect teardown has no Drive folder to read a cover from, so its
   cover is the grid and these are the coordinates it has always had.
   A client audit adds a photo band at the top and everything below it
   moves down by one class. Two layouts rather than one flexible
   column, because the dial and the facts are absolutely positioned
   against a fixed sheet and "roughly where it was" is not a thing a
   printed page gets to be.
   ────────────────────────────────────────────────────────────── */
.cv__hero--audit{top:130px;height:150px}
.cv__at{position:absolute;left:64px;right:64px;top:230px}
/* Measured on the page rather than chosen. With the band at 130 the
   title starts at 310, and the deepest it can reach is 582: two lines
   at 72px, which is the most 72px ever gets, because a line long
   enough to wrap is set at 56px instead and three of those stop at
   550. So the dial and the facts start at 630 and the footer at 908 is
   never in doubt. */
.cv__at--photo{top:310px}
.cv__dial{
  position:absolute;right:64px;top:590px;width:220px;height:220px;
  border-radius:999px;background:#ffffff;outline:1px solid ${T.rule};
  display:flex;align-items:center;justify-content:center;
}
.cv__dial svg{position:absolute;left:0;top:0}
.cv__dialn{font-family:Orbitron,sans-serif;font-size:52px;font-weight:700;color:${T.navyDeep};line-height:1}
.cv__dial--photo{top:630px}
.cv__facts{position:absolute;left:64px;top:640px;width:360px;display:flex;flex-direction:column;gap:14px}
.cv__facts--photo{top:630px}
.fact__k{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${T.muted}}
.fact__v{font-size:16px;font-weight:500}
.fact__v--wrap{font-size:15px;line-height:1.5;font-weight:400}

/* ── the web view ───────────────────────────────────────────────
   A print route is also opened in a browser: by Mason on Preview,
   and by a prospect on a share link. On screen the pages are centred
   on a grey field with a shadow, which is the only thing that tells
   you where one sheet ends. None of it reaches the PDF, because
   Browser Rendering captures with print media.
   ─────────────────────────────────────────────────────────────── */

@media screen{
  body{background:#e9edf2;padding:24px 0}
  .pg{margin:0 auto 24px;box-shadow:0 2px 6px rgba(35,42,59,.14),0 14px 40px rgba(35,42,59,.14)}
}
`;
