# GEO / AI Search Readiness Audit — manhwaindex.com
Audited 2026-09-13. Live HTTP checks via Node against production; no project files touched.

## GEO Health Score: 61 / 100

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| Citability | 25% | 55/100 | Facts are structured but split across labeled fields, not a flowing self-contained answer sentence in body copy. |
| Structural Readability | 20% | 70/100 | Consistent H2 pattern per title page (What it is about, The facts, Is there an anime?, Who is in it), but headings aren't phrased as questions except one. |
| Multi-Modal Content | 15% | 55/100 | Cover art + YouTube trailer embed present (VideoObject in JSON-LD) — good, YouTube is the strongest brand-citation correlator. No alt text audited at scale; no charts/tables. |
| Authority & Brand Signals | 20% | 45/100 | Clear "official-sources-only" positioning and a strong /about answer block, but no author/Person entity, no sameAs social links, no Wikipedia/Reddit presence detected, Organization schema is minimal (no logo, no sameAs). |
| Technical Accessibility | 20% | 90/100 | Fully static Astro output — raw HTTP fetch already contains full content (no CSR gap), fast Cloudflare edge delivery, clean sitemap index. |

## AI Crawler Access (robots.txt)

`https://manhwaindex.com/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://manhwaindex.com/sitemap.xml
```

- No bot-specific rules at all — single wildcard `Allow: /`.
- Net effect: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, and CCBot are all currently allowed (nothing blocks any of them). Good for visibility, but the site can't yet distinguish "let them cite me" (search bots) from "let them train on me" (CCBot/anthropic-ai/cohere-ai) — the optional split recommended for GEO isn't implemented.
- No X-Robots-Tag blocking found on the pages checked (home, sample title page, about).

## llms.txt

Missing. `GET /llms.txt` returns Astro's 404 page (`noindex,follow`, HTTP 404) rather than a text file. No RSL 1.0 licensing signal found anywhere (no `<link rel="license">`, no RSL block in robots.txt or llms.txt). Draft provided at the end of this report.

## Citability Analysis (sample page: /manhwa/bastard)

- Page is served fully rendered (static HTML, 53 KB) — extraction is trivial for any crawler, no JS execution needed.
- Meta description is a solid direct-answer candidate: "Bastard is officially readable on WEBTOON, Naver Webtoon, WEBTOON and 6 more. Finished, 94 chapters." But this exact sentence does not appear verbatim in the visible body text — the same facts are scattered across a platform list and a "The facts" definition table. Answer engines strongly prefer a citable sentence in the actual passage, not just in `<meta>`.
- No single ~134–167 word self-contained paragraph exists per title page that an LLM could lift wholesale to answer "where can I read X" — the closest is the synopsis block ("What it is about"), which is AniList plot summary text, not an access-answer paragraph.
- Headings are declarative, not question-based, except one: "Is there an anime?" — that block ("Not yet. Bastard has no anime adaptation announced. Most series never get one, so the comic is the whole story for now.") is the best-formed answer on the page: direct first-sentence answer, self-contained, ~30 words.
- Schema.org `Book` type is present with `potentialAction: ReadAction` per platform — a strong machine-readable signal, but answer engines today cite prose more than schema, so schema alone won't win the citation.

## Structural Readability

- Consistent template across roughly 18,000 pages (Read it on / What it is about / The facts / Trailer / Is there an anime? / Who is in it) is a genuine strength — predictable structure helps LLM parsers generalize extraction across the whole catalog.
- No per-page `<time>` element, no `datePublished`/`dateModified` in JSON-LD, no `article:modified_time` meta.
- Global freshness claim exists ("The index rebuilds itself every day at 02:00 UTC") but only as homepage/about boilerplate — it isn't attached to the specific title page, so a citation of a single manhwa page carries no per-entity freshness signal.

## Authority & Brand Signals

- The /about page contains an excellent, quotable self-description: "manhwaindex is a free catalog of 2,499 comics, 1,000 anime and 14,189 characters... We never host chapters or episodes. Every outbound link goes to a publisher, a licensor or a streaming service that holds the rights." This is exactly the kind of passage AI Overviews / Perplexity like to cite for "what is manhwaindex" queries.
- `Organization` schema on /about has name, url, email but no logo and no sameAs (no links to Wikipedia, Reddit, a YouTube channel, X/Twitter, etc.).
- No social/brand links found anywhere in the homepage HTML (zero matches for twitter/x/reddit/youtube/facebook/instagram/tiktok/linkedin/wikipedia hrefs on /).
- Per the brand-mention correlation data, YouTube (~0.737) and Reddit presence are the strongest predictors of AI citation. The site embeds third-party YouTube trailers (good, contextually relevant) but has no owned YouTube channel, no visible Reddit community, and — expected for a young niche catalog — no Wikipedia entity yet.
- No author/reviewer byline anywhere. Less critical for a data-aggregation site than for editorial content, but a named maintainer or a "data verified" line would still help E-E-A-T.

