# /my-admin upgrade — plan

Written 23 Sep 2026. Planning only; no source file was changed.
Marked **[VERIFY]** = an assumption I could not prove from the code or the live DB.

---

## 1. Current state audit (checked in code + live D1, read-only queries)

### Pipeline
- **Client**: inline script in `src/layouts/Base.astro` (lines ~158–629). Global `mi(row)`
  queues rows in `sessionStorage.mi_q`, holds them until a human movement
  (scroll/mouse/tap/key), gets a Turnstile pass from `/_p` (30 min, HMAC-signed,
  kept in `sessionStorage.mi_pass`), then flushes the queue with `sendBeacon('/_a')`
  on pagehide or at 15 rows. One visit ≈ one Worker request.
  Rows sent: `page_view_<proof>` (kind `view`), `not_found_<proof>` (kind `missing`,
  on pages with `data-missing="1"`), outbound clicks (`affiliate_amazon_<kind>` /
  `read_<site>` / `watch_<site>` / `outbound_other`), `leave` with dwell (50% sample).
  Owner's browser is excluded via `localStorage.mi_off=1` (set by `src/layouts/Admin.astro`).
- **Worker**: `src/worker.js` `recordEvent()` — checks pass, caps body 32 KB / 25 rows,
  allow-lists `kind` (`view read watch buy other leave missing`), inserts into `events`.
- **Schema**: `db/schema.sql` (hand-applied, no migrations folder). `events` (20 cols,
  4 indexes) + rollups `daily_totals`, `daily_types`, `daily_pages` (top 300/day),
  `total_pages`, `daily_countries`, `daily_clicks`, `daily_sources`, `daily_edges`, `rollup_log`.
- **Night job**: `src/lib/rollup.js`, cron `10 0 * * *` (`wrangler.jsonc`). Rolls up
  the last 4 unrolled days, prunes `events` older than 30 days.
- **Admin**: `src/pages/my-admin.astro` (Now), `my-admin/pages.astro`, `clicks.astro`,
  `journeys.astro`, `sections.astro`; helpers `src/lib/admin.js` (gate via cookie
  fingerprint of `ADMIN_SECRET`, ranges today/24h/7d/30d/all, plain-word helpers),
  queries `src/lib/admin-data.js`. Layout `noindex, nofollow`.

### Live numbers (D1, 15–23 Sep)
- 200–730 event rows/day; ~250–450 views/day; ~200–280 sessions/day; 22–35 outbound clicks/day.
- Views by section (5 days): manga 795, character 257, manhua 171, anime 165, manhwa 104,
  home 47, genre 29, where-to-read 26 … search 2, shop 1.
- No `pick_*` Amazon clicks recorded yet.

### What it shows today
Now (live 5 min, today totals, last 20 views, last 30 clicks, 404 list) · Pages (best /
most viewed, hand-off rate, dwell) · Clicks (platforms, shop kinds, section, top sending
pages) · Journeys (recent visits step by step, section moves) · Sections (four libraries,
countries, sources, a "Search words → go to Search Console" note, UTM links).

### Bugs / gaps found
1. **404 hits counted as clicks.** `rollup.js` `daily_clicks` and `admin-data.js`
   `clicksFor()` use `kind NOT IN ('view','leave')`, so `missing` rows land in click
   tables. Live: `daily_clicks` holds 17 `missing` "clicks". Fix to `kind IN ('buy','read','watch','other')`.
2. `SECTIONS` in `admin.js` lacks `genre, mood, schedule, platform, where-to-read,
   where-to-watch, search, my-list, shop` labels beyond the few listed → shown raw.
3. Answer pages (`/<kind>/<slug>/buy|free|like|characters`) share page_type with the
   title page; no section split for them (path is kept, so it can be derived).
4. Nothing from My list, For you feed, site search, Top picks by title, or 404 "next"
   links is in the own DB — those go to GA4 only (`track()` in `src/lib/my-list.js`) or nowhere.
