# Performance Audit — manhwaindex.com

**Method:** No Lighthouse or Playwright (Node) install was available in this environment (`npx lighthouse` prompted for install, Playwright Node module not resolvable). Measured via Node `fetch()` scripts (desktop + mobile UA strings) hitting the live Cloudflare Worker: real TTFB, real transfer sizes (with `Accept-Encoding: gzip, br` verified separately), and static HTML parsing for render-blocking resources, image attributes, and font/GA loading. LCP/CLS/TBT are inferred from resource weight, load order, and markup — not from a real paint timeline — and should be treated as directional, not measured field/lab scores.

Pages tested: `/`, `/manhwa`, `/manhwa/solo-leveling` (comic), `/anime/attack-on-titan` (anime). Desktop and mobile UAs returned **identical HTML** (no server-side adaptive markup) — so device differences reduce to network/CPU throttling, not payload differences.

## Headline numbers (per page, HTML only)

| Page | TTFB (ms, single sample) | HTML bytes | `<img>` tags | Missing width/height | Non-webp/avif cover images |
|---|---|---|---|---|---|
| `/` | 336–673 | 91,475 | 88 | 0 | 87 (all jpg) |
| `/manhwa` | 196–1,576 | 76,870 | 61 | 0 | 60 (jpg/png) |
| `/manhwa/solo-leveling` | 636–1,262 | 57,546 | 19 | 1 (youtube thumb) | 17 |
| `/anime/attack-on-titan` | 1,076–1,269 | 54,728 | 19 | 1 (youtube thumb) | 17 |

TTFB variance (196ms–1,576ms across repeated hits, same page) indicates the Worker/origin is not consistently warm/cached — worth checking Cloudflare cache-control (`public, max-age=0, must-revalidate` on every HTML response — i.e. **HTML is never edge-cached**, always revalidated).

## Page weight (measured transfer, top ~8 requests: HTML + CSS + first scripts + first images)

| Page | Total measured bytes | Dominant cost |
|---|---|---|
| `/` | 1.12 MB | GA4 script 171KB (br) / 522KB decoded + hero banner JPG 270KB + 3 cover JPGs ~60-95KB each |
| `/manhwa` | 1.25 MB | GA4 + one 413KB PNG cover (uncompressed-looking) + 3 JPG covers |
| `/manhwa/solo-leveling` | 1.07 MB | GA4 + 3 character PNGs (107-141KB each, unoptimized) |
| `/anime/attack-on-titan` | 0.94 MB | GA4 + 2 character PNGs (~113-115KB each) |

Full page weight (with all 60-88 images) will run several MB on `/` and `/manhwa` since every image on the page is a hotlinked, unresized, uncompressed-for-web AniList original.

## LCP

- **Hero banner (`/`)**: `<img class="hero__banner" ... width="1900" height="760" loading="eager" fetchpriority="high">` — correctly not lazy-loaded, has `fetchpriority="high"`, but is a 270KB JPEG served at native AniList resolution with **no `<link rel="preload">`** and **no CDN/edge resizing**. This is very likely the LCP element on `/` and is oversized for actual rendered width.
- **Comic/anime title pages**: cover image has `fetchpriority="high"`, no `loading="lazy"` — correct pattern. Image is 94KB (Solo Leveling) / 83KB (AoT), acceptable.
- **`/manhwa` listing page — LCP RISK**: the first (and every) grid cover image has **`loading="lazy"`** with no `fetchpriority`. The first above-the-fold card image should never be lazy-loaded; this actively delays LCP on the listing page versus `/` and the title pages.
- No `<link rel="preload">` anywhere on any page (0 preloads across all 4 pages) — the LCP image and the Google Fonts CSS both discover late (after HTML parse reaches the tag).

## CLS

- All local `<img>` tags carry explicit `width`/`height` (or CSS-driven fixed aspect boxes) — good, this is the main CLS defense and it's in place.
- One exception per title page: the embedded YouTube thumbnail (`i.ytimg.com/.../hqdefault.jpg`) has **no width/height attribute**, `loading="lazy"` — a real (if minor, below-the-fold) CLS risk when it pops in.
- Bug found: on `/anime/attack-on-titan` the YouTube thumbnail URL contains a stray tab character (`LHtdKWJdif4\t/hqdefault.jpg`) — this will 404, causing a broken image / layout shift when the image fails to load and falls back to alt/broken-image box.
- Google Fonts loads with `&display=swap` — correct, avoids invisible-text FOIT-driven layout shift, but swap itself can still cause a visible reflow (FOUT) if the fallback and Saira metrics differ significantly; not measured here.

## INP / TBT proxy (main-thread cost)

