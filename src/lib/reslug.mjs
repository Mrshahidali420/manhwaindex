/**
 * Clean public slugs.
 *
 * The raw data carries AniList ids in every slug (solo-leveling-105398).
 * Public URLs must not expose database ids, so at load time every slug
 * is stripped to its clean form. Collisions inside one URL namespace are
 * resolved by popularity: the most popular title keeps the clean slug,
 * the rest get the first-release year, and only as a last resort does a
 * title keep its original id slug. Characters have no year, so losing
 * duplicates keep their id slug.
 *
 * Returns the 301 map { "/manhwa/solo-leveling-105398": "/manhwa/solo-leveling", ... }
 * consumed by the redirect worker.
 */

import { sectionOf, READ_SECTIONS } from './section.mjs'

export const comicKind = sectionOf

const stripId = (slug) => slug.replace(/-\d+$/, '')

/**
 * Assign clean slugs inside one namespace.
 * `items` must already be sorted winner-first.
 * Returns Map(oldSlug -> newSlug).
 */
function assign(items, { yearOf } = {}) {
  const taken = new Set()
  const map = new Map()
  for (const item of items) {
    const base = stripId(item.slug) || item.slug
    let slug = base
    if (taken.has(slug) && yearOf) {
      const year = yearOf(item)
      if (year) slug = `${base}-${year}`
    }
    if (taken.has(slug)) slug = item.slug // last resort: keep the id slug
    taken.add(slug)
    map.set(item.slug, slug)
  }
  return map
}

export function reslugAll(comics, anime, characters) {
  const byPop = (a, b) => (b.popularity || 0) - (a.popularity || 0)
  const yearOf = (item) => item.startYear

  // Comics collide only inside their own section (manhwa/manga/manhua/novel).
  const comicMap = new Map()
  for (const kind of READ_SECTIONS) {
    const group = comics.filter((c) => comicKind(c) === kind).sort(byPop)
    for (const [oldSlug, newSlug] of assign(group, { yearOf })) comicMap.set(oldSlug, newSlug)
  }

  const animeMap = assign([...anime].sort(byPop), { yearOf })

  const charSorted = [...characters].sort(
    (a, b) => (b.appearsIn?.length || 0) - (a.appearsIn?.length || 0)
  )
  const charMap = assign(charSorted) // no year: duplicates keep the id slug

  // 301 map, built from the OLD slugs before anything is rewritten.
  const redirects = {}
  for (const c of comics) {
    const next = comicMap.get(c.slug)
    if (next !== c.slug) redirects[`/${comicKind(c)}/${c.slug}`] = `/${comicKind(c)}/${next}`
  }
  for (const a of anime) {
    const next = animeMap.get(a.slug)
    if (next !== a.slug) redirects[`/anime/${a.slug}`] = `/anime/${next}`
  }
  for (const ch of characters) {
    const next = charMap.get(ch.slug)
    if (next !== ch.slug) redirects[`/character/${ch.slug}`] = `/character/${next}`
  }

  // Rewrite the items and every embedded cross-reference.
  const swap = (map, obj) => {
    if (obj && map.has(obj.slug)) obj.slug = map.get(obj.slug)
  }
  for (const c of comics) {
    swap(comicMap, c)
    for (const rel of c.animeInIndex || []) swap(animeMap, rel)
    for (const person of c.characters || []) swap(charMap, person)
  }
  for (const a of anime) {
    swap(animeMap, a)
    for (const rel of a.comicInIndex || []) swap(comicMap, rel)
    for (const person of a.characters || []) swap(charMap, person)
  }
  for (const ch of characters) {
    swap(charMap, ch)
    for (const app of ch.appearsIn || []) {
      swap(app.kind === 'anime' ? animeMap : comicMap, app)
    }
  }

  return { redirects }
}
