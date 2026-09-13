# Technical SEO Audit — manhwaindex.com
Date: 2026-09-13 | ~18,000 pages | Astro static (`build.format: 'file'`) on Cloudflare Workers

## Score: 78/100

## Summary table

| Category | Status |
|---|---|
| Crawlability (robots.txt, sitemaps) | PASS (with one transient issue noted) |
| Indexability (canonicals, dup content) | PASS |
| Security (HTTPS, headers) | FAIL |
| URL structure / redirects | PASS with issues |
| Mobile | PASS |
| Core Web Vitals (source-level) | PASS, minor risk |
| Structured data | PASS |
| JS rendering | PASS (fully SSR/static, no CSR dependency) |
| IndexNow | NOT IMPLEMENTED |

---

## Critical

### 1. No HTTPS enforcement — HTTP serves full content on port 80 with no redirect
**Evidence:** `http://manhwaindex.com/` returns `200` directly (verified via manual-redirect fetch, no `Location` header, no upgrade). Cloudflare's "Always Use HTTPS" / edge redirect is not enabled for this zone.
**Impact:** Site is fully accessible unencrypted. Search engines and browsers that arrive via an `http://` link get the plaintext copy; no HSTS to force upgrade on repeat visits; mixed-signal risk for canonicalization even though canonical tags currently save it.
**Fix:** In Cloudflare dashboard → SSL/TLS → Edge Certificates, enable "Always Use HTTPS" (301, port 80→443). Add HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` via a Worker/Transform Rule, then submit to hstspreload.org once stable.

### 2. No security response headers site-wide
**Evidence:** Checked `/`, `/manhwa/solo-leveling`, `/character/mikasa-ackerman`, `/anime/attack-on-titan`, `/character/page/2` — all missing `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
**Impact:** No clickjacking protection, no MIME-sniffing protection; Lighthouse/PageSpeed "Best Practices" score is capped; this also affects trust signals some crawlers/AI agents weight.
**Fix:** Add a small Cloudflare Worker response-header injector (or Transform Rule) applying at minimum: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` (or CSP `frame-ancestors 'self'`), plus HSTS from item 1. CSP can be added incrementally (start report-only) since third-party images (AniList, YouTube thumbnails) and Google Fonts must be allow-listed.

---

## High

### 3. `www.manhwaindex.com` resolves with `200` instead of redirecting to apex
**Evidence:** `https://www.manhwaindex.com/` → `200` (no redirect). Canonical tag on that response correctly points to `https://manhwaindex.com/`, so Google-side duplicate indexing is unlikely, but the duplicate host is still fully crawlable and wastes crawl budget across ~18,000 URLs × 2 hostnames.
**Fix:** Add a Cloudflare redirect rule: `www.manhwaindex.com/*` → `301` → `https://manhwaindex.com/$1`. Do not rely on canonical tags alone for host-level duplication.

### 4. Trailing-slash normalization uses `307` instead of `301`
**Evidence:** `https://manhwaindex.com/about/` → `307 Temporary Redirect` → `/about`. Same pattern confirmed on `/manhwa/solo-leveling/`. This is almost certainly Cloudflare's automatic behavior, not an explicit Astro/Worker redirect.
**Impact:** `307` signals "temporary" to crawlers, so link-equity consolidation onto the canonical no-slash URL is weaker than a `301` would give, and some crawlers re-check the slash variant more often than they should across a large site.
**Fix:** Serve slash→no-slash redirects as `301` explicitly (Worker route or Cloudflare redirect rule set to "Permanent Redirect (301)") rather than depending on default platform behavior.

### 5. Character pages are 79% of the site and are thin, templated content
**Evidence:** `sitemap-character-1.xml` (5,000 URLs) + `sitemap-character-2.xml` (5,000) + `sitemap-character-3.xml` (4,189) = **14,189 character pages** out of ~17,908 total indexed URLs (core 220, manhwa 1,000, manga 1,000, manhua 499, anime 1,000). Sample page `/character/mikasa-ackerman` is 46KB with a JSON-LD block listing 11 `@type` entries but body content is largely a list of linked titles she appears in — low unique text density per page at this URL count.
**Impact:** At 18k pages with 79% being low-value templated pages, Googlebot's crawl budget is disproportionately spent on character pages instead of the ~3,500 actual title pages that carry the site's real value (where-to-read/watch listings). Risk of "Crawled – currently not indexed" accumulating in GSC for the long tail of character pages with minimal unique text.
**Fix:** Prioritize `lastmod`/`priority` in the character sitemaps lower than title sitemaps (already separated into their own files, which is good — keep it that way). Consider `noindex` or consolidating character pages with very few associated titles (e.g., 1 appearance) into anchor sections on the parent title page instead of standalone URLs, and thicken remaining character pages with more unique descriptive text.

