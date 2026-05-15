# BPMKTG Website

Marketing site built with [Astro](https://astro.build) and deployed to [Cloudflare Pages](https://pages.cloudflare.com).

## Develop

```bash
npm install
npm run dev
```

Site runs at `http://localhost:4321`.

## Build

```bash
npm run build
```

Static output is written to `dist/`.

## Deploy (Cloudflare Pages)

Connect this repo in the Cloudflare dashboard with:

- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** `20`

## Structure

```
src/
  components/   reusable UI (Header, Footer, Hero, FeatureGrid)
  layouts/      page shell (Layout.astro)
  pages/        routed pages (index, about, services, contact)
  styles/       global CSS
public/         static assets served as-is
```
