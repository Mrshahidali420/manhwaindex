# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two confirmed audiences (user: "kinda both"):
1. Lookup visitor: a manhwa/manga/anime fan who just heard about one series and wants to know where to read or watch it legally. Arrives from Google ("read X online", "watch Y online"), checks the official platforms, clicks out.
2. Discovery visitor: a fan browsing for something NEW to read or watch — trending shelves, genres, related anime/manga pairs.

## Product Purpose

manhwaindex.com answers "where can I legally read or watch this?" for manhwa, manga, manhua and anime. It never hosts or embeds content; every link goes to an official publisher or streaming platform. Success = trust (looks like a real professional brand, visitors trust the links) and traffic (Google + AdSense pageviews).

## Positioning

The legal index. Pirate aggregators cannot truthfully copy the claim "every link here is official." Data is AniList-fed, refreshed daily by CI, ~9,700 static pages, fast.

## Operating Context

Visitors arrive mostly from a Google search on one title, on phones, often at night. Second entry: homepage browsing of trending shelves and genres. The site is a static Astro build on Cloudflare Workers; a GitHub Action refreshes data daily at 02:00 UTC.

## Capabilities and Constraints

- Data: AniList GraphQL only (legal, free). Jikan/MyAnimeList is an approved future addition. Pirate sources are permanently banned.
- 2,500 comics + 1,000 anime + ~6,000 character pages; covers/banners are hotlinked AniList images.
- Static site: no server-side personalization; search is a client-side JSON index.
- Pages must stay fast (AdSense + Core Web Vitals): minimal JS, lazy images.
- URL structure (/manhwa/slug, /anime/slug, /genre/slug, /character/slug) is live in Google's index; keep URLs stable.

## Brand Commitments

- Name "manhwaindex" and domain manhwaindex.com are binding. Everything else — logo, colors, type, layout — is free to replace (confirmed 2026-09-12).

## Evidence on Hand

- Real catalog data in data/*.json (titles, covers, platforms, trailers, air dates, authors, characters).
- Real official-platform links (Webtoon, Tapas, Crunchyroll, Netflix, etc.) with platform brand colors in src/lib/catalog.js.
- No testimonials, no press, no revenue claims. Do not fabricate any.

## Product Principles

1. The answer first: the official places to read/watch appear before anything else on a title page.
2. Legality is the brand: nothing on the surface may resemble a pirate reader.
3. Speed is a feature: every design choice must survive Core Web Vitals.
4. Cover art is the content: the design frames AniList artwork, it does not compete with it.
5. Auto-updating: nothing hand-curated that the daily refresh would overwrite.
