# Search Console: finish what Google started (internal links)

Pulled 24 Sep 2026 from `sc-domain:manhwaindex.com`, web search. I asked for 16 months, but Google only has data from **13 Sep to 23 Sep 2026** (11 days: 1,360 clicks, 68,736 impressions). All numbers below cover those 11 days, so read them as early signals, not proven trends. Nothing on the site was changed.

## Summary

- **318 pages are in striking distance** (average position 8 to 20, at least 15 impressions). Together they had 27,235 impressions. 249 of them are character pages.
- **20 new links are worth adding** (16 solid pairs, 4 weaker ones). Another 19 related pairs already exist on the site, so there is nothing to add for those. 266 targets have no well-ranking related page yet, so the hand method cannot help them (see Section C).
- **51 queries land on the wrong page.** The biggest group is not a missing page. It is a **same-name mix-up**: the plain address (`/character/percival`) belongs to a little-known character, while the famous one the searcher wants sits on a longer address (`/character/percival-seven-deadly-sins`) that Google never shows.
- **Best first action:** on `/character/ram` (position 4.8), add links to Roswaal (445 impressions at 10.3), Frederica (199 at 10.3) and Ricardo (126 at 8.2). They are all Re:Zero characters and Ram does not link to any of them today.
- Raw data and CSVs: `tasks/gsc-data/`. The scripts are in the session scratchpad and can be rebuilt from this report.

How I checked "related": every pair comes from the live catalog shards (`/d/t/*.txt`, `/d/c/*.txt`), using the character's `appearsIn`, the title's AniList `relations`, and `similar`/`recs`. "Already linked" means I fetched the live source page with a normal browser user agent and looked for an `href` to the target.

## Table A: top 30 link pairs

"Source pos" is the source page's average position. Rows 1–16 are solid pairs, rows 17–20 are weaker (see the note under the table), and rows 21–30 are already done.