### 6. 119-deep pagination on `/character/page/N`
**Evidence:** `/character/page/119` → `200`, `/character/page/120` → `404`. `rel="next"`/`rel="prev"` are present and correct, and pagination URLs are included in `sitemap-core.xml` (confirmed `/manhwa/page/2` present).
**Impact:** 119 near-duplicate list pages compound the crawl-budget issue in #5 — each is a thin index page pointing at already-thin character pages.
**Fix:** Not urgent to change structurally since prev/next is implemented correctly, but consider raising items-per-page to cut page count, and confirm these pagination pages carry no unique indexable value beyond page 1 (they don't need heavy SEO investment).

---

## Medium

### 7. Transient 404s observed on sitemap child files during this audit
**Evidence:** First pass: `sitemap-core.xml`, `sitemap-manhwa.xml`, `sitemap-manga.xml`, `sitemap-manhua.xml`, `sitemap-anime.xml`, and all 3 character sitemaps returned `404` with the custom "Not found" HTML page (`cf-cache-status` mix). Second pass (no-store) all returned `200` with correct XML and expected URL counts. The root `sitemap.xml` also briefly returned an unexpected flat 2.2MB `<urlset>` on the very first fetch before settling into the correct `<sitemapindex>` (8 children, 965 bytes) on all subsequent fetches.
**Impact:** If this pattern occurs for real crawlers (not just this audit run), Googlebot/Bingbot could hit a `404` on a sitemap file, log it as an error in Search Console, and skip that chunk of URLs until the next crawl attempt.
**Fix:** This looks like a deploy-in-progress or edge-cache-repopulation artifact (`cf-cache-status: MISS`→`HIT` transitions observed) rather than a structural bug. Recommend: (a) set explicit `Cache-Control` (e.g., `public, max-age=300`) on sitemap responses so stale/negative caching doesn't linger post-deploy, and (b) check Cloudflare Workers deployment logs / GSC "Sitemaps" report for repeated fetch failures around 2026-09-13 12:00 UTC to confirm whether this was a one-off deploy race condition.

### 8. Google Fonts stylesheet is render-blocking
**Evidence:** `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira...&display=swap">` in `<head>`, one blocking CSS request per page across all sampled pages (bytes-for-page consistent at ~30KB inline + 1 external stylesheet).
**Impact:** Adds one blocking round trip before first paint; `display=swap` already prevents invisible-text FOIT, so this is a minor LCP/INP-adjacent issue, not a CLS risk.
**Fix:** Self-host the two Saira font files (already preconnecting to `fonts.gstatic.com`, so the win is small) or inline the critical `@font-face` CSS to remove the extra request; keep `font-display: swap`.

### 9. One `<img>` missing `width`/`height` and using `loading="lazy"` above a reasonable fold boundary
**Evidence:** On `/manhwa/solo-leveling`, the YouTube thumbnail `<img src="https://i.ytimg.com/vi/.../hqdefault.jpg" alt="" loading="lazy">` has no explicit dimensions (the LCP cover image itself is correctly sized with `width="460" height="651" fetchpriority="high"`, no lazy-load — that part is done right).
**Impact:** Minor CLS risk on this specific image slot if it renders before layout is otherwise settled; also missing `alt` text (accessibility/SEO minor).
**Fix:** Add explicit `width`/`height` matching the rendered box, and a descriptive `alt`.

---

## Low

### 10. Root canonical includes trailing slash, inner pages do not
**Evidence:** `/` → canonical `https://manhwaindex.com/`; every other sampled page (`/about`, `/manhwa`, `/manhwa/solo-leveling`, etc.) → canonical with no trailing slash, consistent with `build.format: 'file'`.
**Impact:** Cosmetic inconsistency only; `https://manhwaindex.com` and `https://manhwaindex.com/` are treated as equivalent by all major engines. Not worth urgent action.
**Fix:** Optional — normalize root canonical to `https://manhwaindex.com` for internal consistency.

### 11. No IndexNow implementation detected
**Evidence:** No IndexNow key file checked/found at `/‹key›.txt`; no evidence of ping calls in the codebase scope of this audit.
**Impact:** Bing/Yandex/Naver won't get near-instant notification of new/updated title pages; relies on their own crawl schedule instead, which matters less for Google (majority of traffic target) but is a low-cost win.
**Fix:** Generate an IndexNow key, host `/<key>.txt`, and call the IndexNow API on publish/update from the ingest pipeline (`ingest.log` suggests there's already a content pipeline that could hook in).

---

## What passed cleanly (no action needed)

- **robots.txt**: `200`, simple `Allow: /` + correct `Sitemap:` pointer, no accidental blocks.
- **Sitemap structure**: proper `sitemapindex` → 8 child sitemaps, each ≤5,000 URLs (under the 50,000/50MB protocol limits), `lastmod` present.
- **Canonicals**: self-referencing and correct on every sampled page, including on `www`/`http` duplicate-host variants.
- **404 handling**: real `404` status code with a proper HTML error page (`noindex,follow` on the 404 template itself — confirmed via the 404-styled body served for the transient sitemap issue).
- **Case-sensitive URLs**: `/Manhwa/Solo-Leveling` correctly 404s rather than serving duplicate content at a different case.
- **Trailing-slash → no-slash redirect logic**: works correctly for the `file` build format (only the 307-vs-301 status is a nit, see #4).
- **Mobile viewport**: `width=device-width, initial-scale=1` present on every sampled page.
- **JS rendering**: fully static/SSR HTML; no `client:load`/hydration-island markers found; content is present without executing JavaScript — zero CSR-dependency risk for crawlers.
- **Structured data**: JSON-LD present on all content types checked (`Book`, `TVSeries`, `Person`, `AggregateRating`, `ReadAction`/`WatchAction`) — good coverage for rich results eligibility.
- **hreflang**: correctly absent — single-language (`en`) site, no false signal needed.
- **Pagination**: `rel="next"`/`rel="prev"` correctly implemented, pagination pages included in sitemap.
- **Filter pages** (`/manhwa/only/official` etc.): unique titles, descriptions, and self-canonicals — not thin/duplicate despite being facet-style URLs.
- **LCP image**: cover art correctly uses `fetchpriority="high"`, explicit dimensions, no lazy-loading, and a `preconnect` to its origin (`s4.anilist.co`) is already in place.
