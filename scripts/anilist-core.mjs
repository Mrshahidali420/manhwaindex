#!/usr/bin/env node
/**
 * Shared AniList plumbing for manhwaindex.com.
 *
 * Two entry points use this:
 *   scripts/ingest-full.mjs   one-time walk of the whole AniList id space
 *   scripts/ingest-daily.mjs  small daily refresh, runs in GitHub Actions
 *
 * AniList facts this file is built around:
 *   - rate limit is 30 requests per minute
 *   - pageInfo.total is clamped at 5000, so it cannot be trusted
 *   - deep pagination dies past 5000 entries ("Page depth exceeds maximum")
 *   - there is no id cursor (id_greater does not exist)
 *   - id_in accepts 50 ids per call, so that is how we walk everything
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DATA_DIR = join(ROOT, 'data')
export const RAW_DIR = join(DATA_DIR, 'raw')

const API = 'https://graphql.anilist.co'
/** 30 requests per minute is the ceiling. 2.2s per call leaves headroom. */
export const REQUEST_DELAY_MS = 2200
export const IDS_PER_CALL = 50
const MAX_RETRIES = 12

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const MEDIA_FIELDS = `
  id idMal siteUrl type format status countryOfOrigin updatedAt source(version: 3)
  rankings { rank type allTime year context }
  stats { statusDistribution { status amount } }
  recommendations(perPage: 8, sort: RATING_DESC) {
    nodes { rating mediaRecommendation { id type title { romaji english } } }
  }
  title { romaji english native }
  synonyms
  description(asHtml: false)
  startDate { year month day }
  endDate { year }
  chapters volumes episodes duration season seasonYear
  genres
  averageScore meanScore popularity favourites
  isAdult
  coverImage { extraLarge large color }
  bannerImage
  tags { name rank isMediaSpoiler isAdult }
  externalLinks { site url type language icon color }
  trailer { id site thumbnail }
  nextAiringEpisode { airingAt episode }
  studios(isMain: true) { nodes { name } }
  staff(perPage: 4, sort: RELEVANCE) { edges { role node { name { full } } } }
  streamingEpisodes { title url site }
  relations { edges { relationType node { id type format countryOfOrigin title { romaji english } } } }
  characters(perPage: 10, sort: [ROLE, RELEVANCE]) { edges { role voiceActors(language: JAPANESE, sort: [RELEVANCE]) { name { full } } node { id name { full native alternative } image { large } description(asHtml: false) gender age bloodType favourites dateOfBirth { month day } } } }
`

/** Walk the id space. This is the only way to reach every title. */
export const BY_IDS_QUERY = `query ($ids: [Int]) {
  Page(page: 1, perPage: ${IDS_PER_CALL}) {
    media(id_in: $ids, isAdult: false, format_not_in: [NOVEL]) {
      ${MEDIA_FIELDS}
    }
  }
}`

/** Newest edits first. The daily job stops as soon as it sees old rows. */
export const RECENT_QUERY = `query ($page: Int, $type: MediaType) {
  Page(page: $page, perPage: ${IDS_PER_CALL}) {
    pageInfo { hasNextPage }
    media(type: $type, isAdult: false, format_not_in: [NOVEL], sort: UPDATED_AT_DESC) {
      ${MEDIA_FIELDS}
    }
  }
}`

/** Newest ids first. Catches titles added since the last run. */
export const NEWEST_QUERY = `query ($page: Int, $type: MediaType) {
  Page(page: $page, perPage: ${IDS_PER_CALL}) {
    pageInfo { hasNextPage }
    media(type: $type, isAdult: false, format_not_in: [NOVEL], sort: ID_DESC) {
      ${MEDIA_FIELDS}
    }
  }
}`

/**
 * CHEAP PROBES. These ask for two fields, not the whole record.
 * We use them to find out WHAT changed before we pay to fetch it.
 */
export const PROBE_RECENT_QUERY = `query ($page: Int, $type: MediaType) {
  Page(page: $page, perPage: ${IDS_PER_CALL}) {
    pageInfo { hasNextPage }
    media(type: $type, isAdult: false, format_not_in: [NOVEL], sort: UPDATED_AT_DESC) { id updatedAt }
  }
}`

