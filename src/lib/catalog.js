import comicsRaw from '../../data/comics.json'
import animeRaw from '../../data/anime.json'
import characterData from '../../data/characters.json'
import { reslugAll } from './reslug.mjs'

// Public URLs carry clean slugs, never database ids (see reslug.mjs).
reslugAll(comicsRaw, animeRaw, characterData)

export const comics = comicsRaw
export const anime = animeRaw

/**
 * Brand marks for every platform we link to.
 * The colour IS the data on this site: a reader scanning a grid should
 * recognise "that one is on WEBTOON" without reading a word. Keep these
 * accurate to each brand, never invented.
 */
const PLATFORMS = {
  'WEBTOON': { color: '#00D564', note: 'Free, ad-supported' },
  'Naver Webtoon': { color: '#00DC64', note: 'Korean' },
  'Naver Series': { color: '#00C73C', note: 'Korean' },
  'Kakao Webtoon': { color: '#FF365E', note: 'Korean' },
  'KakaoPage': { color: '#FFCC00', note: 'Korean' },
  'Tapas': { color: '#F03C00', note: 'Free with coins' },
  'Tappytoon': { color: '#FF4F6E', note: 'Paid chapters' },
  'Lezhin': { color: '#E5133B', note: 'Paid chapters' },
  'Piccoma': { color: '#FF5C8D', note: 'Japanese' },
  'Manta': { color: '#FF3D00', note: 'Subscription' },
  'Comikey': { color: '#00A9E0', note: 'Free with timer' },
  'INKR': { color: '#FF5722', note: 'Subscription' },
  'MANGA Plus': { color: '#D80000', note: 'Free, official' },
  'Manga Plus': { color: '#D80000', note: 'Free, official' },
  'VIZ': { color: '#0E9CFF', note: 'Subscription' },
  'Yen Press': { color: '#E8112D', note: 'Buy in print' },
  'Seven Seas Entertainment': { color: '#1BA0D7', note: 'Buy in print' },
  'Kodansha': { color: '#009A44', note: 'Buy in print' },
  'Azuki': { color: '#F5405E', note: 'Subscription' },
  'Coolmic': { color: '#00B0F0', note: 'Paid chapters' },
  'WebComics': { color: '#FFB300', note: 'Free with coins' },
  'Bomtoon': { color: '#FF6B00', note: 'Korean' },
  'Lalatoon': { color: '#FF8AB0', note: 'Korean' },
  'Toomics': { color: '#E4002B', note: 'Subscription' },
  'Webnovel': { color: '#E44D26', note: 'Free with coins' },
  'Pocket Comics': { color: '#7C4DFF', note: 'Paid chapters' },
  'NETCOMICS': { color: '#00AEEF', note: 'Paid chapters' },
  'Bilibili Comics': { color: '#00A1D6', note: 'Free with timer' },
  'KuaiKan Manhua': { color: '#FFC800', note: 'Chinese' },
  'Tencent Comics': { color: '#1AAD19', note: 'Chinese' },
  'Dongman Manhua': { color: '#FF7A45', note: 'Chinese' },
  'ONO': { color: '#4A90D9', note: 'Chinese' },

  // Streaming
  'Crunchyroll': { color: '#F47521', note: 'Free tier and premium' },
  'Netflix': { color: '#E50914', note: 'Subscription' },
  'Hulu': { color: '#1CE783', note: 'Subscription' },
  'Amazon Prime Video': { color: '#00A8E1', note: 'Subscription' },
  'Disney Plus': { color: '#0063E5', note: 'Subscription' },
  'HIDIVE': { color: '#00AEEF', note: 'Subscription' },
  'Max': { color: '#0046FF', note: 'Subscription' },
  'YouTube': { color: '#FF0000', note: 'Free, official channel' },
  'Bilibili TV': { color: '#00A1D6', note: 'Free tier' },
  'Bilibili': { color: '#00A1D6', note: 'Free tier' },
  'Tubi TV': { color: '#FBC02D', note: 'Free, ad-supported' },
  'Adult Swim': { color: '#00FF00', note: 'Free episodes' },
  'iQ': { color: '#00BE06', note: 'Free tier' },
  'WeTV': { color: '#FF5C00', note: 'Free tier' },
  'Hoopla': { color: '#0088CE', note: 'Free with library card' },
  'Star+': { color: '#1A1D29', note: 'Subscription' },
}

const FALLBACK = { color: '#8C86A0', note: '' }

export const platform = (site) => PLATFORMS[site] || FALLBACK

/** Format labels a reader would actually say out loud. */
const FORMAT_WORDS = {
  KR: 'manhwa',
  CN: 'manhua',
  JP: 'manga',
  TW: 'manhua',
}
export const formatWord = (item) => FORMAT_WORDS[item.country] || 'comic'

const STATUS_WORDS = {
  FINISHED: 'Finished',
  RELEASING: 'Still releasing',
  NOT_YET_RELEASED: 'Not out yet',
  CANCELLED: 'Cancelled',
  HIATUS: 'On hiatus',
}
export const statusWord = (status) => STATUS_WORDS[status] || 'Unknown'

/** Sort helper: most-read first, which is also what people search for. */
const byPopularity = (a, b) => b.popularity - a.popularity

export const comicsByPopularity = [...comics].sort(byPopularity)
export const animeByPopularity = [...anime].sort(byPopularity)

export const comicsOfCountry = (code) =>
  comicsByPopularity.filter((c) => c.country === code)

export const findComic = (slug) => comics.find((c) => c.slug === slug)
export const findAnime = (slug) => anime.find((a) => a.slug === slug)

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

export const truncate = (text, length) =>
  !text ? '' : text.length <= length ? text : `${text.slice(0, length).replace(/\s+\S*$/, '')}…`

// --- characters -------------------------------------------------------------
export const characters = characterData

export function findCharacter(slug) {
  return characters.find((c) => c.slug === slug)
}

// A character is worth its own page only if we can say something about it.
export function characterHasPage(c) {
  return Boolean(c.image) && c.appearsIn.length > 0
}

export const charactersWithPages = characters.filter(characterHasPage)

export function charactersOf(item) {
  return (item.characters || []).filter((c) => c.image)
}

export function kindOfAppearance(appearance) {
  if (appearance.kind === 'anime') return 'anime'
  if (appearance.country === 'KR') return 'manhwa'
  if (appearance.country === 'CN' || appearance.country === 'TW') return 'manhua'
  return 'manga'
}

// --- genres -----------------------------------------------------------------
export function genreSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

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
