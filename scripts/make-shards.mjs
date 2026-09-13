#!/usr/bin/env node
/**
 * Cuts the catalog into small JSON shards under public/d/.
 *
 * The Worker renders a title page on request. It cannot carry the whole
 * catalog (26 MB), so it reads one shard through the ASSETS binding and
 * pulls the single record it needs out of it.
 *
 * Each shard is an object of slug -> record, and every record is stored as
 * a STRING of JSON, not as an object. The Worker then parses only the one
 * record it wants. Measured: that is twice as fast as a plain object shard.
 *
 * Run it:
 *   node scripts/make-shards.mjs      (npm run build does this for you)
 */

import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bucket, titleKey, TITLES_PER_SHARD, CHARACTERS_PER_SHARD } from '../src/lib/shard-key.js'
import { reslugAll } from '../src/lib/reslug.mjs'
import { PLATFORMS, FALLBACK } from '../src/lib/platforms.js'
import { buildOverview } from '../src/lib/prose.mjs'
import { freeSplit, linksOf } from '../src/lib/answers.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'd')

const read = (name) => JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'))

const KIND_OF_COUNTRY = { KR: 'manhwa', JP: 'manga', CN: 'manhua', TW: 'manhua' }
export const kindOf = (item) =>
  item.kind === 'anime' ? 'anime' : KIND_OF_COUNTRY[item.country] || 'manga'

/** Write one folder of shards. Returns the shard count. */
function writeShards(dir, records, perShard, keyOf) {
  const count = Math.max(1, Math.ceil(records.length / perShard))
  const shards = Array.from({ length: count }, () => [])
  for (const record of records) {
    const key = keyOf(record)
    shards[bucket(key, count)].push([key, JSON.stringify(record)])
  }
  mkdirSync(dir, { recursive: true })
  let bytes = 0
  let biggest = 0
  for (let n = 0; n < count; n++) {
    // One record per line, "key<TAB>json". The Worker finds its line with a
    // plain string search and parses that one record. It never parses the
    // whole shard, so a big shard costs no more than a small one.
    let text = '\n'
    for (const [key, json] of shards[n]) text += `${key}\t${json}\n`
    writeFileSync(join(dir, `${n}.txt`), text)
    bytes += text.length
    biggest = Math.max(biggest, shards[n].length)
  }
  return { count, bytes, biggest }
}

/** Just enough of a title to draw a cover card, and nothing more. */
const thin = (p) => ({
  slug: p.slug,
  title: p.title,
  cover: p.cover,
  kind: p.kind,
  country: p.country,
  status: p.status,
  readLinks: (p.readLinks || []).slice(0, 6).map((l) => ({ site: l.site })),
  watchLinks: (p.watchLinks || []).slice(0, 6).map((l) => ({ site: l.site })),
})

/**
 * The title page shows "you may also like" and a family tree of prequels and
 * sequels. Both need the whole catalog, which the Worker does not have. So
 * both are worked out here, once, and stored inside the record.
 */
function precompute(titles) {
  const byId = new Map(titles.map((item) => [item.id, item]))

  const pools = new Map()
  for (const item of titles) {
    const key = kindOf(item)
    if (!pools.has(key)) pools.set(key, [])
    pools.get(key).push(item)
  }
  for (const list of pools.values()) list.sort((a, b) => b.popularity - a.popularity)

  for (const item of titles) {
    const mine = new Set(item.genres || [])
    item.similar = (pools.get(kindOf(item)) || [])
      .filter((p) => p.id !== item.id)
      .map((p) => ({ p, shared: (p.genres || []).filter((g) => mine.has(g)) }))
      .filter((x) => x.shared.length >= 2)
      .sort((a, b) => b.shared.length - a.shared.length || b.p.popularity - a.p.popularity)
      .slice(0, 6)
      // The "like" page has to say WHY each pick belongs, so the shared
      // genres travel with the pick instead of being worked out again.
      .map((x) => ({ ...thin(x.p), shared: x.shared.slice(0, 3) }))

    for (const rel of item.relations || []) {
      const found = byId.get(rel.id)
      rel.hit = found
        ? { kind: found.kind === 'anime' ? 'anime' : 'comic', item: { slug: found.slug, country: found.country } }
        : null
    }

    // Computed facts. Both need the whole catalog, so they are worked out
    // here and travel inside the record. See src/lib/computed.mjs.
    item.chain = readingChain(item, byId)
    item.adapt = adaptationOf(item, byId)
  }

  // The original overview. It is written here, on every build, so a title
  // added tomorrow gets its own prose tomorrow with no extra step.
  writeOverviews(titles, pools)
}

/** The same medium? A comic sequel is a comic, an anime sequel is an anime. */
const sameMedium = (a, b) => (a.kind === 'anime') === (b.kind === 'anime')

/** One step along the story, in one direction, inside the same medium. */
function step(item, byId, relation) {
  for (const rel of item.relations || []) {
    if (rel.relation !== relation) continue
    const found = byId.get(rel.id)
    if (found && found.id !== item.id && sameMedium(item, found)) return found
  }
  return null
}

const part = (p, self) => ({
  slug: p.slug,
  title: p.title,
  kind: kindOf(p),
  status: p.status,
  chapters: p.chapters || null,
  episodes: p.episodes || null,
  ...(self ? { self: true } : {}),
})