export const PROBE_NEW_QUERY = `query ($page: Int, $type: MediaType) {
  Page(page: $page, perPage: ${IDS_PER_CALL}) {
    pageInfo { hasNextPage }
    media(type: $type, isAdult: false, format_not_in: [NOVEL], sort: ID_DESC) { id updatedAt }
  }
}`

/** Highest id that exists right now, per media type. */
export const MAX_ID_QUERY = `query ($type: MediaType) {
  Page(page: 1, perPage: 1) { media(type: $type, sort: ID_DESC) { id } }
}`

export const CHARACTERS = new Map()

export async function gql(query, variables, attempt = 1) {
  let res
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    // A dropped socket or DNS blip must not end a two-hour run.
    if (attempt > MAX_RETRIES) throw error
    const wait = Math.min(15 * attempt, 90)
    console.warn(`  network error (${error.message}). retrying in ${wait}s (attempt ${attempt})`)
    await sleep(wait * 1000)
    return gql(query, variables, attempt + 1)
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || 60)
    if (attempt > MAX_RETRIES) throw new Error('rate limited, gave up')
    console.warn(`  429 rate limited. waiting ${retryAfter}s (attempt ${attempt})`)
    await sleep((retryAfter + 2) * 1000)
    return gql(query, variables, attempt + 1)
  }

  if (!res.ok) {
    if (attempt > MAX_RETRIES) throw new Error(`HTTP ${res.status} after ${MAX_RETRIES} tries`)
    console.warn(`  HTTP ${res.status}, retrying in 15s (attempt ${attempt})`)
    await sleep(15_000)
    return gql(query, variables, attempt + 1)
  }

  let body
  try {
    body = await res.json()
  } catch (error) {
    if (attempt > MAX_RETRIES) throw error
    console.warn(`  bad body (${error.message}). retrying in 15s (attempt ${attempt})`)
    await sleep(15_000)
    return gql(query, variables, attempt + 1)
  }
  if (body.errors) {
    const text = JSON.stringify(body.errors).slice(0, 300)
    // A GraphQL error is usually AniList itself having a bad minute, not a bad
    // query. We ask again with a growing wait before we let the run die.
    if (attempt > MAX_RETRIES) throw new Error(`GraphQL: ${text}`)
    const wait = Math.min(10 * attempt, 60)
    console.warn(`  GraphQL error (${text}). retrying in ${wait}s (attempt ${attempt})`)
    await sleep(wait * 1000)
    return gql(query, variables, attempt + 1)
  }
  return body.data
}

/** AniList site names we treat as an official place to read. */
const READ_PLATFORMS = [
  'WEBTOON', 'Naver Webtoon', 'Naver Series', 'Kakao Webtoon', 'KakaoPage',
  'Tapas', 'Tappytoon', 'Lezhin', 'Piccoma', 'Manta', 'Comikey', 'INKR',
  'MANGA Plus', 'Manga Plus', 'VIZ', 'Yen Press', 'Seven Seas Entertainment',
  'Kodansha', 'Azuki', 'Coolmic', 'WebComics', 'Bomtoon', 'Lalatoon',
  'Toomics', 'Webnovel', 'Pocket Comics', 'NETCOMICS', 'Bilibili Comics',
  'KuaiKan Manhua', 'Tencent Comics', 'Dongman Manhua', 'ONO',
]

const isReadLink = (link) =>
  READ_PLATFORMS.some((p) => (link.site || '').toLowerCase() === p.toLowerCase())

const isWatchLink = (link) => link.type === 'STREAMING'

export const slugify = (value) =>
  (value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

// Bios end on a full sentence, never mid-word. Spoiler blocks ~!...!~ are
// dropped whole, so a cut never lands inside one and leaks it.
const BIO_MAX = 1500
export function cutBio(text) {
  const clean = text.replace(/~![\s\S]*?!~/g, '').trim()
  if (clean.length <= BIO_MAX) return clean
  const head = clean.slice(0, BIO_MAX)
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('.\n'), head.lastIndexOf('\n\n'))
  return (end > 200 ? head.slice(0, end + 1) : head).trim()
}

