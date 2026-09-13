# Roadmap: accounts, a personal feed, and recommendations

Status: **not started, and not to be started until the site earns money.**
Written 14 September 2026.

## Why this is parked

Everything in this file needs one thing the site does not have: a **user**.
A "for you" feed, a reading list, a "continue where you left off" row and a
tracking history all begin with somebody signing in. Today the site has no
sign-in, no database and no running cost. That is why it is free to host and
why it is safe for AdSense.

The moment accounts exist, four new costs appear at once:

| New cost | What it is |
|---|---|
| A database | Cloudflare D1 is free to a point, then it is not. |
| Privacy law | Storing a reading history is personal data: GDPR, a real privacy policy, a delete-my-account route. |
| Support | People lose passwords. Somebody has to answer. |
| Abuse | Sign-up forms attract bots. |

None of those are hard. All of them are pointless before there is traffic.

**The gate: do not build any of this until the site earns a steady monthly
amount from ads.** Revisit then.

## What is already built that this would sit on top of

- `src/lib/moods.mjs` — 18 hand-written moods over AniList story tags, and
  `pickForMood()`, which ranks any list of titles against a mood. This is
  already a working recommender. It just has no user to aim at.
- `data/comics.json` / `data/anime.json` — every title carries `tags`,
  `genres`, `popularity`, `score`, `relations` and `characters`.
- Exact cross-platform ids. Every record already holds `id` (AniList) and
  `malId` (MyAnimeList), taken straight from AniList's own `idMal` field. No
  title guessing is involved. See the note at the end of this file.

## The order to build it in, when the time comes

### 1. A local reading list (no account at all)

The cheapest useful step, and it can be done at any time.

Store a list of slugs in the reader's own browser (`localStorage`). No
server, no database, no privacy policy change beyond one sentence. The
reader gets a "my list" page; we get nothing about them, which is the point.

Then feed that list into `pickForMood()` in reverse: read the tags of the
titles they saved, and rank the whole index against that tag profile. That
is a personal feed with **zero** infrastructure.

This is the one item here worth doing early. It is a weekend of work.

### 2. Accounts (only after money)

Cloudflare D1 for the database, and a sign-in that does not ask us to hold a
password: "sign in with Google" or a one-time code by email. We must never
store a password hash if we can avoid storing one at all.

Tables: `user`, `user_title` (slug, state, rating, updated_at). That is it.
Do not design more until it is needed.

### 3. Import from AniList or MyAnimeList

The single feature that would make someone create an account here: bring the
list you already have. `bigspawn/anilist-mal-sync` (MIT, checked 14 Sep 2026,
41 stars, active) is the reference for how the two id spaces line up. We
already hold both ids, so the import is a join, not a guess.

### 4. Recommendations from the list

Same engine as the mood pages: build a tag profile from what the reader
saved, score the index against it, drop anything already on the list.

Do **not** reach for a neural network. The tag data is honest and the maths
is a dot product. A model would be slower, more expensive, and impossible to
explain on the page. "You saved 6 revenge manhwa" is a better reason than
"the model says so".

## Repositories checked, and the verdict on each

Checked with the GitHub CLI on 14 September 2026. A second AI proposed these;
several of its claims were wrong, so every line here is verified.

| Repo | Verdict |
|---|---|
| `hexxt-git/anime-sdk` | **Do not use.** No licence file at all, so there is no legal right to use it commercially. It was claimed to be MIT. It is not. |
| `manami-project/anime-offline-database` | Archived. Live fork: `cedya77/anime-offline-database`. ODbL, share-alike, needs credit. **Not needed** — AniList already gives us `idMal` directly, for manga as well as anime, which this file does not cover. |
| `bigspawn/anilist-mal-sync` | MIT, active. **Useful reference** for step 3 above. |
| `Webtoon-Studio/webtoon` | Apache-2.0, but it is an **unofficial scraper** of webtoons.com with no word about terms of service. **Rejected.** We send readers to WEBTOON; we do not scrape it. |
| `ryacub/rayniyomi` | A fork of Aniyomi, which is Tachiyomi/Mihon lineage. **Permanently rejected**, like the rest of that ecosystem. |
| `u-Kuro/Kanshi-Anime-Recommender` | No licence file. **Cannot use the code.** The idea — one recommender across anime, manga, manhwa and novels — is already what `moods.mjs` does. |
| `Chaptiv/ShokaiShelf` | Licence explicitly forbids reusing its recommendation engine. **Rejected.** |
| MangaBaka / `Silo-Server/silo-plugin-metadata-manga` | MangaBaka's data is CC BY-NC-SA: **non-commercial only**. This site runs ads. **Cannot use.** |
| "Sprout" neural recommender | **Does not exist.** No such repository was found. |

## A note on cross-platform ids

A proposal suggested adding a third-party id-mapping database so the site
could hold a MyAnimeList id next to each AniList id.

**This is already done, and done better.** AniList's own API returns `idMal`
on every record. `scripts/anilist-core.mjs` asks for it in `MEDIA_FIELDS`,
and `shape()` stores it as `malId`. `scripts/enrich-mal.mjs` then calls
Jikan with that exact id. No title matching happens anywhere.

Coverage on 14 September 2026:

- anime: 999 of 1,000 carry a MAL id (100%)
- comics: 2,042 of 2,499 carry a MAL id (82%)

The 457 comics without one have no MyAnimeList entry at all, mostly newer
manhwa. A third-party file would not fix that, because
`anime-offline-database` covers **anime only**. There is nothing to add here.
