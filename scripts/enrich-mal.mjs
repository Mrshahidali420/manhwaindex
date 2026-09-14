// Enrich the catalog with MyAnimeList scores (via Jikan) and cross-site
// links for anime (via manami-project/anime-offline-database).
// Writes data/enrich.json keyed "anime:<anilistId>" / "comic:<anilistId>".
// Safe to re-run: it resumes from the existing file and only fills gaps.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OUT = 'data/enrich.json'
const anime = JSON.parse(readFileSync('data/anime.json', 'utf8'))
const comics = JSON.parse(readFileSync('data/comics.json', 'utf8'))
const enrich = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}

const TODAY = new Date().toISOString().slice(0, 10)
const save = () => writeFileSync(OUT, JSON.stringify(enrich))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- Step A: anime-offline-database → cross-site links -------------------
const OFFLINE_URLS = [
  'https://github.com/manami-project/anime-offline-database/releases/download/latest/anime-offline-database-minified.json',
  'https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json',
]

const SITE_OF = [
  ['myanimelist.net', 'MyAnimeList'],
  ['kitsu.app', 'Kitsu'],
  ['kitsu.io', 'Kitsu'],
  ['anidb.net', 'AniDB'],
  ['livechart.me', 'LiveChart'],
  ['anime-planet.com', 'Anime-Planet'],
]

async function stepOffline() {
  let db = null
  for (const url of OFFLINE_URLS) {
    try {
      console.log('downloading', url)
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) { console.log('  status', res.status); continue }
      db = (await res.json()).data
      break
    } catch (e) {
      console.log('  failed:', e.message)
    }
  }
  if (!db) { console.log('offline db unavailable, skipping links'); return }
  console.log('offline db entries:', db.length)

  const byAnilist = new Map()
  for (const entry of db) {
    for (const src of entry.sources) {
      const m = src.match(/anilist\.co\/anime\/(\d+)/)
      if (m) byAnilist.set(Number(m[1]), entry)
    }
  }

  let hit = 0
  for (const a of anime) {
    const entry = byAnilist.get(a.id)
    if (!entry) continue
    const links = []
    for (const src of entry.sources) {
      for (const [host, name] of SITE_OF) {
        if (src.includes(host) && !links.some((l) => l.name === name)) {
          links.push({ name, url: src })
        }
      }
    }
    if (links.length === 0) continue
    const key = `anime:${a.id}`
    enrich[key] = { ...enrich[key], sites: links }
    hit++
  }
  console.log('anime matched to offline db:', hit, '/', anime.length)
  save()
}

// ---- Step B: Jikan → MAL score -------------------------------------------
// Three answers, and they must stay apart:
//   { ok: true, data }  MyAnimeList answered.
//   { ok: true, data: null }  MyAnimeList has no such entry (a real 404).
//   { ok: false }  we could not reach it. NOT an answer. Never store this.
//
// Jikan returns 504 "Jikan failed to connect to MyAnimeList" whenever MAL is
// down. The old code treated that as "no score" and wrote null, and the null
// counted as done forever. That is how 1,595 of 1,599 comics ended up with no
// score: MyAnimeList was unreachable, not score-less.
async function jikan(path) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4${path}`)
      if (res.status === 404) return { ok: true, data: null }
      if (res.status === 429 || res.status >= 500) {
        await sleep(3000 * attempt)
        continue
      }
      if (!res.ok) return { ok: false }
      return { ok: true, data: (await res.json()).data }
    } catch {
      await sleep(3000 * attempt)
    }
  }
  return { ok: false }
}

// A record counts as settled only when MyAnimeList actually answered for it.
// `checked` is that proof. Entries written before this flag existed carry a
// null score with no proof behind it, so they are asked again.
const settled = (entry) => entry && entry.mal && (entry.mal.score || entry.mal.checked)

async function stepJikan(items, kind, apiKind) {
  const todo = items.filter((i) => i.malId && !settled(enrich[`${kind}:${i.id}`]))
  console.log(`jikan ${apiKind}: ${todo.length} to fetch`)
  let n = 0
  let failed = 0
  for (const item of todo) {
    const res = await jikan(`/${apiKind}/${item.malId}`)
    n++
    // Could not reach MyAnimeList. Write nothing: a gap is honest, a false
    // "no score" is not. Ten failures in a row means MAL is down; stop and
    // keep what we have rather than walk the whole list for nothing.
    if (!res.ok) {
      failed++
      if (failed >= 10) {
        console.log(`  MyAnimeList unreachable. Stopping at ${n}/${todo.length}.`)
        break
      }
      await sleep(1100)
      continue
    }
    failed = 0

    const data = res.data
    const key = `${kind}:${item.id}`
    enrich[key] = {
      ...enrich[key],
      mal: data && data.score
        ? { score: data.score, scoredBy: data.scored_by || 0, url: data.url, checked: TODAY }
        : { score: null, checked: TODAY },
    }
    if (n % 50 === 0) { console.log(`  ${apiKind} ${n}/${todo.length}`); save() }
    // Jikan allows 60 calls a minute. A shorter gap just earns 429s.
    await sleep(1100)
  }
  save()
  console.log(`jikan ${apiKind} done: ${n}`)
}

await stepOffline()
await stepJikan(anime, 'anime', 'anime')
await stepJikan(comics, 'comic', 'manga')

const withScore = Object.values(enrich).filter((e) => e.mal && e.mal.score).length
const withSites = Object.values(enrich).filter((e) => e.sites).length
console.log('DONE. entries:', Object.keys(enrich).length, '| MAL scores:', withScore, '| site links:', withSites)