| # | Target page | Its top query | Pos | Impr | Source page (pos) | Anchor text | Why related | Already linked? |
|---|---|---|---|---|---|---|---|---|
| 1 | /character/roswaal-mathers | roswaal | 10.3 | 445 | /character/ram (4.8) | Roswaal Mathers | Both are Re:Zero characters | no |
| 2 | /character/frederica-baumann | frederica re zero | 10.3 | 199 | /character/ram (4.8) | Frederica Baumann (Re:Zero) | Both are Re:Zero characters | no |
| 3 | /character/ricardo-welkin | ricardo re zero | 8.2 | 126 | /character/ram (4.8) | Ricardo Welkin (Re:Zero) | Both are Re:Zero characters | no |
| 4 | /character/majikaja | majikaja | 8.7 | 123 | /character/shiggy/buy (3.0) | Majikaja | Both are Made in Abyss characters | no |
| 5 | /character/jiruo | jiruo | 9.3 | 98 | /character/shiggy/buy (3.0) | Jiruo | Both are Made in Abyss characters | no |
| 6 | /character/tear | tear slime | 9.1 | 88 | /character/suphia/buy (2.0) | Tear (Slime) | Both are Slime Season 2 characters | no |
| 7 | /character/misa-ilioroagu | misa misfit of demon king academy | 8.5 | 46 | /character/anos-voldigoad (10.6, 3 clicks) | Misa Ilioroagu (Misfit of Demon King Academy) | Both are Misfit of Demon King Academy characters. The source ranks low but gets clicks | no |
| 8 | /anime/banana-fish/characters | banana fish characters | 10.0 | 47 | /character/shorter-wong (3.0) | Banana Fish characters | Shorter Wong is a Banana Fish character | no |
| 9 | /character/chianti | chianti detective conan | 10.4 | 44 | /character/josei-kyaku (2.0) | Chianti (Detective Conan) | Both are Detective Conan characters | no |
| 10 | /character/vesta | vesta slime | 9.3 | 38 | /character/suphia/buy (2.0) | Vesta (Slime) | Both are Slime Season 2 characters | no |
| 11 | /character/hiroki-dan | hiroki dan | 8.3 | 33 | /character/geobugi (2.0) | Hiroki Dan | Both are characters of Trace | no |
| 12 | /character/drakon | dragul magi | 9.2 | 35 | /character/judar/buy (3.0) | Drakon (Dragul) from Magi | Both are Magi characters | no |
| 13 | /character/fuji-kiseki | fuji kiseki star blossom | 12.6 | 42 | /anime/umamusume-pretty-derby/free (10.4, 6 clicks) | Fuji Kiseki | Fuji Kiseki is an Umamusume character | no |
| 14 | /character/kumara | kumara fox | 8.4 | 20 | /character/suphia/buy (2.0) | Kumara, the nine-tailed fox | Both are Slime S2 Part 2 characters (the 3rd and last new link on Suphia/buy) | no |
| 15 | /anime/gangsta/free | gangsta where to watch anime | 11.5 | 22 | /character/theo (2.0) | Where to watch Gangsta | Theo is a Gangsta character | no |
| 16 | /anime/the-100-girlfriends-…-season-2/characters | the 100 girlfriends all characters | 8.1 | 15 | /manga/the-100-girlfriends-who-really-really-really-really-really-love-you (6.5, 5 clicks) | All 100 Girlfriends characters | The manga is the source of this anime (AniList relation) | no |
| 17 | /manga/the-promised-neverland/characters | the promised neverland characters | 12.4 | 20 | /manga/is-it-my-fault-that-i-got-bullied (3.1, 20 clicks) | The Promised Neverland characters | Weaker: the source lists Promised Neverland as a similar title | no |
| 18 | /manga/skip-and-loafer/characters | skip and loafer characters | 8.3 | 23 | /manga/pure-and-natural-cock-a-doodle-doo (3.0) | Skip and Loafer characters | Weaker: the source lists Skip and Loafer as similar | no |
| 19 | /manga/shangri-la-frontier/characters | shangri la frontier characters | 8.0 | 21 | /manga/team-phoenix (3.0, 3 clicks) | Shangri-La Frontier characters | Weaker: the source lists it as similar | no |
| 20 | /manga/summertime-rendering/characters | summertime rendering characters | 8.3 | 19 | /manga/re-zero-…-the-frozen-bond/like (5.0) | Summertime Rendering characters | Weaker: already on that "like" list as a similar title | no |
| 21 | /character/ken-kaneki | ken kaneki | 14.0 | 875 | /character/tooru-mutsuki/buy (1.0) | Ken Kaneki | Both are Tokyo Ghoul:re characters | yes |
| 22 | /character/will-serfort | will serfort | 10.2 | 328 | /character/edward-serfence/buy (4.3) | Will Serfort | Both are Wistoria characters | yes |
| 23 | /character/yumiella-dolkness | yumiella dolkness | 8.9 | 206 | /character/william-ares (4.3) | Yumiella Dolkness | Both are Villainess Level 99 characters | yes |
| 24 | /character/noel-stollen | noel stollen | 8.2 | 193 | /character/brandon-stollen (3.2) | Noel Stollen | Both are "Talker" clan characters | yes |
| 25 | /character/integra-fairbrook-wingates-hellsing | integra fairbrook wingates hellsing | 13.0 | 135 | /character/pip-bernadotte (3.0) | Integra Hellsing | Both are Hellsing Ultimate characters | yes |
| 26 | /character/beatrice | beatrice umineko | 10.1 | 95 | /character/marie-moriya (5.0) | Beatrice (Umineko) | Both appear in Higanbana no Saku Yoru ni | yes |
| 27 | /character/junko-kaname | junko kaname | 10.1 | 57 | /character/tomohisa-kaname (2.9) | Junko Kaname | Both are Madoka Magica characters | yes |
| 28 | /character/patrick-ashbatten | patrick ashbatten | 8.1 | 55 | /character/william-ares (4.3) | Patrick Ashbatten | Both are Villainess Level 99 characters | yes |
| 29 | /character/alucard | alucard hellsing height | 10.6 | 50 | /character/pip-bernadotte (3.0) | Alucard | Both are Hellsing Ultimate characters | yes |
| 30 | /character/satoshi-mashiba | satoshi mashiba | 9.9 | 49 | /character/maria-ishida/buy (1.0) | Satoshi Mashiba | Both are A Silent Voice characters | yes |

Notes on Table A:
- Rows 17–20 only share a "similar titles" link from AniList, not a shared story. Add them only if you are comfortable with that. I dropped three more of this kind because both the link and the source were too weak: Your Lie in April, Watari-kun and Mob Psycho.
- The full list, with 9 more "already linked" pairs, is in `gsc-data/link-pairs.csv`.
- **Rejected pairs.** Sebas Tian, Alpha, Kurt von Rudersdorf and Naofumi only share a crossover show with their source (Isekai Quartet and the like), which is not a real connection. `/character/kiwi` wants "Cyberpunk Edgerunners Kiwi", but that page is the Made in Abyss Kiwi, so it goes in Table B instead.
- Wilhelm, Petra, Hakurou, Souka and the Made in Abyss characters page were left out only because their one good source already carried 3 new links. They are a second batch for `/character/ram` and `/character/shiggy/buy` once the first batch has been measured.
- **Where rows 21–30 point:** the related link already exists, but these targets still sit at 8 to 14. Another link from the same kind of page is unlikely to move them. The bigger ones (Ken Kaneki, 875 impressions; Will Serfort, 328) need a stronger source, and none exists yet.