5. "Bounce" is only a site-wide number; no per-page "left right away without a click".
6. No week-over-week comparison, no action hints — tables only.
7. Stale comments: Base.astro says "one extra request per page / robots do not run
   scripts"; wrangler.jsonc says bots don't run scripts. Both predate batching + Turnstile.
8. **Write ceiling risk [VERIFY]:** D1 bills one written row per index touched. `events`
   has 4 indexes → ~5 rows written per event. At today's ~1.6 events/view that is ~8 rows
   written per page view → the 100k/day D1 write limit is reached near **~12k views/day**,
   long before the 100k Worker requests. Check D1 → Metrics → "Rows written" against the
   events count to confirm the multiplier.

---

## 2. Questions the dashboard must answer

**Traffic & sources**
- How many people came this week, and is that more or less than last week?
- Where did they come from (Google, Bing, typed, Reddit, my own tagged links)?
- Which countries, phone or computer?

**Content that works**
- Which pages bring the most people in (entry pages)?
- Which pages send people on to read/watch/buy (hand-off %)?
- Which pages bring people who leave right away **without clicking anything**?
- Which answer pages (free / like / buy / characters) pull their weight?
- Which characters, genres, moods get read?

**My list & For you (retention)**
- What did people save most this week? Which titles were marked Completed / Dropped?
- How many people use the list at all, and how many came back to it?
- Did AniList import work or fail (and why: empty / private / error)?
- Does the For you feed get clicked, and which positions?
- Do readers make custom lists (count only, never names)?

**Search**
- How many searches, dropdown vs full page?
- Which titles did people find through search (clicked result)?
- Which searches found nothing (see Privacy §4)?

**Money**
- Amazon: clicks by shop kind, Top picks vs BuyBox vs /shop, which titles/pages, which
  country store. (Sales stay in the Associates dashboard; we only have clicks.)
- Platforms: which read/watch services get clicked, from which titles.

**Site health**
- Broken links people hit (404s) and where they came from; do they use the "next" list?
- Pages viewed a lot with 0 clicks (likely empty or wrong platform data).
- Did last night's rollup run? How close are we to the D1 write / Worker limits?

---

## 3. Event and data design

### 3.1 New row types (all ride the existing `mi()` queue → **0 new requests**)
Add two allowed kinds in `worker.js` `KINDS`: `act` (list/feed/404-next) and `search`.
Add three event columns: `item TEXT` (title id, result path, or search words), `detail TEXT`
(status, result, surface, section), `pos INTEGER` (list position).

| name | kind | item | detail | pos | label | Sent from |
|---|---|---|---|---|---|---|
| list_add | act | title_id | status (PLANNING/READING/…) | 0 | title name | MyListButton |
| list_remove | act | title_id | section | 0 | title name | MyListButton, my-list |
| list_status | act | title_id | new status | 0 | title name | MyListButton, my-list |
| list_toggle | act | title_id | in / out | 0 | title name | MyListButton, my-list |
| list_create / list_rename / list_delete | act | '' | '' | lists count | '' | never the name |
| anilist_import | act | '' | result (ok/empty/error code) | matched | '' | never the username |
| my_list_view | act | '' | '' | titles count | '' | my-list |
| feed_view | act | '' | '' | picks | '' | index |
| feed_click | act | title_id | section | position | title name | index |
| miss_next | act | chosen href | '' | 0 | '' | 404 "next" list |
| search_pick | search | result path | dropdown / page | result position | result name | Base finder, search.astro |
| search_none | search | normalized words (§4) | dropdown / page | 0 | '' | Base finder, search.astro |

Amazon/platform clicks: unchanged (already `buy`/`read`/`watch`). Add `data-aff-src`
(`pick` / `buybox` / `shop`) on links and send it in `detail`, so "Top picks vs BuyBox
vs /shop" is answerable (today `pick_*` is only distinguishable by the shop_kind prefix).

