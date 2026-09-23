# My list, custom lists, AniList import and the "For you" feed (step 1)

Planned 23 Sep 2026. Step 2 (real accounts in D1 with two-way AniList sync) is
NOT part of this build, but the storage below is shaped for it.

## Findings

- Search slices hold `[title, url, coverFile, year, alt]` only: no AniList id,
  status, platforms or genres (`src/lib/search-shards.js:94-112`). They cannot
  resolve an AniList id.
- Title shard records hold everything (`scripts/make-shards.mjs:117-126,204-216`),
  but `recs` have no id and `recIds` is deleted after use.
- Paths are `/${sectionOf(item)}/${slug}` (`src/lib/section.mjs:26-33`); slugs
  never move, old paths 301 in the Worker.
- Title pages are Worker-rendered and edge-cached per (path, build, country), so
  every personal part must be client JS. The homepage is prerendered.
- `public/_headers` CSP `connect-src` does not allow `https://graphql.anilist.co`;
  import fails until it is added (line must stay < 2,000 chars).
- Static assets are free and never invoke the Worker, so new JSON files cost no
  Worker requests or CPU. Adding ~514 files (512 shards, the feed pool, the page) is well inside the per-deploy limit.
- Existing recommender pattern: `src/lib/moods.mjs:220-244`.

## Storage: localStorage key `mi_list_v1`

```
{ v:1, createdAt, updatedAt,
  titles: { "<anilistId>": {
      id, media:"ANIME"|"MANGA", ns, slug, title, cover,
      status:"PLANNING", progress:0, score:null, hidden:false,
      addedAt, updatedAt,
      genres:[≤4], tags:[≤6], rel:[ids ≤8],
      seen:{ status, sites:[≤4], nextAt, count, at } } },
  lists: [ { id:"l_<rand>", name, createdAt, updatedAt, ids:[…] } ],
  anilist: { user, importedAt, matched, skipped } | null }
```

- "My list" = every entry in `titles`; one tap adds with status PLANNING.
- Custom lists reference ids in `titles`; removing a title removes it from all
  lists; deleting a list never touches `titles`.
- Maps 1:1 to AniList: status/progress/score, `lists[].name` → customLists,
  `hidden` → hiddenFromStatusLists.
- Caps: 500 titles, 20 lists, names ≤ 40 chars, case-insensitive unique, empty
  lists allowed. Unknown `v` → raw copy kept under `mi_list_bad`, start fresh.

## New build-time data (from scripts/make-shards.mjs)

1. List shards `public/d/l/<id % 512>.json`:
   `{ "<id>": [ns, slug, status, nextAt, nextNum, count, [sites ≤4], popularity, srcId, [adaptIds ≤2], [recIds ≤4]] }`
   (~9 MB total in production, ~215 rows and a few KB gz per file; raised from 128 to 512 files after review on 23 Sep 2026).
2. Feed pool `public/d/feed.v1.json`: genres, top tags, airing anime (≤14 days),
   and the top 400 titles per section (~65 KB gz). Fetched only by list owners.
3. `_headers`: cache rules for both, and AniList in `connect-src`.

No new Worker route.

## Feed algorithm (`src/lib/feed-core.js`, pure)

- Status weights: CURRENT/REPEATING 1.5, COMPLETED 1.25, PLANNING 1.0,
  PAUSED 0.6, DROPPED −0.5 → genre and tag affinity vectors, normalised.
- Score = genre/tag affinity + 2.0 if related (anime ↔ its manga, AniList recs)
  + small popularity and score tie-breaks − 1 for a dropped story's relation.
- 12 picks, round-robin by section (≤ 4 per section), each with a reason line
  ("Because you saved Solo Leveling").
- Cold start: relations and one title's genres; empty profile → most popular.
- "Your list this week": airing ∩ list, next 7 days, ≤ 6.
- Alerts on /my-list: diff `seen` vs shard row (finished, new platform, episode
  soon), kept 7 days.

## Build order

1. `src/lib/shard-key.js`: `LIST_SHARDS`, `listBucket(id)`.
2. `src/lib/list-row.js` (new): row constants, cover helpers.
3. `src/lib/countdown-core.js` (new), used by `Countdown.astro`.
4. `scripts/make-shards.mjs`: `id` in `thin()`, keep `recIds`, write list
   shards and feed pool.
5. `public/_headers`: CSP and cache rules.
6. `src/lib/my-list.js` (new): store, caps, lists, storage event, GA4 helper.
7. `src/lib/list-data.js` (new): load shard rows and feed.
8. `src/lib/feed-core.js` (new).
9. `src/lib/anilist-import.js` (new).
10. `src/components/MyListButton.astro` (new): button and list popover.
11. `src/pages/[kind]/[slug].astro`: add the button (not on Full Bloom).
12. `src/pages/my-list.astro` (new, prerendered, noindex).
13. `src/pages/index.astro`: hidden "For you" section filled by client JS.
14. `src/layouts/Base.astro`: nav link "My list".
15. `src/styles/app.css`: styles.
16. `src/pages/privacy.astro`: "Your list" section.
17. `docs/ROADMAP-personalised.md`: mark step 1 done.

GA4: list_add, list_remove, list_status, list_create, list_rename, list_delete,
list_toggle, anilist_import, my_list_view, feed_view, feed_click.

## AniList import

Two browser POSTs to graphql.anilist.co (ANIME, MANGA) for MediaListCollection
by userName, with custom lists. Dedupe by media id, map through list shards,
count titles not in the index. AniList wins on status and progress. Clear
messages for user not found, private list, rate limit (429) and network errors.

## Edge cases

Storage blocked → in-memory fallback plus a notice. Removed titles keep their
card with a "No longer in the index" badge. Paths refresh from shard rows.
Multiple tabs → storage event. Manual reorder and share-a-list are later steps
(share ≈ 0.5 day, `?share=` on the same static page, no Worker cost).

## Verification

1. Node test of feed-core with synthetic lists.
2. Build: 512 list shards + feed logged, file count about +514 plus JS chunks, my-list noindex,
   CSP line < 2,000 chars.
3. wrangler dev: /my-list, /d/l/42.json, /d/feed.v1.json, button on a title
   page, none on Full Bloom, hidden "For you" on the homepage.
4. Browser: add, reload, lists, import (public, unknown, private, offline),
   second tab, GA4 DebugView.

## Owner decisions

1. One-tap status: PLANNING (recommended) or CURRENT.
2. Entry point: header nav link "My list" (recommended), not a mobile dock slot.
