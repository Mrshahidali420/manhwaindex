# Structured Data Audit — manhwaindex.com
Audited: 2026-09-13 · Pages checked: `/`, `/manhwa`, `/anime`, `/genre`, `/where-to-read`, `/about`, 2 manhwa titles (`solo-leveling`, `tower-of-god`), 2 anime titles (`attack-on-titan`, `jujutsu-kaisen`), 2 characters (`jin-u-seong`, `hae-in-cha`). Fetched raw HTML via Node `fetch` (static Astro output — JSON-LD is server-rendered, confirmed present in raw HTML with no SPA hydration needed).

## 1. Detection summary

| Page | JSON-LD | Type(s) | Microdata/RDFa |
|---|---|---|---|
| `/` | 1 block | WebSite (+SearchAction) | none |
| `/manhwa` | **0** | — | none |
| `/anime` | **0** | — | none |
| `/genre` | **0** | — | none |
| `/where-to-read` | 1 block | WebPage | none |
| `/about` | 1 block | AboutPage (nested Organization as `publisher`) | none |
| `/manhwa/solo-leveling` | 1 block | Book (+Person authors, VideoObject trailer, AggregateRating, ReadAction[]) | none |
| `/manhwa/tower-of-god` | 1 block | Book (same shape) | none |
| `/anime/attack-on-titan` | 1 block | TVSeries (+Person, VideoObject trailer, AggregateRating, WatchAction[]) | none |
| `/anime/jujutsu-kaisen` | 1 block | TVSeries (same shape) | none |
| `/character/jin-u-seong` | 1 block | Person (+subjectOf TVSeries/Book) | none |
| `/character/hae-in-cha` | 1 block | Person (same shape) | none |

No deprecated types (HowTo, SpecialAnnouncement, CourseInfo/EstimatedSalary/LearningVideo) and no FAQPage anywhere — nothing to flag under those rules.

## 2. Validation results

### CRITICAL
- **Broken trailer URLs on `/anime/attack-on-titan`** — `embedUrl` and `thumbnailUrl` on the `VideoObject` trailer contain a literal embedded tab character: `".../embed/LHtdKWJdif4\t"` and `".../vi/LHtdKWJdif4\t/hqdefault.jpg"`. Both are invalid URLs (will 404 or fail validators) and will get the whole `trailer` node rejected or ignored. This looks like a data-import artifact (trailing whitespace in the video ID from the source feed) rather than an isolated case — worth grepping the dataset for other trailing-whitespace IDs, since this shape (Book/TVSeries + VideoObject trailer) repeats across ~18,000 pages.