### 3.2 Client wiring
- `src/lib/my-list.js` `track()`: after the gtag call, also call
  `window.mi({ name, kind: 'act', item: String(params.title_id||''), detail: …, pos: …, label: params.title||'' })`,
  guarded by `typeof window.mi === 'function'`. One place → every list/feed event covered.
  Map `params` → columns with a small pure function `toOwnRow(name, params)` (testable),
  with an **allow-list of keys**; anything else is dropped (so a future param can never
  leak a list name).
- Callers pass the title name where they have it: `MyListButton.astro` (`meta.title`),
  `my-list.astro` (entry title **[VERIFY]** the stored entry keeps `title`), `index.astro`
  feed links (add `data-title`).
- Search: `Base.astro` finder script (~lines 828–1035) and `src/pages/search.astro`:
  - on click of a result `<a>`: `mi({name:'search_pick', kind:'search', item: href path, detail, pos, label})`.
  - on a settled zero-result query (1.5 s idle, blur, or submit), once per distinct query
    per page: `search_none` with the normalized words (§4). Shared helper in
    `src/lib/finder-core.js`: `normalizeQuery(q)` → string or '' (rejected).
- `src/pages/404.astro`: click on `a[data-miss]` → `miss_next`.
- `mi()` itself must NOT rewrite `name` for `act`/`search` (it only touches view/missing — OK as is).

### 3.3 Worker (`src/worker.js`)
- `KINDS` += `act`, `search`. Insert statement += `item` (text 80), `detail` (text 40), `pos` (num 500).
- Server re-runs `normalizeQuery` on `search_none` items (never trust the page); a
  rejected item → row dropped.
- Move row cleaning into `src/lib/beacon-rows.js` (pure `cleanRow(row, country, now)`) so it can be unit-tested.

### 3.4 Schema — `db/migrations/0002-actions.sql` (new folder) + mirror into `db/schema.sql`
```sql
ALTER TABLE events ADD COLUMN item TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN detail TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN pos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_pages ADD COLUMN quick_exits INTEGER DEFAULT 0;  -- entered here, 1 page, 0 clicks
CREATE TABLE IF NOT EXISTS daily_actions (
  day TEXT, name TEXT, item TEXT, detail TEXT, label TEXT,
  n INTEGER DEFAULT 0, people INTEGER DEFAULT 0,
  PRIMARY KEY (day, name, item, detail));
```
No new index on `events` (each index costs a written row per insert). `ALTER … ADD COLUMN`
is not re-runnable: this file is run **once**, before the Worker deploy.

### 3.5 Rollup (`src/lib/rollup.js`)
- Fix `daily_clicks` filter (bug 1); one-off cleanup `DELETE FROM daily_clicks WHERE kind='missing'`.
- New `daily_actions` statement: `GROUP BY name, item, detail` for kinds `act`/`search`,
  plus `buy` rows grouped by path+detail (Amazon by title/source), top 200 per name.
  `search_none` rows kept only when `people >= 2` (one-off searches die with the raw rows).
- `daily_pages.quick_exits`: sessions whose step-1 page is this path, max step 1, and no
  click row. `daily_totals.bounces` stays; add the same "no click" variant there.
- All in the existing `db.batch`, still idempotent via `rollup_log`.

### 3.6 Retention
Raw `events` 30 days (unchanged, now also holds search words). Rollups kept forever,
except `search_none` which only survives when ≥2 people searched the same words.

### 3.7 Volume estimate
| | today | after |
|---|---|---|
| Worker requests/day (beacon + pass) | ~300–600 | +0 (same queue; maybe a few extra 15-row flushes) |
| event rows/day | ~560 avg | ~650–700 (feed_view ≈10, list ≈5–30, search ≈10–50) **[VERIFY]** usage unknown |
| D1 rows written/day (×5 index multiplier [VERIFY]) | ~2.8k | ~3.5k of 100k |
| nightly rollup rows | ~800 | +≤1 000 (daily_actions) |
| admin reads | a few k per open | + small (rollups are tiny) |