## Technical Accessibility

- Astro static output confirmed: a raw Node `https.get()` (no headless browser, no JS execution) returns full page content — zero SSR/CSR risk for any AI crawler.
- Cloudflare edge caching (`cf-cache-status: HIT`, `cache-control: public, max-age=0, must-revalidate`) — fast TTFB, good for crawl budget across 18k pages.
- Sitemap index cleanly segments by content type (sitemap-manhwa.xml, sitemap-manga.xml, sitemap-manhua.xml, sitemap-anime.xml, three character shards) with lastmod dates — useful for crawl prioritization, though lastmod appears to be set to the crawl/build date across the board rather than tracking genuine per-entity changes, which weakens its value as a real freshness signal.

## Top 5 Highest-Impact Fixes (ranked)

1. Add a real llms.txt at the root. Effort: low (about 1 hour). Currently 404s. Draft below — ready to drop in as a static file at `public/llms.txt`.
2. Insert one self-contained answer sentence into the visible body of every title page, near the top, combining title + status + primary legal platform, for example: "Bastard is a finished, 94-chapter manhwa by Carnby Kim and Yeong-Chan Hwang. It is officially readable on WEBTOON (free, English) and 9 other official platforms — no anime adaptation exists yet." Effort: medium — one template change in the Astro title-page component, propagates automatically to all ~18,000 pages. This directly targets the 134–167 word optimal-citation-length guidance and closes the meta-description-only gap.
3. Add per-page freshness signals: a `dateModified` field in the Book JSON-LD (the AniList sync pipeline already knows the last-synced timestamp per entity) plus a visible "Availability checked <date>" line near the platform list. Effort: medium — one field addition to the data pipeline plus the template.
4. Add `sameAs` to the Organization schema and pursue owned brand-mention channels — at minimum a YouTube channel (aggregating the trailers already embedded) and a Reddit presence. These are the two strongest measured correlators with AI citation (~0.737 and "high" respectively). Effort: medium-high, ongoing.
5. Split robots.txt into an explicit allow-list for AI-answer-engine bots vs. training-only bots, even though the current wildcard already permits everyone. Being explicit signals intent and future-proofs against a stricter default if the site ever needs to restrict CCBot/anthropic-ai/cohere-ai training access while keeping GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot/Google-Extended fully allowed for citation. Effort: low.

## Platform-Specific Score Estimates

| Platform | Est. Score | Rationale |
|---|---|---|
| Google AI Overviews | 60/100 | Strong structured data and sitemaps aid discovery; lack of a body-text answer sentence and per-page freshness caps citation likelihood. |
| ChatGPT / OAI-SearchBot | 55/100 | Fully crawlable, but ChatGPT favors prose with a direct first-sentence answer, currently missing from body text. |
| Perplexity | 60/100 | Indexes structured facts well ("The facts" table format), and the /about passage is very citable for brand-identity queries. |
| Bing Copilot | 65/100 | Bingbot fully allowed, static HTML, clean sitemaps — best-served platform given no CSR blockers and Bing's reliance on classic crawl-plus-index. |

## Recommended llms.txt (draft — not yet created on the live site)

```
# manhwaindex

> Free catalog answering "where can I legally read or watch this manhwa, manga, manhua or anime?" Every title page lists the official publishers, licensors and streaming platforms that carry it. manhwaindex never hosts chapters or episodes and never links to unofficial or pirate sources. Title data, synopses, cover art and scores are sourced from AniList; the index rebuilds daily.

## Site
- Homepage: https://manhwaindex.com/
- About: https://manhwaindex.com/about
- Sitemap index: https://manhwaindex.com/sitemap.xml

## Content
- Manhwa titles: https://manhwaindex.com/sitemap-manhwa.xml
- Manga titles: https://manhwaindex.com/sitemap-manga.xml
- Manhua titles: https://manhwaindex.com/sitemap-manhua.xml
- Anime titles: https://manhwaindex.com/sitemap-anime.xml
- Characters: https://manhwaindex.com/sitemap-character-1.xml, sitemap-character-2.xml, sitemap-character-3.xml
- Genre browse: https://manhwaindex.com/genres

## Data and licensing
- Title metadata, synopses and cover art: sourced from AniList (https://anilist.co), a public community media database. Cover art belongs to its original publishers and is used for identification only.
- Scores cross-checked against MyAnimeList.
- manhwaindex adds no editorial fiction to titles or synopses; its original contribution is the curated list of official legal access points per title (platform, region, price tier, format).
- Outbound read/watch links point only to rights holders: official publishers, licensors and licensed streaming services. No aggregators, mirrors or unofficial readers are ever linked.

## Contact
- Email: hello@manhwaindex.com
```