## Table B: queries that land on the wrong page

| Query (variants merged) | Impr | Page Google shows now | What page should rank | Action |
|---|---|---|---|---|
| asa daemons of the shadow realm (3 variants) | 62 | /character/asa (Asa from Mononoke) | /character/asa-daemons-of-the-shadow-realm (exists, 0 impressions) | Same-name mix-up. Link the right Asa from Daemons pages (/character/gabby, /character/yuru). Also watch the slug rule (see D) |
| gideon ragnason anime | 32 | /character/red (Pokémon Red) | /character/red-banished-from-the-heros-party (exists; "Gideon Ragnason" is already in its aliases) | Same-name mix-up. Link it from Banished pages with the anchor "Red (Gideon Ragnason)" |
| percival seven deadly sins / four knights / who is percival | 30 | /character/percival (Fate Percival, 10 favourites) | /character/percival-seven-deadly-sins (exists, 168 favourites) | Same-name mix-up. No strong Seven Deadly Sins page exists yet to link from |
| quiztopia manga | 28 | /manga/the-quiz | A Quiztopia title page | Not on AniList, so it cannot go into keep.json. No action |
| full bloom okinaga (umanosuke) (4 variants) | 56 | /manga/full-bloom (a different Full Bloom, by Rio) | A page for Okinaga Umanosuke's Full Bloom | Not on AniList (his AniList works are adult one-shots), so it cannot be added. Just be aware that part of this page's 504 impressions comes from people looking for the other book |
| cyberpunk edgerunners characters kiwi | 24 | /character/kiwi (Made in Abyss) | /character/kiwi-cyberpunk (exists) | Same-name mix-up. Link from /character/david-martinez once that page ranks |
| heavy lifting manhwa | 18 | /character/kristal-garson | A "Heavy Lifting" title page | Not on AniList. No action |
| theatre of darkness: yamishibai 16 | 17 | /schedule | /anime/theatre-of-darkness-yamishibai-16 (exists) | /schedule does not link to the title page (checked). A schedule row linking to its title would fix this |
| where to watch manhwa anime | 16 | /anime hub (pos 8.4) | **Missing page type:** "Manhwa that got an anime, and where to watch each", listing every Korean-origin anime in the catalog with its official streaming sites | New list page. It would answer the question with real data |
| manhwa characters | 16 | /character hub (pos 13.1) | **Missing hub:** characters from Korean titles only | Filtered character hub. It would answer "who are the main manhwa characters" |
| aldebaran re zero | 10 | /character/aldebaran (Saint Seiya, 31 favourites) | /character/aldebaran-re-zero-starting-life-in-another (exists, 625 favourites; Ram already links it) | Same-name mix-up |
| alma gokurakugai | 8 | /character/alma (Alma-chan) | /character/alma-gokurakugai (exists) | Same-name mix-up |
| the boxer manhwa anime / characters | 13 | /manhwa hub | /anime/the-boxer and /manhwa/the-boxer/characters (both exist and are linked) | Google prefers the hub. Nothing to build; time should fix it |
| migi parasyte | 6 | /character/migi (Aggretsuko, 6 favourites) | /character/migi-parasyte (exists, 2,969 favourites) | Same-name mix-up. The clearest case |
| utawarerumono touka / king gordon one piece | 10 | /character/touka, /character/gordon | /character/touka-utawarerumono, /character/gordon-one-piece-film | Same-name mix-up |
| is tartah colorblind, how old is poe bsd, poe height | 50 | the right character page | the same page | Right page, but it cannot answer the question because AniList has no such fact. No action; do not write filler |

Ignored: "tencent86465" (149 impressions on /where-to-read, a junk query) and "xv manga online" (99 impressions on the Final Fantasy XV anthology, almost certainly an unrelated intent). Old addresses `/character/satoru-81935`, `/sylvester-157135` and `/riku-8436` still show in Search Console, but they already 301 to the new slugs, which is fine. `/character/kiriya-176072` and `/character/gilda-378058` answer 200 and are live pages.