Headroom is fine now. The ceiling is D1 writes at ~10–12k views/day. Levers, in order:
drop redundant index `events_day_kind` (day prefix is covered by `events_day_type`),
raise `MI_LEAVE_SAMPLE` to 4, and stop writing `feed_view` if it proves useless.

---

## 4. Privacy

### Options
- **A. Clicked results only.** Send the result the person picked (a public catalog path)
  and its position. No typed text ever leaves the browser. Current policy stays true for
  search words; only the "what we count" paragraph gains a line. Cannot answer
  "which searches found nothing".
- **B. A + words of searches that found nothing (recommended).** Only zero-result
  searches send their words, normalized: lowercased, trimmed, spaces collapsed, 2–40
  chars; rejected if it contains `@`, `http`, `www`, `/`, or 5+ digits in a row
  (e-mails, links, phone numbers). Checked again on the server. Shown on the dashboard
  only when 2+ different people typed it; one-offs are deleted with raw rows after 30
  days. This is the actionable list: a title people want that the index lacks → add
  its AniList id to `data/keep.json`.
- **C. All query text, aggregated.** Rejected: people type names and odd things, and
  the extra data answers little that A+B don't.

**Recommendation: B**, shipped in the **same deploy** as the privacy text below. If the
owner would rather keep the "never sent" promise word for word, ship A and skip
`search_none`. List names and AniList usernames are never sent in any option (enforced by
the key allow-list in `toOwnRow`).

### Exact privacy page changes (`src/pages/privacy.astro`)
1. `updated` → release date; `dateModified` likewise.
2. Short version paragraph — replace
   "nothing you type is stored by us" with
   "nothing you type is stored by us, except the words of a search that found nothing (see below)".
3. "What we do not collect", search bullet — replace with:
   > Search runs on a static file inside your own device. What you type is not sent to
   > us, with one exception: if a search finds nothing, the words are sent to our own
   > counter so we can add the missing title. Words that look like an e-mail address,
   > a link or a phone number are never sent. When you pick a result, we count which
   > result you picked, not what you typed.
4. "Your list", sentence "Using the list is counted like any other click on the site; see
   Google Analytics below." → replace with:
   > Using the list is counted: which title was added, removed or given a status, and
   > whether an AniList import worked. Your list names and your AniList username are never
   > sent to us or to Google Analytics.
5. "Our own visit counter", first paragraph — append after "which link you clicked to leave":
   > , which titles are added to or removed from a list, which search result you picked,
   > and the words of searches that found nothing.
6. Retention bullet → 
   > Step-by-step records are deleted after 30 days. Only daily totals are kept. The words
   > of a search that found nothing are kept past 30 days only if at least two different
   > people searched for them.

---

## 5. Dashboard layout

Mobile-first, one column under 700 px, cards before tables. Every card = **question
(heading) → one big number or short ranked list → one "What to do" line** from
`src/lib/admin-hints.js`. Range picker stays (Today / 7 days / 30 days / All); every
7d/30d number shows "▲ 12% vs the 7 days before" from rollups (previous window is
always in rollups, so it is cheap).

Tabs (rename in `Admin.astro`): **Now · This week · Pages · Lists · Search · Money · Health** (Journeys folds into Pages as a sub-section).

