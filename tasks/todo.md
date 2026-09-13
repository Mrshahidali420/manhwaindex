# Hybrid rendering on Cloudflare Workers Free (option A)

Goal: hold every AniList title with no page-count limit, at $0.

## Why

Cloudflare Workers Free allows only 20,000 static asset files per deploy.
The site is at 18,046 and AniList has ~140,000 titles. Static cannot win.
A Worker that renders a page on request has no page limit at all.
Free plan gives 100,000 requests a day and 10 ms CPU per request.

Measured: parsing a 25-title JSON shard costs 0.78 ms. It fits.

## Design

- Listings, home, genre, browse, sitemaps: still built as static files.
- Title pages and character pages: rendered by the Worker on request.
- Data: the catalog is cut into small JSON shards in `public/d/`.
  The Worker picks the shard from a hash of the slug and reads it with
  the ASSETS binding. No database, so no write limits.
- Rendered HTML is stored in the edge cache, so each page renders once.

## Steps

- [x] 1. Move pure helpers out of `catalog.js` into `lib/format.js`
- [x] 2. `scripts/make-shards.mjs` writes `public/d/t/*.json` + `public/d/c/*.json`
- [x] 3. `lib/runtime.js` reads one record from a shard through ASSETS
- [x] 4. Add `@astrojs/cloudflare`, set `output: 'server'`
- [x] 5. Mark every static page `prerender = true`
- [x] 6. Convert `[kind]/[slug].astro` and `character/[slug].astro` to SSR
- [x] 7. Wrap the adapter worker: redirects + edge cache
- [x] 8. Build, test with `wrangler dev`, check worker size and CPU
- [ ] 9. Deploy, then run the full backfill

## Review

Done and measured on 13 Sep 2026.

- Static files in `dist`: **413** (was 18,046). The 20,000 ceiling is gone.
- Shard files: 54 today. At 140,000 titles it is about 2,900.
- Worker bundle: 2,454 KB raw, **458 KB gzipped**. The limit is 3 MB.
- Worst-case record lookup: **0.879 ms** on the biggest shard (1.3 MB).
  The Worker searches for one line and parses only that line.
- Local render time, miniflare on an i5-8350U, cache bypassed:
  static page 14 ms, title page 17 ms, character page 40 ms.
- Rendered HTML is kept in the edge cache for 24 hours, so a page
  renders once per Cloudflare location per day.

Two things changed shape on the way:

1. `Astro.rewrite('/404')` fails from a rendered page, because 404 is a
   built file, not a route. `runtime.js` now serves `404.html` itself
   with a real 404 status.
2. The site shell showed two catalog counts and eight genre names, which
   would have pulled the whole 26 MB catalog into the Worker. Those
   numbers now come from `data/site-stats.json`, written at build time.

Browse listings stop at page 100. Deeper pages helped nobody and would
have brought the file count back. Every title is still listed directly
in the sitemaps.
