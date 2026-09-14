/**
 * Where to BUY a title, as opposed to where to read it.
 *
 * A reader who finishes a series often wants the printed volumes, the disc set,
 * or a figure of the character. That is a real thing they want and the index
 * already knows the title, so the page can answer it.
 *
 * Why these are SEARCH links and not product links: a product link needs a
 * product database, and no free one exists for manga volumes or anime merch.
 * A search link needs nothing but the title we already have, works on every one
 * of the ~104,000 pages the day it ships, and can never rot into a dead listing
 * or a wrong price. The honest wording says it opens a search, so a series that
 * was never printed in English shows an empty search and not a broken promise.
 *
 * It imports nothing.
 */

// Amazon hands out one tag per site. Tracking lives here so switching it, or
// dropping it, is one line and not a sweep through the templates.
const TAG = 'manhwaindex-20'

// Amazon's own department ids. Searching inside a department is the difference
// between "the manga" and every phone case with the name printed on it.
const BOOKS = 'stripbooks'
const VIDEO = 'movies-tv'
const TOYS = 'toys-and-games'

/**
 * Amazon search inside one department, carrying our tag.
 */
function amazon(terms, department) {
  const params = new URLSearchParams({ k: terms, i: department, tag: TAG })
  return `https://www.amazon.com/s?${params.toString()}`
}

/**
 * The shortest name a shop is likely to have on a box. Amazon does not know
 * season suffixes or bracketed editions, and a longer query finds less. The
 * English name is tried first, because that is the one printed on a US box.
 */
function shopName(item) {
  return String(item.title || item.titleRomaji || '')
    .replace(/\s*[([].*$/, '')
    .replace(/\s*[:\-–]\s*(season|part|cour)\s+\w+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The buy rows for one title. Empty when we have no usable name.
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
          url: amazon(`${name} anime`, VIDEO),
        },
        {
          label: 'The manga it came from',
          note: 'Printed volumes of the original',
          url: amazon(`${name} manga`, BOOKS),
        },
      ]
    : [
        {
          label: 'Printed volumes',
          note: 'The official English print run, if there is one',
          url: amazon(`${name} manga`, BOOKS),
        },
      ]

  rows.push({
    label: 'Figures and merch',
    note: 'Figures, art books, posters and apparel',
    url: amazon(`${name} anime`, TOYS),
  })

  return rows
}

// Amazon requires this sentence wherever their links appear. It is kept beside
// the links so the two can never be shipped apart.
export const AMAZON_DISCLOSURE =
  'As an Amazon Associate we earn from qualifying purchases.'