- Only 5 `<script>` tags on interior pages (3 on `/manhwa`), 1 stylesheet, 4 inline scripts (likely small JSON-LD/hydration snippets, not `<script src>` — need to confirm they aren't heavy inline logic).
- **Zero render-blocking `<script>` tags** — the only non-async/defer scripts are inline; GA4 loads via `<script async src="...gtag/js...">`, which is correctly async and won't block parsing.
- GA4's `gtag.js` payload is real: **171KB compressed (brotli) / 522KB parsed** — this still costs a real main-thread parse/compile/execute slice after it lands, which is the standard GA4 INP/TBT tax. At 5 requests + this one script, INP risk from the app itself is low; GA4 is the main third-party interactivity cost.
- DOM size: up to 88 `<img>` elements on `/` and hundreds of surrounding elements on the listing/grid pages — worth checking actual DOM node count against the 1,500-element Lighthouse threshold if a real DOM crawl is done later; not measurable via HTML fetch alone (client hydration may add more).

## Render-blocking resources

- **1 render-blocking stylesheet on every page**: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700;800&family=Saira+Stencil+One&display=swap">`. This is a synchronous, cross-origin, third-party CSS request in `<head>` with no `media` trick or `preload`+swap pattern — it blocks first paint until fonts.googleapis.com responds (CSS itself is tiny, ~230 bytes gzipped, but it's a full round trip to a third-party origin plus a second round trip to fonts.gstatic.com for the actual font files).
- Preconnects are present and correctly targeted: `fonts.googleapis.com`, `fonts.gstatic.com` (with `crossorigin`), `s4.anilist.co`. This is good practice and mitigates the connection-setup cost of the above.
- **No preconnect to `www.googletagmanager.com` or `www.google-analytics.com`/`region1.google-analytics.com`** — GA4's own connection setup is not warmed, adding avoidable latency to its (already async, so non-blocking) fetch.
- No render-blocking `<script>` found.

## Third-party cost summary

| Third party | Bytes (compressed) | Blocking? | Notes |
|---|---|---|---|
| Google Fonts (fonts.googleapis.com + fonts.gstatic.com) | ~230 bytes CSS + font file(s), not fully measured | **Yes** — render-blocking `<link rel="stylesheet">` | Preconnected correctly; `display=swap` set |
| Google Tag Manager / GA4 (`gtag/js`) | 171 KB compressed / 522 KB decoded | No — `async` | Loaded on every page, every visit; not preconnected; large for a tag that's likely mostly boilerplate |
| AniList CDN (`s4.anilist.co`) | 60–413 KB per image, dozens of images per page | No (mostly lazy) | Not a "third party" in the ads/analytics sense, but 100% of visual content is unresized hotlinked originals — the single biggest weight and LCP/CLS driver |
| i.ytimg.com | ~small | No, `loading="lazy"` | No width/height; one malformed URL found |

## Ranked recommendations (highest impact first)

1. **Fix LCP on `/manhwa`**: remove `loading="lazy"` (and add `fetchpriority="high"`) on the first 1–4 grid cover images so the listing page's LCP candidate isn't gated behind lazy-load intersection logic. *Expected impact: largest single LCP win on the highest-traffic page type.*
2. **Resize/re-encode AniList images at the edge**: proxy `s4.anilist.co` covers/banners through a Cloudflare Image Resizing / Workers image transform to serve WebP/AVIF at the actual rendered dimensions (e.g. 230×345 cards, not full AniList originals). Currently 100% of 87+ images per page are unoptimized JPG/PNG originals up to 413KB each. *Expected impact: largest total page-weight reduction (multi-MB → likely <1MB per page); improves LCP and INP (less decode work) on both mobile and desktop.*
3. **Preload the hero banner image on `/`**: add `<link rel="preload" as="image" href="...banner..." fetchpriority="high">` so discovery doesn't wait for the parser to reach the `<img>` tag. *Expected impact: moderate LCP improvement on the homepage.*
4. **Add preconnect for GA4**: `<link rel="preconnect" href="https://www.googletagmanager.com">` (and consider `https://www.google-analytics.com` if GA4 sends measurement pings). *Expected impact: small but free — shaves connection setup off GA4's script fetch.*
5. **Reconsider the render-blocking Google Fonts `<link rel="stylesheet">`**: switch to the standard non-blocking pattern (`rel="preload" as="style" onload="this.rel='stylesheet'"` + `<noscript>` fallback), or self-host the two Saira font files/subset via Cloudflare and inline the tiny `@font-face` CSS. *Expected impact: removes the one confirmed render-blocking request on every page — helps LCP and First Paint on slow/mobile connections.*
6. **Fix the malformed YouTube thumbnail URL** on anime pages (stray tab character before `/hqdefault.jpg`) and add explicit `width`/`height` to all `i.ytimg.com` thumbnails. *Expected impact: eliminates a broken-image CLS risk; small but free.*
7. **Investigate HTML cache-control**: every HTML response is `public, max-age=0, must-revalidate` — confirm this is intentional for a "static Astro on Workers" site; if content changes infrequently, a short `s-maxage` at Cloudflare's edge would cut the variable 196ms–1,576ms TTFB seen across repeated requests to the same page.
8. **Investigate GA4 payload size**: 171KB compressed is on the higher end for `gtag.js`; confirm no unnecessary GA config (e.g. multiple product integrations) is being loaded, and consider Cloudflare Zaraz or a lighter server-side GA4 relay if analytics accuracy allows it, to remove the client-side script and its main-thread cost entirely.

## Caveats

- Single-sample TTFB per page/UA — not a 28-day CrUX p75. Treat variance as a signal to re-test, not a hard number.
- No real paint timeline was captured (no headless browser available), so LCP/CLS/INP are inferred from markup and payload, not measured. Recommend re-running with PageSpeed Insights (`scripts/pagespeed_check.py`) or installing Lighthouse in an environment where `npm install -g lighthouse` / Playwright browsers are permitted, to get authoritative lab + CrUX field scores.
- Desktop vs mobile HTML is identical; the device split in this report is inferred from typical mobile network/CPU throttling applied to the same payload, not from any server-side difference.