/**
 * The order to read a series in.
 *
 * We walk back through PREQUEL until the story starts, then forward through
 * SEQUEL until it ends. A `seen` set stops a loop, because AniList data does
 * sometimes point in a circle. A single book gets an empty chain.
 */
function readingChain(item, byId) {
  const seen = new Set([item.id])
  const before = []
  for (let at = step(item, byId, 'PREQUEL'); at && !seen.has(at.id); at = step(at, byId, 'PREQUEL')) {
    seen.add(at.id)
    before.unshift(part(at))
  }
  const after = []
  for (let at = step(item, byId, 'SEQUEL'); at && !seen.has(at.id); at = step(at, byId, 'SEQUEL')) {
    seen.add(at.id)
    after.push(part(at))
  }
  if (before.length + after.length === 0) return null
  return [...before, part(item, true), ...after]
}

const ADAPT_RELATIONS = new Set(['ADAPTATION', 'SOURCE'])

/**
 * How the anime and the comic line up. For a comic this is every anime made
 * from it; for an anime it is the book it came from. Only titles that are in
 * our own index are used, because we only ever link to a page we hold.
 */
function adaptationOf(item, byId) {
  const isComic = item.kind !== 'anime'
  const hits = (item.relations || [])
    .filter((rel) => ADAPT_RELATIONS.has(rel.relation))
    .map((rel) => byId.get(rel.id))
    .filter((found) => found && !sameMedium(item, found))

  if (isComic) {
    const shows = hits.map((show) => ({
      slug: show.slug,
      title: show.title,
      format: show.format || 'TV',
      episodes: show.episodes || null,
      status: show.status,
      startYear: show.startYear || null,
      // The airing clock travels with the show, so a comic page can say when
      // its own anime airs next without loading the anime record.
      nextEpisode: show.nextEpisode || null,
    }))
    shows.sort((a, b) => (a.startYear || 9999) - (b.startYear || 9999))
    return shows.length ? { shows } : null
  }

  const src = hits[0]
  if (!src) return null
  return {
    source: {
      slug: src.slug,
      title: src.title,
      kind: kindOf(src),
      chapters: src.chapters || null,
      status: src.status,
    },
  }
}

const noteOf = (site) => (PLATFORMS[site] || FALLBACK).note

/**
 * Works out where a title stands against its own group, then hands the facts
 * to the prose writer. The rank needs the whole catalog, so it cannot be done
 * in the Worker.
 */
function writeOverviews(titles, pools) {
  const rankOf = new Map()
  for (const [group, list] of pools) {
    const scored = list.filter((p) => p.score).sort((a, b) => b.score - a.score)
    const label = group === 'anime' ? 'anime' : group
    scored.forEach((item, i) => {
      rankOf.set(item.id, { top: Math.max(1, Math.round(((i + 1) / scored.length) * 100)), label })
    })
  }
  for (const item of titles) {
    item.overview = buildOverview(item, kindOf(item), noteOf, rankOf.get(item.id) || null)
  }
}

function main() {
  const comics = read('comics.json')
  const anime = read('anime.json')
  const characters = read('characters.json')
  reslugAll(comics, anime, characters)

  rmSync(OUT, { recursive: true, force: true })

  const titles = [...comics, ...anime]
  precompute(titles)
  const t = writeShards(join(OUT, 't'), titles, TITLES_PER_SHARD, (item) =>
    titleKey(kindOf(item), item.slug))

  // Only characters that earn a page are sharded. The rest are never served.
  const pages = characters.filter((c) => c.image && (c.appearsIn || []).length > 0)
  const c = writeShards(join(OUT, 'c'), pages, CHARACTERS_PER_SHARD, (person) => person.slug)

  // The site shell (header and footer) shows two counts and the top genres.
  // The Worker renders the shell on every page, so those few numbers are
  // written to their own tiny file instead of loading the whole catalog.
  const tally = new Map()
  for (const item of titles) {
    for (const g of item.genres || []) tally.set(g, (tally.get(g) || 0) + 1)
  }
  const topGenres = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))
  writeFileSync(
    join(ROOT, 'data', 'site-stats.json'),
    JSON.stringify({ comics: comics.length, anime: anime.length, genres: topGenres }, null, 2),
  )

  // Which titles have earned an answer page. A page that cannot answer its
  // own question is a thin page, so the gates are strict and the sitemap
  // only ever lists what passed them. The Worker still renders the rest.
  const answerUrls = { free: [], like: [] }
  for (const item of titles) {
    const path = `/${kindOf(item)}/${item.slug}`
    if (freeSplit(linksOf(item)).free.length > 0) answerUrls.free.push(`${path}/free`)
    if ((item.similar || []).length >= 4) answerUrls.like.push(`${path}/like`)
  }
  writeFileSync(join(ROOT, 'data', 'answer-urls.json'), JSON.stringify(answerUrls))

  const manifest = { titleShards: t.count, characterShards: c.count, builtAt: Date.now() }
  writeFileSync(join(ROOT, 'data', 'shards.json'), JSON.stringify(manifest, null, 2))

  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`
  console.log(`titles     ${titles.length} in ${t.count} shards, ${mb(t.bytes)}, biggest ${t.biggest} records`)
  console.log(`characters ${pages.length} in ${c.count} shards, ${mb(c.bytes)}, biggest ${c.biggest} records`)
  console.log(`shard files ${t.count + c.count}  (the free plan allows 20,000 files in total)`)
  console.log(`answer pages ${answerUrls.free.length} free, ${answerUrls.like.length} like`)
}

main()
