// Enrich the catalog with MyAnimeList scores (via Jikan) and cross-site
// links for anime (via manami-project/anime-offline-database).
// Writes data/enrich.json keyed "anime:<anilistId>" / "comic:<anilistId>".
// Safe to re-run: it resumes from the existing file and only fills gaps.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OUT = 'data/enrich.json'
const anime = JSON.parse(readFileSync('data/anime.json', 'utf8'))
const comics = JSON.parse(readFileSync('data/comics.json', 'utf8'))
const enrich = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}

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
async function jikan(path) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4${path}`)
      if (res.status === 404) return null
      if (res.status === 429 || res.status >= 500) {
        await sleep(3000 * attempt)
        continue
      }
      if (!res.ok) return null
      return (await res.json()).data
    } catch {
      await sleep(3000 * attempt)
    }
  }
  return null
}

async function stepJikan(items, kind, apiKind) {
  const todo = items.filter((i) => i.malId && !(enrich[`${kind}:${i.id}`] || {}).mal)
  console.log(`jikan ${apiKind}: ${todo.length} to fetch`)
  let n = 0
  for (const item of todo) {
    const data = await jikan(`/${apiKind}/${item.malId}`)
    const key = `${kind}:${item.id}`
    enrich[key] = {
      ...enrich[key],
      mal: data && data.score
        ? { score: data.score, scoredBy: data.scored_by || 0, url: data.url }
        : { score: null },
    }
    n++
    if (n % 100 === 0) { console.log(`  ${apiKind} ${n}/${todo.length}`); save() }
    await sleep(450)
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