### WARN (fails required-property checks for the intended rich result / entity type)
- **VideoObject trailers site-wide are missing `uploadDate`** (required by Google's Video indexing guidelines whenever a VideoObject is meant to be independently indexable) and `description`. As authored today they're valid schema.org markup but won't qualify for video rich results if that's ever wanted. Low priority since they're link-outs to YouTube trailers, not owned video — flagging only if video visibility becomes a goal.
- **Book type used for `bookFormat: GraphicNovel` has no ISBN/`identifier`.** Not required for schema.org validity, and Google has no manhwa-specific rich result, so this is fine to leave as-is — Book is the correct off-the-shelf type for a webtoon/manhwa entity (there is no `ComicSeries` type in schema.org; inventing one would be non-standard). No action needed.

### INFO
- **AboutPage's `Organization` (as nested `publisher`) is the only Organization entity on the entire site**, and it's buried on `/about` only — it isn't referenced from `/`, from title pages, or from the `WebSite` node. Google's Organization/logo knowledge panel signals want a standalone, sitewide-referenced Organization node (ideally with `@id` reuse). This is a genuine missing opportunity, not a validation failure.
- **No `FAQPage` anywhere** — correct given FAQ rich results are retired for all sites; no action needed, and none should be added purely for SERP purposes. If you want AI/GEO citation value on `/where-to-read` (e.g. "is manhwaindex free/legal"), that's a legitimate reason to add one — see §4.

## 3. Missing opportunities (ranked)

1. **BreadcrumbList — missing on every single page.** Highest-value, zero-risk addition (site has a clear catalog hierarchy: Home → Manhwa/Anime → Title → Character). Improves SERP breadcrumb display and gives AI crawlers explicit hierarchy.
2. **ItemList / CollectionPage on `/manhwa`, `/anime`, `/genre`.** These are the three pages whose entire job is listing ~18,000 titles, and none carry any schema. `ItemList` (with `itemListElement` → `url`/`name`/`position`) is exactly what these pages are for. This is the single biggest structured-data gap on the site relative to its actual content model.
3. **Sitewide Organization entity**, referenced via `@id` from `WebSite.publisher` and reused everywhere (not just buried in `/about`). Needed for logo/knowledge-panel eligibility and for AI to resolve "who runs this site" consistently.
4. **Bidirectional Person ↔ TVSeries/Book linking.** Currently `Person.subjectOf` points at the title, but the Book/TVSeries node has no reciprocal `character` property pointing back at the Person pages. Since these are hand-curated character pages, adding `character: [{"@type":"Person","name":...,"url":...}]` to the title's JSON-LD (or vice versa keeping it light) meaningfully strengthens the entity graph for AI citation — this is a GEO win more than an SERP one.
5. **`@id` on Person/Book/TVSeries nodes** for stable entity identity across pages (character page's Person and the title page's author/character references should resolve to the same node).
6. **`inLanguage`, `url` (self-referencing), `isPartOf` (→ WebSite)** missing from every Book/TVSeries node — cheap, safe additions.
7. Optional/low-priority: `FAQPage` on `/where-to-read` purely for AI/GEO (no SERP benefit) if the team wants LLM citation on "is this free/legal" questions.

## 4. Ready-to-paste JSON-LD

### A. Sitewide Organization (add once, e.g. in the base layout `<head>`, referenced by `@id`)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://manhwaindex.com/#organization",
  "name": "manhwaindex",
  "url": "https://manhwaindex.com",
  "logo": "https://manhwaindex.com/logo.png",
  "email": "hello@manhwaindex.com",
  "description": "An index of official, legal places to read manhwa, manga and manhua, and to watch anime."
}
```
*(Replace `logo` with the real absolute logo URL — check what's actually served before pasting; do not use a placeholder path.)*

### B. Homepage WebSite — link publisher to the Organization `@id`
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "manhwaindex",
  "url": "https://manhwaindex.com",
  "description": "Find the official place to read any manhwa, manga or manhua, and the official place to watch the anime.",
  "publisher": { "@id": "https://manhwaindex.com/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://manhwaindex.com/manhwa?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### C. BreadcrumbList — template for a manhwa title page (adapt segments per section)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://manhwaindex.com/" },
    { "@type": "ListItem", "position": 2, "name": "Manhwa", "item": "https://manhwaindex.com/manhwa" },
    { "@type": "ListItem", "position": 3, "name": "Solo Leveling", "item": "https://manhwaindex.com/manhwa/solo-leveling" }
  ]
}
```
Same pattern for `/anime/{slug}` (Home → Anime → Title) and `/character/{slug}` (Home → the title's section → Title → Character).

### D. ItemList for `/manhwa` (and analogously `/anime`, `/genre`) — paginate `itemListElement` to match the actual page's items
```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Where to read manhwa — official platforms for every series",
  "url": "https://manhwaindex.com/manhwa",
  "isPartOf": { "@id": "https://manhwaindex.com/#organization" },
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "url": "https://manhwaindex.com/manhwa/solo-leveling" },
      { "@type": "ListItem", "position": 2, "url": "https://manhwaindex.com/manhwa/omniscient-reader" }
    ]
  }
}
```
Generate `itemListElement` programmatically per page/pagination slice — do not hardcode more than the titles actually rendered on that page.

### E. Fixed trailer VideoObject (drop into existing Book/TVSeries JSON-LD, replacing the `trailer` node)
```json
{
  "@type": "VideoObject",
  "name": "Attack on Titan trailer",
  "description": "Official trailer for Attack on Titan.",
  "embedUrl": "https://www.youtube-nocookie.com/embed/LHtdKWJdif4",
  "thumbnailUrl": "https://i.ytimg.com/vi/LHtdKWJdif4/hqdefault.jpg",
  "uploadDate": "2013-01-01"
}
```
Strip the trailing tab/whitespace at the data-pipeline level (wherever the YouTube ID is joined into the URL string), not just on this one page — audit the source feed for the same defect.

### F. Person additions (character pages) — add `@id`, `url`
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://manhwaindex.com/character/jin-u-seong#person",
  "name": "Jin-U Seong",
  "url": "https://manhwaindex.com/character/jin-u-seong",
  "alternateName": "성진우"
}
```

## Files
- Findings written to: `C:\Users\SHAHID ALI\Desktop\manga-site-project\manhwaindex\manhwaindex.com-audit\findings\schema.md` (this file)
- No project files were modified — audit only, per instructions.
