# "Readers also look for": the monthly refresh

A few pages already rank near the top of Google. Some related pages sit just
off the first page (position 8 to 20). The "Readers also look for" block puts
up to three plain links from the first kind to the second, and only when the
catalog proves they belong together (same story, the story's cast, an
adaptation). The links live in `data/boost-links.json`.

The rules are in `src/lib/boost-core.mjs`, the script is
`scripts/build-boost-links.mjs`, and the block is
`src/components/AlsoLookFor.astro`.

Most of those pages have no related page ranking well enough to link to them
(266 of 318 in September 2026; Anos Voldigoad, 2,390 impressions at 10.6, was
the biggest). The same script also writes `data/home-boost.json`, and the home
page links the best 20 of them under "Popular characters right now"
(`src/components/PopularNow.astro`). They are ranked by impressions times
closeness to page one (1 at position 8, 1/13 at position 20). A page that got
a "Readers also look for" link this month is left out, because it already has
its push; so is a page whose top search names another story. Every page on
the list answered 200 on the live site the day the script ran, and each face
is AniList's small copy, checked the same way.

## Once a month

1. **Pull Search Console** for `sc-domain:manhwaindex.com`, last 28 days, web
   search, into `tasks/gsc-data/`:
   - `pages.json`: rows by page. The gsc-mcp tool `gsc_performance` with
     `dim: "page"` and `limit: 25000` gives these.
   - `query_page.json`: rows by query and page together. `gsc_performance`
     takes one dimension only, so use the Search Analytics API
     (`searchanalytics.query`, dimensions `["query", "page"]`, `rowLimit`
     25000). Without this file the script still runs, but anchors fall back
     to plain page names and the "wrong story" check is off.

   Both files hold the API's own rows (`keys`, `clicks`, `impressions`,
   `position`), as a JSON array or as `{ "rows": [...] }`.
2. **Run** `node scripts/build-boost-links.mjs`. It reads the live catalog
   shards and each source page from the site (reads only), prints every pair
   with its reason, then the 20 home page links, and writes
   `data/boost-links.json`, `data/home-boost.json` and
   `tasks/gsc-data/boost-baseline-<date>.json`. Add `--dry` to print without
   writing. `--home <file>` writes the home list somewhere else.
3. **Read the printed pairs and the home list.** Every pair line says why the
   two pages are related. Delete a pair, or a home row, from the JSON by hand
   if it reads wrong. A home row whose page did not answer 200 was already
   skipped, and the next page on the list took its place.
4. **Commit and deploy** as usual. The edge cache key carries the build time,
   so the new links show after the deploy with no purge. The home page is
   built as a file, so its block changes with the same deploy.
5. **Three to four weeks later**, pull Search Console again and compare each
   target's position with the baseline file. Keep what moved; the next run
   replaces the whole file anyway, so dead pairs drop out on their own. The
   home list is replaced the same way: a page that reached the first page
   leaves it, and the next one in line comes in.

## What the script will not do

- Link pages that only share a crossover (Isekai Quartet) or an AniList
  "similar" list.
- Link a target whose top search names a different story (the Made in Abyss
  Kiwi gets "cyberpunk edgerunners kiwi" searches). Those are same-name
  mix-ups; the namesake note on the character page handles them.
- Add a link the source page already has. The block's own links are ignored
  in that check, so a pair survives from one month to the next.
- Give one page more than three links, or one target more than three sources.
- Put a page on the home list that moved (301) or went away, or a face that
  does not load. The row keeps its name without the face.