**Same-name mix-up, in one line:** the bare slug is given to whichever character got it first, not to the famous one. The famous one gets a long slug, and Google shows the bare one. The namesakes block does link them (checked on aldebaran, percival and asa), but that one link is not enough. Nine such queries (about 190 impressions) are in the table above.

## Section C: an automatic version (proposal only, nothing built)

Why: the hand method found only 20 useful pairs out of 318 targets. The biggest targets (Anos Voldigoad, 2,390 impressions at 10.6; David Martinez, 901; Mina Ashiro, 743; Gloria Martinez, 590) have no page of their series ranking in the top 3. Their title pages get almost no impressions at all. On a site this size, the links have to come from data.

**Mechanism: "Readers also look for" (1–3 links on a page)**

1. **`scripts/build-boost-links.mjs`** (new). Run it once a month on the owner's PC, because the Search Console login lives there. It:
   - reads a fresh Search Console export: pages plus query+page pairs over the last 28 days, using the same API call this report used.
   - finds targets (position 8–20, at least 15 impressions) and sources (position ≤ 5 with at least 5 impressions, or 3 or more clicks).
   - keeps a pair only if the live shards prove a connection: same title family, an AniList relation (adaptation, sequel, source), character-of-series, or both characters in the same **non-crossover** series. It drops pairs where the source already links the target, and drops targets whose top query names a different series than the page (the Kiwi case).
   - adds the same-name fix: when a query names a series that matches one of the page's `namesakes`, the right namesake page becomes a target, and pages of that series become its sources.
   - takes the anchor from the target's top query, cleaned up: the name, plus the series in brackets when the query has it, never "how old is…".
   - limits: at most 3 links per source and at most 3 sources per target.
   - writes **`data/boost-links.json`**: `{ "builtAt": "...", "links": { "/character/ram": [{ "to": "/character/roswaal-mathers", "anchor": "Roswaal Mathers", "why": "same series: Re:Zero" }] } }`
2. **`src/lib/boost-links.js`** (new, about 10 lines). It imports the JSON at build time, the same way `src/lib/picks.js` imports `data/picks.json`, and returns the links for a path. There are no extra fetches or KV reads, so the free Workers plan cost stays at zero.
3. **`src/components/AlsoLookFor.astro`** (new). A short list of plain links under the page's main content.
4. Rendered in **`src/pages/character/[slug].astro`**, **`src/pages/character/[slug]/buy.astro`**, **`src/pages/[kind]/[slug].astro`** and **`src/pages/[kind]/[slug]/{free,like,buy,characters}.astro`**: one `<AlsoLookFor path={Astro.url.pathname} />` line each.
5. Deploy through the normal pipeline. The edge cache key already carries `builtAt`, so new links show after the next deploy with no purge needed.
6. **Measuring:** the script also writes `tasks/gsc-data/boost-baseline-<date>.json` with each target's position, impressions and clicks. After 3–4 weeks, the same script with `--measure` compares boosted targets against striking-distance pages that got no link, as a control group, and keeps only the pairs that moved.

Guardrails: no noindex anywhere, no new thin pages, links only between pages the data proves are related, and the whole file is replaced every month so dead pairs drop out on their own.

**Two separate ideas the data points to (not part of the link block):**
- **Same-name slug rule.** When the same-name owner of a bare slug has far fewer favourites than a namesake (Migi 6 vs 2,969; Percival 10 vs 168; Aldebaran 31 vs 625), consider giving the bare slug to the popular one with a 301 from the old address. This touches `scripts/slug-registry.mjs` and the registry, so it needs its own plan and must not break old addresses.
- **Two list pages that searchers want:** "manhwa with an anime and where to watch it", and "manhwa characters". Both can be built from existing catalog data (`country: KR` plus `watchLinks`).

## Section D: what I could not check

- **Only 11 days of data.** The property has nothing before 13 Sep 2026, so all positions are noisy. Run this again in late October before judging the plan.
- Google hides rare queries. Query+page pairs cover about 36k of the 68.7k impressions, so the "top query" for a small page may be missing or wrong.
- I only checked pages with at least 15 impressions (striking distance) or at least 5 (Table B). The long tail was not reviewed by hand.
- "Already linked" checks the raw HTML for an exact `href`. A link added later by page JavaScript would not be seen.
- I could not find Quiztopia, Heavy Lifting or Okinaga's Full Bloom on AniList, so they have no id for keep.json.
- The local repo catalog is only a small test copy (3,598 titles). All relatedness checks used the live shards (116,009 titles, 169,737 character pages) as of today's build.
- Weaker "similar title" pairs (Table A rows 17–20) are my judgment call. Drop them if they feel forced.
