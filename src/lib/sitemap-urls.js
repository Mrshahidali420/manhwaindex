import {
  comics,
  anime,
  charactersWithPages,
  genres,
  comicsOfCountry,
  animeByPopularity,
  platformHubs,
} from './catalog.js'
import { FILTERS } from './filters.js'
import { MOODS } from './moods.mjs'
// Written by scripts/make-shards.mjs on every build. It holds only the answer
// pages that passed their own gate, so the sitemap never offers a thin page.
import answerUrls from '../../data/answer-urls.json'

export const SITE = 'https://manhwaindex.com'

const KIND_OF_COUNTRY = { KR: 'manhwa', JP: 'manga', CN: 'manhua', TW: 'manhua' }
// The listing routes stop building at page 100, so the sitemap must stop
// there too. A URL we do not build is a 404 for every crawler that follows it.
const MAX_PAGES = 100
const PER_PAGE = 60
const CHARACTERS_PER_PAGE = 120

// Google accepts 50,000 URLs per file. We stay far below that so each file
// downloads fast and a crawler can finish one in a single pass.
const CHUNK = 5000

/** Hubs, browse shelves, filters, genres and pagination: the site's skeleton. */
function coreUrls() {
  const urls = [
    { loc: SITE, priority: '1.0' },
    { loc: `${SITE}/manhwa`, priority: '0.9' },
    { loc: `${SITE}/manga`, priority: '0.9' },
    { loc: `${SITE}/manhua`, priority: '0.9' },
    { loc: `${SITE}/anime`, priority: '0.9' },
    { loc: `${SITE}/character`, priority: '0.9' },
    { loc: `${SITE}/genre`, priority: '0.9' },
    { loc: `${SITE}/where-to-read`, priority: '0.9' },
    { loc: `${SITE}/schedule`, priority: '0.9' },
    { loc: `${SITE}/mood`, priority: '0.9' },
    ...MOODS.map((mood) => ({ loc: `${SITE}/mood/${mood.slug}`, priority: '0.8' })),
    { loc: `${SITE}/shop`, priority: '0.7' },
    { loc: `${SITE}/about`, priority: '0.5' },
    { loc: `${SITE}/contact`, priority: '0.4' },
    { loc: `${SITE}/privacy`, priority: '0.3' },
    { loc: `${SITE}/dmca`, priority: '0.3' },
  ]

  const shelves = {
    manhwa: comicsOfCountry('KR'),
    manga: comicsOfCountry('JP'),
    manhua: comicsOfCountry('CN'),
    anime: animeByPopularity,
  }
  for (const [kind, items] of Object.entries(shelves)) {
    for (const [filter, def] of Object.entries(FILTERS)) {
      if (items.some((item) => def.keep(item, kind))) {
        urls.push({ loc: `${SITE}/${kind}/only/${filter}`, priority: '0.6' })
      }
    }
  }

  // One hub per official platform. These are the pages that answer
  // "what can I read on X", so they sit high in the crawl order.
  for (const hub of platformHubs) {
    urls.push({ loc: `${SITE}/platform/${hub.slug}`, priority: '0.8' })
  }

  for (const g of genres) {
    urls.push({ loc: `${SITE}/genre/${g.slug}`, priority: '0.7' })
  }

  const counts = {
    manhwa: comics.filter((c) => c.country === 'KR').length,
    manga: comics.filter((c) => c.country === 'JP').length,
    manhua: comics.filter((c) => c.country === 'CN' || c.country === 'TW').length,
    anime: anime.length,
  }
  for (const [kind, total] of Object.entries(counts)) {
    for (let page = 2; page <= Math.min(MAX_PAGES, Math.ceil(total / PER_PAGE)); page++) {
      urls.push({ loc: `${SITE}/${kind}/page/${page}`, priority: '0.4' })
    }
  }
  for (let page = 2; page <= Math.min(MAX_PAGES, Math.ceil(charactersWithPages.length / CHARACTERS_PER_PAGE)); page++) {
    urls.push({ loc: `${SITE}/character/page/${page}`, priority: '0.4' })
  }

  return urls
}

const comicUrls = (country) =>
  comics
    .filter((c) => (country === 'CN' ? c.country === 'CN' || c.country === 'TW' : c.country === country))
    .map((item) => ({
      loc: `${SITE}/${KIND_OF_COUNTRY[item.country] || 'manga'}/${item.slug}`,
      // Pages that answer the question get crawled first.
      priority: item.readLinks.length > 0 ? '0.8' : '0.5',
      image: item.cover,
      caption: `Cover of ${item.title}`,
    }))

const otherComicUrls = () =>
  comics
    .filter((c) => !['KR', 'JP', 'CN', 'TW'].includes(c.country))
    .map((item) => ({
      loc: `${SITE}/manga/${item.slug}`,
      priority: item.readLinks.length > 0 ? '0.8' : '0.5',
      image: item.cover,
      caption: `Cover of ${item.title}`,
    }))

const animeUrls = () =>
  anime.map((item) => ({
    loc: `${SITE}/anime/${item.slug}`,
    priority: item.watchLinks.length > 0 ? '0.8' : '0.5',
    image: item.cover,
    caption: `Cover of ${item.title}`,
  }))

const characterUrls = () =>
  charactersWithPages.map((person) => ({
    loc: `${SITE}/character/${person.slug}`,
    priority: '0.6',
    image: person.image,
    caption: `${person.name} portrait`,
  }))

/** Split a long list into numbered parts, so no single file is huge. */
function split(name, urls) {
  if (urls.length <= CHUNK) return urls.length ? [{ name, urls }] : []
  const parts = []
  for (let i = 0; i < urls.length; i += CHUNK) {
    parts.push({ name: `${name}-${parts.length + 1}`, urls: urls.slice(i, i + CHUNK) })
  }
  return parts
}

/**
 * Every sub-sitemap, in crawl order: skeleton first, then titles, then
 * characters. Each entry becomes one /sitemap-<name>.xml file.
 */
export const sitemapParts = [
  ...split('core', coreUrls()),
  ...split('manhwa', comicUrls('KR')),
  ...split('manga', [...comicUrls('JP'), ...otherComicUrls()]),
  ...split('manhua', comicUrls('CN')),
  ...split('anime', animeUrls()),
  ...split('character', characterUrls()),
  ...split('answers-free', answerUrls.free.map((path) => ({ loc: `${SITE}${path}`, priority: '0.7' }))),
  ...split('answers-like', answerUrls.like.map((path) => ({ loc: `${SITE}${path}`, priority: '0.6' }))),
]

export const today = () => new Date().toISOString().slice(0, 10)

// A title, a cover URL or a character name can hold a character XML treats as
// markup. One unescaped "&" makes the whole file unparseable, so every value
// that reaches the XML goes through here first.
const xml = (text) =>
  String(text == null ? '' : text)
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;')
    .split("'")
    .join('&apos;')

/**
 * One <image:image> child per URL that owns a picture.
 *
 * Every cover and every portrait is a real picture people search for by the
 * name of the story. Left alone, Google must find ~107,000 of them by
 * crawling each page. Naming them here hands Google Images the list.
 */
const imageTag = (u) =>
  u.image
    ? `<image:image><image:loc>${xml(u.image)}</image:loc><image:title>${xml(u.caption)}</image:title></image:image>`
    : ''

export function urlsetXml(urls) {
  const day = today()
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (u) =>
      `  <url><loc>${xml(u.loc)}</loc><lastmod>${day}</lastmod><priority>${u.priority}</priority>${imageTag(u)}</url>`,
  )
  .join('\n')}
</urlset>
`
}
