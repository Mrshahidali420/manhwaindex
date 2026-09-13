// BUILD TIME ONLY. This module loads the whole catalog (26 MB of JSON), so a
// page that imports it can never be rendered by the Worker. Pages that the
// Worker renders import lib/format.js and lib/runtime.js instead.
import comicsRaw from '../../data/comics.json'
import animeRaw from '../../data/anime.json'
import characterData from '../../data/characters.json'
import { reslugAll } from './reslug.mjs'
import { characterHasPage, characterIsThin, genreSlug } from './format.js'

// Public URLs carry clean slugs, never database ids (see reslug.mjs).
reslugAll(comicsRaw, animeRaw, characterData)

export const comics = comicsRaw
export const anime = animeRaw

// Everything a Worker-rendered page also needs is re-exported, so the pages
// that were already written against catalog.js keep working unchanged.
export * from './format.js'

/** Sort helper: most-read first, which is also what people search for. */
const byPopularity = (a, b) => b.popularity - a.popularity

export const comicsByPopularity = [...comics].sort(byPopularity)
export const animeByPopularity = [...anime].sort(byPopularity)

export const comicsOfCountry = (code) =>
  comicsByPopularity.filter((c) => c.country === code)

export const findComic = (slug) => comics.find((c) => c.slug === slug)
export const findAnime = (slug) => anime.find((a) => a.slug === slug)

/** AniList media ids are one global space, so one map covers both shelves. */
const itemById = new Map()
for (const c of comics) itemById.set(c.id, { item: c, kind: 'comic' })
for (const a of anime) itemById.set(a.id, { item: a, kind: 'anime' })
export const inIndex = (id) => itemById.get(id)

/** Anime with an episode airing in the next 7 days, soonest first.
 *  The site rebuilds daily, so this list stays honest. */
const WEEK = 7 * 86400
const nowSec = Date.now() / 1000
export const airingThisWeek = anime
  .filter((a) => a.nextEpisode && a.nextEpisode.at > nowSec && a.nextEpisode.at < nowSec + WEEK)
  .sort((a, b) => a.nextEpisode.at - b.nextEpisode.at)

/** Genres worth giving their own page: enough titles to be useful. */
export function genreIndex(items, minimum = 12) {
  const map = new Map()
  for (const item of items) {
    for (const genre of item.genres) {
      if (!map.has(genre)) map.set(genre, [])
      map.get(genre).push(item)
    }
  }
  return [...map.entries()]
    .filter(([, list]) => list.length >= minimum)
    .map(([name, list]) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      items: list.sort(byPopularity),
    }))
    .sort((a, b) => b.items.length - a.items.length)
}

// --- characters -------------------------------------------------------------
export const characters = characterData

export function findCharacter(slug) {
  return characters.find((c) => c.slug === slug)
}

export const charactersWithPages = characters.filter(characterHasPage)
export const charactersIndexable = charactersWithPages.filter((c) => !characterIsThin(c))

// --- genres -----------------------------------------------------------------
// Every genre that appears in the catalog, with counts, biggest first.
export const genres = (() => {
  const tally = new Map()
  for (const item of [...comics, ...anime]) {
    for (const g of item.genres || []) {
      const row = tally.get(g) || { name: g, slug: genreSlug(g), comics: 0, anime: 0 }
      if (item.kind === 'anime') row.anime += 1
      else row.comics += 1
      tally.set(g, row)
    }
  }
  return [...tally.values()].sort((a, b) => b.comics + b.anime - (a.comics + a.anime))
})()

export function ofGenre(name) {
  return {
    comics: comics.filter((c) => (c.genres || []).includes(name)),
    anime: anime.filter((a) => (a.genres || []).includes(name)),
  }
}