export function shape(media, kind = media.type === 'ANIME' ? 'anime' : 'comic') {
  const title = media.title.english || media.title.romaji || media.title.native
  const links = media.externalLinks || []
  const relations = (media.relations?.edges || []).map((e) => ({
    relation: e.relationType,
    id: e.node.id,
    type: e.node.type,
    format: e.node.format,
    country: e.node.countryOfOrigin,
    title: e.node.title.english || e.node.title.romaji,
  }))

  return {
    kind, // 'comic' | 'anime'
    id: media.id,
    malId: media.idMal,
    slug: `${slugify(title)}-${media.id}`,
    title,
    titleRomaji: media.title.romaji,
    titleNative: media.title.native,
    synonyms: media.synonyms || [],
    format: media.format,
    status: media.status,
    country: media.countryOfOrigin,
    updatedAt: media.updatedAt ?? null,
    // What the story was made from: a light novel, a game, an original work.
    source: media.source ?? null,
    // AniList's own charts. "#2 most popular manhwa of all time" is a fact a
    // reader cares about and nothing else on the page says.
    ranks: (media.rankings || [])
      .filter((r) => r.rank <= 500)
      .slice(0, 4)
      .map((r) => ({ rank: r.rank, type: r.type, allTime: !!r.allTime, year: r.year ?? null, context: r.context })),
    // How many people are reading it, finished it, or gave up on it.
    readers: Object.fromEntries(
      (media.stats?.statusDistribution || []).map((s) => [s.status.toLowerCase(), s.amount])
    ),
    // "If you liked this, try that." Ids only here; make-shards.mjs throws
    // away the ones we do not hold a page for and swaps the rest for slugs.
    recIds: (media.recommendations?.nodes || [])
      .filter((n) => n.mediaRecommendation?.id)
      .slice(0, 8)
      .map((n) => ({ id: n.mediaRecommendation.id, rating: n.rating || 0 })),
    description: (media.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
    startYear: media.startDate?.year ?? null,
    startDate: media.startDate?.year ? [media.startDate.year, media.startDate.month || 1, media.startDate.day || 1] : null,
    trailer: media.trailer?.site === 'youtube' ? { id: media.trailer.id, thumb: media.trailer.thumbnail || null } : null,
    nextEpisode: media.nextAiringEpisode ? { at: media.nextAiringEpisode.airingAt, number: media.nextAiringEpisode.episode } : null,
    endYear: media.endDate?.year ?? null,
    chapters: media.chapters ?? null,
    volumes: media.volumes ?? null,
    episodes: media.episodes ?? null,
    season: media.season ?? null,
    seasonYear: media.seasonYear ?? null,
    genres: media.genres || [],
    tags: (media.tags || [])
      .filter((t) => !t.isAdult && !t.isMediaSpoiler && t.rank >= 60)
      .slice(0, 12)
      .map((t) => t.name),
    score: media.averageScore ?? null,
    popularity: media.popularity ?? 0,
    favourites: media.favourites ?? 0,
    cover: media.coverImage?.extraLarge || media.coverImage?.large || null,
    coverColor: media.coverImage?.color || null,
    banner: media.bannerImage || null,
    anilistUrl: media.siteUrl,
    readLinks: links.filter(isReadLink).map((l) => ({ site: l.site, url: l.url, language: l.language || null })),
    watchLinks: links.filter(isWatchLink).map((l) => ({ site: l.site, url: l.url, language: l.language || null })),
    otherLinks: links
      .filter((l) => !isReadLink(l) && !isWatchLink(l))
      .map((l) => ({ site: l.site, url: l.url, type: l.type })),
    streamingEpisodes: (media.streamingEpisodes || []).slice(0, 3).map((e) => ({ title: e.title, url: e.url, site: e.site })),
    studios: media.studios?.nodes?.map((s) => s.name) || [],
    authors: (media.staff?.edges || [])
      .filter((e) => /story|art|original/i.test(e.role || ''))
      .map((e) => ({ name: e.node.name.full, role: e.role })),
    relations,
    characters: (media.characters?.edges || []).map((e) => ({
      id: e.node.id,
      slug: slugify(e.node.name.full) + '-' + e.node.id,
      name: e.node.name.full,
      image: e.node.image?.large || null,
      role: e.role,
      // Who speaks this part in the Japanese dub. "Who voices X" is a real
      // search and today we answer it with nothing. Only for anime: a comic
      // has no voices.
      voice: (e.voiceActors || []).slice(0, 1).map((v) => v.name.full)[0] || null,
      // The full body rides along here and is stripped once it reaches CHARACTERS.
      body: {
        id: e.node.id,
        slug: slugify(e.node.name.full) + '-' + e.node.id,
        name: e.node.name.full,
        native: e.node.name.native || null,
        aliases: (e.node.name.alternative || []).filter(Boolean).slice(0, 3),
        image: e.node.image?.large || null,
        gender: e.node.gender || null,
        age: e.node.age || null,
        birthday: e.node.dateOfBirth?.month ? e.node.dateOfBirth.month + '/' + e.node.dateOfBirth.day : null,
        bloodType: e.node.bloodType || null,
        // How many AniList members picked this character as a favourite. It is
        // the only popularity number a character record carries.
        favourites: e.node.favourites ?? 0,
        description: cutBio((e.node.description || '').replace(/<[^>]+>/g, '').trim()),
      },
    })),
  }
}

/** Move every character body into CHARACTERS and leave a thin reference behind. */
export function harvestCharacters(item) {
  for (const c of item.characters || []) {
    if (c.id == null) continue
    if (c.body) {
      CHARACTERS.set(c.id, { ...c.body, appearsIn: [] })
      delete c.body
    } else if (!CHARACTERS.has(c.id)) {
      CHARACTERS.set(c.id, { id: c.id, slug: c.slug, name: c.name, image: c.image, appearsIn: [] })
    }
  }
}

/**
 * data/seen.json is the memory of the ingest: id -> updatedAt for every title
 * we already hold. Anything in here is never fetched again unless AniList
 * says its updatedAt moved.
 */
export const SEEN_FILE = join(DATA_DIR, 'seen.json')

export function loadSeen() {
  try {
    const raw = JSON.parse(readFileSync(SEEN_FILE, 'utf8'))
    return new Map(Object.entries(raw).map(([id, at]) => [Number(id), at]))
  } catch {
    return new Map()
  }
}

function writeSeen(items) {
  const out = {}
  for (const item of items) out[item.id] = item.updatedAt ?? 0
  writeFileSync(SEEN_FILE, JSON.stringify(out))
}

const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

/**
 * Read the last assembled catalog back into memory.
 * The daily job builds on top of this instead of re-reading the raw dump.
 */
export function loadAssembled() {
  const comics = readJson(join(DATA_DIR, 'comics.json'), [])
  const anime = readJson(join(DATA_DIR, 'anime.json'), [])
  const characters = readJson(join(DATA_DIR, 'characters.json'), [])
  CHARACTERS.clear()
  for (const c of characters) CHARACTERS.set(c.id, { ...c, appearsIn: [] })
  return { comics, anime }
}

/** Read raw JSONL page files. A later file overwrites an earlier one. */
export function loadRawFiles(files) {
  const byId = new Map()
  for (const file of files) {
    const path = join(RAW_DIR, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line) continue
      let item
      try {
        item = JSON.parse(line)
      } catch {
        continue
      }
      harvestCharacters(item)
      byId.set(item.id, item)
    }
  }
  return [...byId.values()]
}