| Tab | Card (question) | Metric | "What to do" hint (rule) |
|---|---|---|---|
| This week | How many people came? | people, views, visits, WoW % | drop >20% → "Check Search Console for lost pages" |
| This week | Where did they come from? | top 5 sources, WoW | new source in top 5 → "Someone links to you from X — look at it" |
| This week | What should I do today? | top 3 hints across all tabs | — |
| Pages | Which pages bring people in? | entries, hand-off % | high entries + hand-off < 2% → "Check this page's platform links; add a BuyBox" |
| Pages | Which pages make people leave right away? | quick_exits / entries (min 20 entries) | >70% → "The first screen does not answer the question — move the where-to-read box up". **Never suggest noindex.** |
| Pages | Which answer pages work? | free/like/buy/characters split by path suffix | — |
| Pages | How people move | section edges + recent journeys (existing) | — |
| Lists | What did people save most? | top titles by list_add (people) | saved a lot, few views → "Feature it on the homepage" |
| Lists | Which titles get finished / dropped? | list_status by status | many DROPPED → "Check the platform links still work" |
| Lists | How many people use the list? | people with any act, my_list_view | — |
| Lists | Does AniList import work? | ok / empty / errors by code | errors >20% → "Import is failing — test it" |
| Lists | Does "For you" get clicked? | feed_click / feed_view, by position | CTR <2% → "Feed is ignored — try fewer picks" |
| Search | How much do people search? | search_pick + search_none, dropdown vs page | — |
| Search | What do they find? | top picked results | — |
| Search | What found nothing? | words (≥2 people) | "Add the AniList id to data/keep.json and run the workflow" |
| Money | Where does Amazon money come from? | buy clicks by source (pick/buybox/shop), shop kind, title, country store | "Sales are in the Associates dashboard — compare with these clicks" (link) |
| Money | Which platforms get clicks? | read/watch by platform, WoW | top platform → "Put it first on title pages" |
| Money | Which titles send the most clicks out? | top paths by clicks | — |
| Health | Broken links people hit | 404 paths, count, referrer, miss_next used | "Add a redirect in data/redirects.json" |
| Health | Pages seen a lot with 0 clicks | views ≥20, clicks 0 | "The page may have no platforms — check the data" |
| Health | Is the counter healthy? | last rollup_log row, events/day, est. D1 writes vs 100k | rollup missing → "Night job did not run" |

Replace the "Search words" note on Sections with a link to the Search tab + a GSC link
(GSC still owns Google queries).

---

## 6. Implementation phases

### Phase 0 — fix and measure (Opus review, Sonnet edits; ~1 h)
- `src/lib/rollup.js`, `src/lib/admin-data.js`: `kind IN ('buy','read','watch','other')`; run the one-off cleanup DELETE.
- `src/lib/admin.js`: complete `SECTIONS`.
- Fix stale comments in `Base.astro`, `wrangler.jsonc`.
- Read D1 Metrics: rows written/day vs event rows → confirm the ×5 multiplier; decide on dropping `events_day_kind`.
- Verify: Clicks tab 7d total no longer includes 404s.

### Phase 1 — data plumbing + privacy (one release; Opus for worker/privacy, Sonnet for wiring)
Order of deploy matters: **migration → Worker → pages**. If the Worker ships before the
columns exist, every insert fails silently (the catch swallows it) and all rows are lost.
- New `db/migrations/0002-actions.sql`; mirror in `db/schema.sql`.
- New `src/lib/beacon-rows.js` (cleanRow, normalizeQuery re-check); `src/worker.js` uses it.
- `src/lib/my-list.js` `track()` bridge + `toOwnRow()`.
- `src/lib/finder-core.js` `normalizeQuery()`; search wiring in `Base.astro` and `search.astro`.
- `MyListButton.astro`, `my-list.astro`, `index.astro`: pass title name.
- `404.astro`: miss_next. `TopPicks.astro`, `BuyBox.astro`, `shop.astro`: `data-aff-src`; Base click handler sends it in `detail`.
- `src/lib/rollup.js`: daily_actions, quick_exits.
- `src/pages/privacy.astro`: §4 text.
- Tests (node:test, no new deps; new `tests/` folder, `"test": "node --test tests/"`):
  cleanRow (kinds, caps, unknown kind → other), normalizeQuery (email/url/phone rejected,
  length bounds), toOwnRow (drops non-allow-listed keys, never passes list names/usernames).
- Rollup test: `wrangler d1 execute manhwaindex-analytics --local --file tests/fixtures/events.sql`,
  then `wrangler dev --test-scheduled` + GET `/__scheduled?cron=10+0+*+*+*`, then query
  daily_actions / daily_clicks locally.
