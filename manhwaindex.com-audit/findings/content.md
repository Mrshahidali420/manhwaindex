# manhwaindex.com — On-Page & Content SEO Audit

Sampled 2026-09-13 via live fetch (Node `fetch`, no cache). Sitemaps used to source real slugs: `sitemap-manhwa.xml` (1,000 URLs), `sitemap-manga.xml` (1,000), `sitemap-manhua.xml` (499), `sitemap-anime.xml` (1,000), `sitemap-character-1/2/3.xml` (5,000 each → ~15,000 character pages). Character pages are therefore the large majority of the site's ~18,000 URLs, which makes their content depth the single biggest lever on this audit.

Pages sampled: `/`, `/manhwa`, `/anime`, `/character`, `/genre`, `/where-to-read`, `/about`, `/privacy`, `/contact`, `/dmca`, `/manhwa/solo-leveling`, `/manga/chainsaw-man`, `/manhua/tamen-de-gushi`, `/anime/attack-on-titan`, `/anime/demon-slayer-kimetsu-no-yaiba`, `/character/eren-yeager`, `/character/queen-serenity`, `/character/luna-5407`, plus a 14-page spot-check of minor character slugs (`/character/shou-utsumi`, `/character/jiuqing-su`, `/character/lin-shao-jiangjun`, `/character/wei-wei-213680`, `/character/ramases-ii`, etc.).

---

## CRITICAL

### 1. A large share of character pages have no bio at all — thin/near-empty content at ~15,000-page scale
Evidence: of 14 minor character pages spot-checked, 5 have a completely absent "About" section (no H2, no bio text): `/character/shou-utsumi` (221 total words on page, zero bio), `/character/jiuqing-su`, `/character/lin-shao-jiangjun`, `/character/wei-wei-213680`, `/character/ramases-ii`. Several more have a bio of under 25 words (`/character/yuuta-hibiki` — 23 words, `/character/akane-shinjou` — 20 words, `/character/jiang-ting` — 8 words, `/character/yan-xie-212458` — 12 words). Compare to a "good" character page like `/character/eren-yeager` (516 words total) or `/character/ami-mizuno` (92-word bio). Since AniList's character descriptions are the underlying source and many characters simply have no AniList bio, this isn't a code bug — it's an unavoidable consequence of the data source at this page count.
Why it matters: this is precisely the "thin/auto-generated with no unique value" pattern the Sept 2025 QRG and AdSense's content policy flag. With ~15,000 character URLs in the sitemap, a meaningful fraction rendering as a stub page (name + romaji + "Appears in 1 title" + a link list, no unique prose) is a plausible reason for AdSense to reject the whole property or de-index the character section, even though the rest of the site is solid.
Fix:
- Before AdSense review, either (a) `noindex` any character page whose bio is empty or under ~40 words, or (b) exclude those URLs from the sitemap until a bio exists, or (c) auto-generate one templated but genuinely useful sentence from data you already have (series name, role — Main/Supporting, age, gender, first appearance) instead of shipping an empty "About" section. Do not submit the full character sitemap to AdSense/Search Console until this is resolved.
- Add a build-time check that reports the percentage of character pages with bio length under 40 words so this is measurable over time, not just spot-checked.

### 2. Templated meta descriptions repeat the same platform name — systemic bug, not isolated
Evidence:
- `/manga/chainsaw-man` → "Chainsaw Man is officially readable on MANGA Plus, MANGA Plus, MANGA Plus and 6 more. Finished, 232 chapters."
- `/manga/jujutsu-kaisen` → "...officially readable on MANGA Plus, MANGA Plus, MANGA Plus and 4 more..."
- `/manhwa/omniscient-reader` → "...officially readable on Naver Webtoon, WEBTOON, WEBTOON and 7 more..."
Root cause: the description generator lists the first 3 platform records without de-duplicating by platform name when the same platform has multiple language editions (MANGA Plus in English/Thai/French/Spanish etc. are 4 separate rows).
Why it matters: this is a machine-generated, visibly broken snippet on what is likely hundreds to low-thousands of title pages (any title with 2+ language editions on the same platform — common for MANGA Plus, WEBTOON, Kakao Webtoon). It reads as auto-generated junk to both users and Google's quality systems, and duplicated tokens in meta descriptions can trigger Google to rewrite the snippet anyway (lost CTR control), and it's a bad look mid-AdSense-review.
Fix: de-duplicate by platform display name (not by row) before building the sentence, e.g. `[...new Set(platforms.map(p => p.name))].slice(0,3).join(", ")`. Ship this as a single template fix — it will self-correct every affected page on the next build without per-page edits.

---

## HIGH