/**
 * Cross-link comics to anime, build the character index, and write
 * data/comics.json, data/anime.json, data/characters.json, data/stats.json.
 */
export function assembleAndWrite(comics, anime, startedAt = Date.now()) {
  mkdirSync(DATA_DIR, { recursive: true })
  const animeById = new Map(anime.map((a) => [a.id, a]))
  const comicById = new Map(comics.map((c) => [c.id, c]))

  for (const comic of comics) {
    const adaptations = (comic.relations || [])
      .filter((r) => r.type === 'ANIME')
      .map((r) => animeById.get(r.id))
      .filter(Boolean)
    comic.hasAnime = (comic.relations || []).some((r) => r.type === 'ANIME')
    comic.animeInIndex = adaptations.map((a) => ({ slug: a.slug, title: a.title, episodes: a.episodes, watchCount: a.watchLinks.length }))
  }

  for (const show of anime) {
    const sources = (show.relations || [])
      .filter((r) => r.type === 'MANGA' && /SOURCE|ADAPTATION|PARENT|PREQUEL/i.test(r.relation || ''))
      .map((r) => comicById.get(r.id))
      .filter(Boolean)
    show.comicInIndex = sources.map((c) => ({ slug: c.slug, title: c.title, readCount: c.readLinks.length }))
  }

  // The slug ends in the AniList id, so it is the one key that matches in both
  // the current catalog format and the older one, whose character references
  // carry no id at all.
  const bySlug = new Map()
  for (const person of CHARACTERS.values()) {
    person.appearsIn = []
    if (person.slug) bySlug.set(person.slug, person)
  }

  for (const [items, kind] of [[comics, 'comic'], [anime, 'anime']]) {
    for (const item of items) {
      for (const ref of item.characters || []) {
        // Every title page links to its cast, so a character with no record
        // here became a dead link: about one in four of them. The reference
        // itself carries a name and a face, which is enough for a page, so
        // build the record from it instead of dropping the reader on a 404.
        let person = (ref.id != null && CHARACTERS.get(ref.id)) || bySlug.get(ref.slug)
        if (!person) {
          if (!ref.slug || !ref.name || !ref.image) continue
          person = { id: ref.id ?? null, slug: ref.slug, name: ref.name, image: ref.image, appearsIn: [] }
          CHARACTERS.set(ref.id ?? ref.slug, person)
          bySlug.set(ref.slug, person)
        }
        person.appearsIn.push({
          kind,
          slug: item.slug,
          title: item.title,
          cover: item.cover,
          country: item.country,
          role: ref.role,
          popularity: item.popularity || 0,
          // Only an anime has a voice, so this is null on every comic row.
          voice: ref.voice || null,
        })
      }
      // Keep the id: the daily job needs it to rebuild this same link.
      item.characters = (item.characters || []).map((r) => ({ id: r.id, slug: r.slug, name: r.name, image: r.image, role: r.role, voice: r.voice || null }))
    }
  }

  const characterList = [...CHARACTERS.values()]
    // A name and a face are the whole gate. The old gate also demanded a main
    // role or a written bio, which threw away a quarter of the cast we link to
    // from every title page, and search sends us real traffic for exactly those
    // names. Nothing is fetched twice for this: the record was already in hand.
    .filter((c) => c.name && c.image)
    .map((c) => ({ ...c, appearsIn: c.appearsIn.sort((x, y) => y.popularity - x.popularity) }))
    .sort((x, y) => (y.appearsIn[0]?.popularity || 0) - (x.appearsIn[0]?.popularity || 0))

  writeFileSync(join(DATA_DIR, 'characters.json'), JSON.stringify(characterList))
  writeFileSync(join(DATA_DIR, 'comics.json'), JSON.stringify(comics))
  writeFileSync(join(DATA_DIR, 'anime.json'), JSON.stringify(anime))
  writeSeen([...comics, ...anime])

  const stats = {
    generatedAt: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    comics: comics.length,
    comicsWithReadLinks: comics.filter((c) => c.readLinks.length > 0).length,
    comicsWithAnime: comics.filter((c) => c.hasAnime).length,
    comicsLinkedToAnimeInIndex: comics.filter((c) => c.animeInIndex.length > 0).length,
    anime: anime.length,
    animeWithWatchLinks: anime.filter((a) => a.watchLinks.length > 0).length,
    animeLinkedToComicInIndex: anime.filter((a) => a.comicInIndex.length > 0).length,
    characters: characterList.length,
    byCountry: comics.reduce((acc, c) => ((acc[c.country] = (acc[c.country] || 0) + 1), acc), {}),
  }
  writeFileSync(join(DATA_DIR, 'stats.json'), JSON.stringify(stats, null, 2))
  return stats
}
