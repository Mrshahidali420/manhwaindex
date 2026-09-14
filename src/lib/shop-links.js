/**
 * Where to BUY, as opposed to where to read.
 *
 * A reader who finishes a series often wants the printed volumes, the disc set,
 * or a figure of the character. That is a real thing they want and the index
 * already knows the title, so the page can answer it.
 *
 * Why these are SHOP links and not product listings: showing a product card
 * with a price and a rating means holding Amazon's product data, and Amazon
 * only hands that data out through its API to an Associate who is already
 * making sales. Scraping it instead is banned by the same agreement that pays
 * us, and the penalty is the account. So until the API opens, every link here
 * carries only the title we already own, works on all ~104,000 pages the day it
 * ships, and can never rot into a dead listing or a wrong price.
 *
 * It imports nothing.
 */

// Amazon hands out one tag per site. Tracking lives here so switching it, or
// dropping it, is one line and not a sweep through the templates.
const TAG = 'manhwaindex-20'

// Amazon's own department ids. Shopping inside a department is the difference
// between "the manga" and every phone case with the name printed on it.
export const BOOKS = 'stripbooks'
export const VIDEO = 'movies-tv'
export const TOYS = 'toys-and-games'

/**
 * An Amazon shop link inside one department, carrying our tag.
 */
export function shopUrl(terms, department) {
  const params = new URLSearchParams({ k: terms, i: department, tag: TAG })
  return `https://www.amazon.com/s?${params.toString()}`
}

/**
 * The shortest name a shop is likely to have on a box. Amazon does not know
 * season suffixes or bracketed editions, and a longer query finds less. The
 * English name is tried first, because that is the one printed on a US box.
 */
export function shopName(item) {
  return String(item.title || item.titleRomaji || '')
    .replace(/\s*[([].*$/, '')
    .replace(/\s*[:\-–]\s*(season|part|cour)\s+\w+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The buy rows for one title page. Empty when we have no usable name.
 */
export function shopLinks(item) {
  const name = shopName(item)
  if (name.length < 2) return []

  const isAnime = item.kind === 'anime'

  const rows = isAnime
    ? [
        {
          label: 'Blu-ray and DVD',
          note: 'The disc release, if one was made',
          url: shopUrl(`${name} anime`, VIDEO),
        },
        {
          label: 'The manga it came from',
          note: 'Printed volumes of the original',
          url: shopUrl(`${name} manga`, BOOKS),
        },
      ]
    : [
        {
          label: 'Printed volumes',
          note: 'The official English print run, if there is one',
          url: shopUrl(`${name} manga`, BOOKS),
        },
      ]

  rows.push({
    label: 'Figures and merch',
    note: 'Figures, art books, posters and apparel',
    url: shopUrl(`${name} anime`, TOYS),
  })

  return rows
}

/**
 * The two short links printed under a cover on the shop page. Same idea as
 * shopLinks, cut down to what fits beside a thumbnail.
 */
export function shelfLinks(item) {
  const name = shopName(item)
  if (name.length < 2) return []
  const isAnime = item.kind === 'anime'
  return [
    isAnime
      ? { label: 'Discs', url: shopUrl(`${name} anime`, VIDEO) }
      : { label: 'Books', url: shopUrl(`${name} manga`, BOOKS) },
    { label: 'Merch', url: shopUrl(`${name} anime`, TOYS) },
  ]
}

/**
 * Merch for one character.
 *
 * A character is what a figure is actually made of, so the series name alone
 * finds the wrong shelf. The series is still added as a second word, because a
 * first name on its own matches half the shop.
 */
export function characterShopLinks(person, seriesTitle) {
  const who = String(person?.name || '').replace(/\s+/g, ' ').trim()
  if (who.length < 2) return []
  const series = String(seriesTitle || '').replace(/\s*[([].*$/, '').trim()
  const both = series ? `${who} ${series}` : who

  return [
    {
      label: 'Figures',
      note: `Statues and figures of ${who}`,
      url: shopUrl(`${both} figure`, TOYS),
    },
    {
      label: 'Posters and prints',
      note: 'Wall art and art books',
      url: shopUrl(`${both} poster`, TOYS),
    },
    {
      label: 'Apparel',
      note: 'Shirts, hoodies and accessories',
      url: shopUrl(`${both} shirt`, TOYS),
    },
  ]
}

// Amazon requires this sentence wherever their links appear. It is kept beside
// the links so the two can never be shipped apart.
export const AMAZON_DISCLOSURE =
  'As an Amazon Associate we earn from qualifying purchases.'