### 3. Category/browse pages have zero structured data and flat heading hierarchy
Evidence: `/manhwa`, `/anime`, `/character`, `/genre` all return `jsonLdTypes: []` and `h2count: 0` (only the site's fixed 3 `<h3>`s in the layout chrome). The homepage has `WebSite` schema; title pages have `Book`/`TVSeries`; character pages have `Person`. But the four browse/index pages — which list hundreds of items each — carry no `ItemList`/`CollectionPage` schema and no H2 sections to organize the content (word counts 289–843, mostly link lists).
Why it matters: these are exactly the pages best positioned to earn rich results and AI-citation surfacing (they're topic hubs), and currently they're the least structured pages on the site.
Fix: add `CollectionPage` + `ItemList` JSON-LD to `/manhwa`, `/manga`, `/manhua`, `/anime`, `/character`, `/genre`, listing the top N items with `position`/`url`/`name`. Add at least one real H2 (e.g. "Popular manhwa", "Browse by status") instead of relying on filter-chip labels for structure.

### 4. No author/editorial identity anywhere except the DMCA page
Evidence: `hasAuthorByline` is `false` on every sampled page except `/dmca` (which mentions a "designated agent," not a named author). `/about` (448 words) explains what the site does and does not do but never names who runs it, their background, or credentials. No `Organization`/`Person` schema with a real name is present anywhere.
Why it matters: Trustworthiness is the highest-weighted E-E-A-T factor (30%) and Google's guidance for YMYL-adjacent and AdSense review specifically looks for "who is behind this site." A purely automated catalog with an anonymous "About" page is a weaker trust signal than one with even a first name, a short "why I built this" line, or a business entity name.
Fix: add a real name (or registered business name), a one-paragraph "why this exists" note in first person on `/about`, and `Organization` JSON-LD (name, url, logo, sameAs) site-wide via the layout. This is a content change, not a data-pipeline change, so it's low-effort relative to impact.

### 5. `/genre` is the thinnest page in the core sample
Evidence: 289 words, 0 internal H2s beyond chrome, 47 internal links (all just genre-name links, no descriptive text about what genres are or how to use the page).
Why it matters: falls below even the loosest "page type" floor for a hub/category page and offers no unique value beyond a link list — same thin-content risk as issue #1, just at the top of the hierarchy instead of the bottom.
Fix: add 2–3 sentences per major genre cluster (e.g. "Action" vs "Isekai" vs "Romance") explaining what readers get, plus a short intro paragraph above the grid.

---

## MEDIUM

### 6. Title tags are template-uniform in structure (acceptable) but one hits the truncation edge
Evidence: core page titles cluster tightly at 53–71 characters (`/` = 58, `/manhwa` = 58, `/anime` = 58, `/character` = 65, `/genre` = 53, `/where-to-read` = 71). 71 characters will truncate in most SERP renderings (roughly a 60–65 character safe zone).
Fix: trim `/where-to-read`'s title ("Where to read manhwa, manga and anime legally — every official platform") to under 60 characters, e.g. "Where to read manhwa, manga & anime legally".

### 7. Single-platform title meta descriptions are fine — confirms fix #2 is narrow and safe
Evidence: `/manhua/tamen-de-gushi` → "Tamen De Gushi is officially readable on Tencent Comics. Still releasing." (correct grammar, singular). Same sentence generator produces a clean result when there is no duplicate platform, so the fix in #2 only needs to touch the de-duplication step, not the whole template.
No separate fix needed beyond #2.

### 8. No visible "last updated" / freshness signal on title or character pages
Evidence: none of the sampled title (`/manhwa/solo-leveling`, `/anime/attack-on-titan`) or character pages expose a `dateModified` in their `Book`/`TVSeries`/`Person` JSON-LD. Only `/privacy` and `/dmca` show a date. The site does claim in footer copy on `/character` ("The index rebuilds itself every day at 02:00 UTC, so broken links fix themselves") that data is fresh — a good signal in prose — but it is not machine-readable per page.
Fix: add `dateModified` to the existing `Book`/`TVSeries`/`Person` JSON-LD blocks, sourced from the AniList sync timestamp already used for the daily rebuild.

### 9. Category-page H1s are generic single words, compounding the structure gap
Evidence: H1s are just "Manhwa", "Anime", "Characters", "Genres" — acceptable for a hub page, but combined with the missing H2 structure (#3) and thin word count (#5), these pages read as index scaffolding more than content pages.
Fix: covered by #3 and #5 — adding real H2 sections resolves this incidentally.

---

## LOW

### 10. Internal anchor text is descriptive and consistent — positive finding, no fix needed
Evidence: nav and card links use full series/character names as anchor text (e.g. "Solo Leveling ★ 8.4 Manhwa · Finished", "Eren Yeager anime") rather than "click here"/"read more". Preserve this pattern when templates change.

### 11. Robots meta and canonicals are clean across the sample
Evidence: every sampled page returned a self-referencing canonical and no `noindex`/`nofollow` robots meta. No action needed now; re-check after adding `noindex` to thin character pages per #1 so canonicals stay correct.

### 12. AdSense-policy-relevant pages are already solid — positive finding
Evidence: `/dmca`, `/about`, `/contact`, `/privacy` all exist, all have a working `mailto:` contact, `/dmca` and `/privacy` carry dates, and page copy explicitly states no hosted chapters/episodes and links only to official platforms (matches the stated legal-catalog positioning). This is a strength going into AdSense review — the policy pages already exceed typical minimums for a catalog site.

---

## Priority order for AdSense readiness
1. Fix #1 (thin/empty character bios) — highest risk to approval given it affects a large share of ~15,000 of ~18,000 total pages.
2. Fix #2 (duplicated platform names in meta descriptions) — one template fix, ships everywhere at once.
3. Fix #4 (add real author/org identity) — cheap, directly strengthens Trustworthiness before submission.
4. Fix #3 and #5 (structure/schema on hub pages, genre page depth) — improves AI-citation readiness and hub authority.
5. Fix #6 and #8 (title length trim, dateModified schema) — low-effort polish.