- Verify live: in a private window (not the owner's, `mi_off`), add a title, search a
  nonsense word, click a result, open a 404; next day query `events` for the new kinds.

### Phase 2 — dashboard (Sonnet builds from this spec; Opus reviews hints + copy)
- `src/lib/admin-data.js`: `actionsFor(db, range, name)`, `compareWeeks(db, table, metric)`, quickExitsFor.
- New `src/lib/admin-hints.js`: pure rule functions returning `{text, severity}`; unit tests with fixed inputs.
- New pages: `src/pages/my-admin/week.astro`, `lists.astro`, `search.astro`, `money.astro`,
  `health.astro`; reshape `pages.astro` (+ journeys section), `clicks.astro` → money, update tabs in `Admin.astro`.
- Mobile check at 360 px and desktop; no horizontal scroll except inside `.scroll` tables.
- Verify: every card renders an empty state in words ("Nobody saved anything yet") when there is no data.

### Phase 3 — optional
- Page speed: send `load_ms` (navigation responseStart / LCP) on the sampled leave row; "slowest pages" card. Needs another column.
- Amazon earnings: manual monthly entry field → compare with clicks. Only if the owner wants it (YAGNI).

### Risks
- Deploy order (above). Privacy text must land in the same deploy as `search_none`.
- `feed_view` fires on every home load — inflates rows; cap to once per session.
- Title name missing on `/my-list` rows → fall back to `humanize` on a path or show the id **[VERIFY]**.
- Low volume: most cards will be thin for weeks; hints need minimum counts to avoid noise.
- The admin must stay secret-gated and `noindex`; nothing here touches crawlers or rate limits.

### Sonnet vs Opus
- Mechanical (Sonnet): Phase 0 edits, SECTIONS, data-attributes, track bridge wiring, admin page markup from the table above, tests from the listed cases.
- Judgment (Opus): worker validation + normalizeQuery rules, privacy wording, rollup SQL (quick_exits, daily_actions caps), hint thresholds, final review.

---

## 7. Review: phases 0, 1 and 2 built (24 Sep 2026)

Nothing committed, pushed, deployed or run against the remote D1. Only read-only
remote reads were made (D1 metrics, `events` per day, `daily_clicks` by kind).
Phase 3 (page speed) not started, as agreed.

### Owner decisions applied
- **Privacy option B.** The picked result is always sent. Words are sent only for
  zero-result searches, cleaned by `normalizeQuery()` in the page AND again in
  the Worker, and shown only when 2+ different visitors typed them (people are
  counted across the dropdown and the full page together). The privacy page
  text is in this same change set, wording as in §4, dated September 24, 2026.
- **List names and AniList usernames can never be sent.** `toOwnRow()` reads a
  fixed set of keys per action (the allow-list). The Worker (`cleanRow()`) also
  blanks item and label on every count-only action and drops unknown action
  names. Both are tested.

### D1 writes per event (measured)
- Before: D1 metrics for 21–23 Sep = 4 164 / 4 694 / 5 862 rows written against
  391 / 557 / 681 events. That is 6.9–10.6 per event including the night job,
  or about **6 per insert** (the row + 4 indexes + the AUTOINCREMENT counter).
- After: every query that reads `events` was checked (rollup, admin-data, all
  admin pages). All of them now filter on `day` or read the newest rows by id,
  so only `events_day_kind` stays. **3 per insert** (the row + 1 index + the counter).
  §3.7 said to drop `events_day_kind`. I kept it and dropped `events_day_type`
  instead, because no query filters on page_type and many filter
  `day = ? AND kind = ?`. `events_ts` and `events_session` went too. The Now
  page reads the last 3 000 ids, which stays bounded however big the table
  grows. The 24h range, journeys and prune are all bounded by day.
- New rows add as little as possible. There is no new index. `feed_view` and
  `my_list_view` are sent once per visit, and each action is one row. The
  nightly `daily_actions` keeps at most 200 rows per action, and one-person
  search words are never kept.
- The ceiling moves from ~12k to ~25k page views a day before the 100k write limit.
- The AUTOINCREMENT counter write (1 of the 3) cannot be removed without
  rebuilding the table.

### Files
New: `db/migrations/0002-actions.sql`, `db/migrations/0003-drop-404-clicks.sql`,
`src/lib/beacon-rows.js`, `src/lib/own-count.js`, `src/lib/action-sql.js`,
`src/lib/admin-hints.js`, `src/lib/admin-more.js`, `src/components/admin/Hint.astro`,
`src/components/admin/Rank.astro`, `src/pages/my-admin/{week,lists,search,money,health}.astro`,
`tests/` (d1-shim.js + 4 test files).
Changed: `src/worker.js`, `src/lib/{rollup,admin,admin-data,finder-core,my-list}.js`,
`src/layouts/{Base,Admin}.astro`, `src/pages/{privacy,search,404,index,my-list,my-admin}.astro`,
`src/pages/my-admin/{pages,journeys,sections,clicks}.astro` (clicks now redirects to money),
`src/components/{MyListButton,BuyBox,TopPicks,Themes}.astro`, `src/pages/shop.astro`
(`data-aff-src`), `db/schema.sql`, `wrangler.jsonc` (comment only), `package.json`
(`npm test`), `.gitignore` (`.dev.vars`).

### Bugs fixed
- **404 hits counted as clicks.** Rollup, admin-data and the Now page now use
  `kind IN ('buy','read','watch','other')` (one constant, `CLICK`). The remote
  `daily_clicks` holds **5 rows / 17 false clicks** of kind `missing`.
  `0003-drop-404-clicks.sql` removes them (not run remotely).
- `SECTIONS` completed: genre, mood, schedule, platform, where-to-read/watch,
  search, my-list, about, contact, privacy, dmca. Answer pages ending in
  `characters` now get a name.
- Stale "robots do not run scripts" comments fixed (Base, wrangler.jsonc, admin footer).
- Range links: "Today" on a tab that opens on 7 days used to jump back to 7 days.
- Journeys counted list and search rows as page steps.

### Tests: `npm test` (node --test), 36 pass, 0 fail
- `cleanRow`: kinds, caps, unknown actions dropped, count-only actions blank
  names, search words cleaned again, the buy source list.
- `toOwnRow` allow-list.
- `normalizeQuery`: e-mail, URL, domain and phone rejected; 2–40 characters.
- Hint rules and floors, including a check that no hint ever says noindex.
- The real rollup and dashboard SQL, run on Node's SQLite against
  `db/schema.sql`: a 404 is not a click, quick exits, daily_actions, one-person
  words dropped, anonymous miss totals kept, a second run changes nothing,
  prune by day, and the raw / mixed / all ranges.

The tests caught two real bugs, both fixed: title ids were capped at 500, and a
regex typo let `mangadex.org` through.

### Verified locally
- `ALLOW_SHRINK=1 npm run build` passes (run twice, the second on the final code).
- Local D1 was built with the OLD schema (git HEAD), then 0002 and 0003 were
  applied. Only `events_day_kind` is left, old rows got the defaults, and the
  `missing` click row is gone.
- `wrangler dev --local` ran with a local-only `.dev.vars` (dummy Turnstile
  secret, local PASS_KEY). The pass was signed with the same HMAC as
  `issuePass`; no production check was changed. Rows sent: view, 404 +
  miss_next, feed_view and feed_click, list add / status / create, AniList
  import, an Amazon buy with its source, a read click, a search pick, and
  searches that found nothing (two people, one person, a phone number).
  A forged pass wrote nothing. The Worker dropped the phone-number search, the
  list name and the AniList username.
- The cron ran via `/__scheduled`: daily_actions, quick_exits and daily_clicks
  came out right. This run found a bug, now fixed: missing words were grouped
  per search box, so two people typing the same words in different boxes
  counted as two single people.
- Every tab × every range returns 200 when signed in and stays gated without
  the cookie. No list name, username or one-off search words appear in the
  HTML.
- Headless Edge at 390×844: page scrollWidth is 390 on all 10 pages checked,
  and no element passes the right edge outside a `.scroll` table. The
  screenshot showed table cells breaking mid-word; fixed.

### NOT verified
- A real browser session end to end: the Turnstile widget, sendBeacon, the
  finder's 1.5 s idle/blur timing, the 404 click, feed_view once per visit.
  Only the Worker and database side was driven, with hand-made batches.
- Real D1 rows written after the change. Check D1 Metrics a day after deploy:
  expect ~3 per event plus the night job.
- Desktop layout was not screenshotted. Only the 390 px check was run.
- Hint thresholds are judgement calls. With today's traffic most cards will be thin.

### Deploy sequence (in this order)
The Worker and the pages ship together (`.github/workflows/deploy.yml` runs on
push to master and again every day at 02:00 UTC), so "Worker → pages" is one
step. Running the migration first is safe: the live Worker keeps inserting its
20 columns and the new ones take their defaults. Shipping the code first is
NOT safe: every insert would fail silently and the day's rows would be lost.
```
npm test
npx wrangler d1 execute manhwaindex-analytics --remote --file db/migrations/0002-actions.sql
npx wrangler d1 execute manhwaindex-analytics --remote --command "SELECT name FROM pragma_table_info('events') WHERE name IN ('item','detail','pos'); SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='events'"
#   expect: item, detail, pos, and events_day_kind as the only named index
npx wrangler d1 execute manhwaindex-analytics --remote --file db/migrations/0003-drop-404-clicks.sql
git add -A; git commit; git push   # deploy.yml builds and deploys Worker + pages
```
If 0002 says "duplicate column name", it already ran. Do not edit the file;
check with the SELECT above. After deploy: the next morning, open
/my-admin/health and check that yesterday has a night job row. In a private
window, add a title, search the same nonsense words from two browsers, and hit
a 404.

### Remaining issues
- `src/layouts/Base.astro` is 1 062 lines (1 038 before; it was already over 800).
  Moving the counter script out is a separate job.
- "People" over 7 or 30 days is people per day added up, as on the old tabs.
- Clicks from before the deploy have no `data-aff-src`, so they show as "Not marked".
- `.dev.vars` exists locally for testing (gitignored). Delete it if you don't want it.

## 8. Visual redesign (24 Sep 2026)

Presentation only. Every query and every number means what it meant before.

- **Look:** `src/styles/admin.css` (imported only by `Admin.astro`), in the site's night palette. One colour per meaning: blue read, violet watch, amber Amazon, green up, rose down. Every change also says "up 12%" in words.
- **Frame:** sticky tab bar that scrolls sideways inside itself on a phone (the open tab is scrolled into view), a compact date switch (Today, 24h, 7 days, 30 days, All), and a board that is one column on a phone and two from 1000 px.
- **New components** in `src/components/admin/`: `Kpi` (big number, change arrow, small trend line), `Spark`, `Trend` (day-by-day area chart), `Columns` (stacked column chart), `BarList` (ranked rows with a bar behind each, platform logo, "…" for long names; replaces `Rank`), `Split` (one bar in parts with a legend), `ClickFeed` (one line per click, repeats folded into "×2"), `PageFeed`, `PlatformIcon` (the site's own `/brand/` logos, letter badge fallback).
- **Charts** are inline SVG drawn on the server by `src/lib/admin-chart.js`. No chart library, no outside request, CSP unchanged.
- **Data added:** `dailySeries()` and `closedDaysFor()` in `admin-more.js` read at most one small row per day from `daily_totals` and `daily_actions`; today's point is worked out from totals the page already has (`withToday`), so the raw table is not read again. The Now page's "whole of today" question was split in two index-bounded ones (people from views; views and clicks per hour for the chart).
- **Tests:** `tests/admin-chart.test.js`, 12 new (48 pass).
- **Screenshots:** `tasks/admin-shots/` (390 px and 1366 px, local fake data).
