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
 * Each row names its own icon and its own button words. A row that says
 * "Shop figures" is worth more than three rows that all say "Shop", because
 * the reader knows what is behind it before they spend the tap.
 *
 * It imports nothing.
 */

/**
 * The Amazon stores we can be paid by.
 *
 * Amazon runs one programme per country and gives a different tag to each, so
 * a UK reader sent to amazon.com with the US tag earns nothing for either of
 * us. Cloudflare tells us the reader's country, so we can send them to their
 * own store instead.
 *
 * An empty `tag` means "we have not been approved there yet". Such a store is
 * never used: the reader falls back to the US store on the US tag, which is
 * exactly what happens today. So a country switches on the moment its tag is
 * pasted in, and nothing breaks while it is missing.
 *
 * `dept` holds each store's own department ids, because they are NOT the same
 * everywhere: the US calls its film department `movies-tv` and the UK calls it
 * `dvd`. A department we are unsure of is simply left out, and the link then
 * searches the whole store on the same words. That finds slightly more noise,
 * never an error page.
 */
const STORES = {
  us: {
    host: 'www.amazon.com',
    tag: 'manhwaindex-20',
    dept: { books: 'stripbooks', video: 'movies-tv', toys: 'toys-and-games' },
  },
  uk: {
    host: 'www.amazon.co.uk',
    tag: 'manhwaindex-21',
    dept: { books: 'stripbooks', video: 'dvd' },
  },
  de: {
    host: 'www.amazon.de',
    tag: 'manhwaindex06-21',
    dept: { books: 'stripbooks', video: 'dvd' },
  },
  fr: {
    host: 'www.amazon.fr',
    tag: 'manhwainde0f6-21',
    dept: { books: 'stripbooks', video: 'dvd' },
  },
  it: {
    host: 'www.amazon.it',
    tag: 'manhwaindex04-21',
    dept: { books: 'stripbooks', video: 'dvd' },
  },
  es: {
    host: 'www.amazon.es',
    tag: 'manhwaindex0a-21',
    dept: { books: 'stripbooks', video: 'dvd' },
  },
  ca: {
    host: 'www.amazon.ca',
    tag: 'manhwaindex01-20',
    dept: { books: 'stripbooks', video: 'movies-tv' },
  },
  jp: {
    host: 'www.amazon.co.jp',
    tag: 'manhwaindex-22',
    dept: { books: 'english-books', video: 'dvd' },
  },
}

// Which store serves which country. A country that is not listed, or one whose
// store has no tag yet, gets the US store. Neighbours that genuinely shop on
// another country's Amazon are pointed at it, because Amazon has no store of
// their own: Austria buys on amazon.de, Belgium on amazon.fr.
const COUNTRY_STORE = {
  GB: 'uk',
  IE: 'uk',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  BE: 'fr',
  LU: 'fr',
  MC: 'fr',
  IT: 'it',
  ES: 'es',
  PT: 'es',
  CA: 'ca',
  JP: 'jp',
}

// Logical department names. The real Amazon id is looked up per store.
export const BOOKS = 'books'
export const VIDEO = 'video'
export const TOYS = 'toys'

/**
 * The store to use for one reader. Falls back to the US store whenever we have
 * no approved tag for their country, so a link is never built without a tag.
 */
export function storeFor(country) {
  const picked = STORES[COUNTRY_STORE[String(country || '').toUpperCase()]]
  return picked && picked.tag ? picked : STORES.us
}

/**
 * An Amazon shop link in the reader's own store, carrying the tag for it.
 */
export function shopUrl(terms, department, country) {
  const store = storeFor(country)
  const params = new URLSearchParams({ k: terms })
  const dept = store.dept[department]
  if (dept) params.set('i', dept)
  params.set('tag', store.tag)
  return `https://${store.host}/s?${params.toString()}`
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
    // Quote marks inside a title are part of the story's name, never part of
    // the name on the box. Amazon treats them as words to match, so leaving
    // them in makes the search find less than it should.
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The first few words of a title.
 *
 * Amazon looks for every word you give it. A title of eleven words finds
 * nothing at all, and a character name added in front of it finds less than
 * nothing. Four words is enough to tell two stories apart and short enough to
 * still reach the shelf.
 */
export function shortName(name, words = 4) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, words)
    .join(' ')
}

/**
 * The buy rows for one title page. Empty when we have no usable name.
 */
export function shopLinks(item, country) {
  const name = shopName(item)
  if (name.length < 2) return []

  const isAnime = item.kind === 'anime'

  const rows = isAnime
    ? [
        {
          kind: 'discs',
          icon: 'disc',
          label: 'Blu-ray and DVD',
          note: 'The disc release, if one was made',
          cta: 'Shop discs',
          url: shopUrl(`${name} anime`, VIDEO, country),
        },
        {
          kind: 'books',
          icon: 'book',
          label: 'The manga it came from',
          note: 'Printed volumes of the original',
          cta: 'Shop books',
          url: shopUrl(`${name} manga`, BOOKS, country),
        },
      ]
    : [
        {
          kind: 'books',
          icon: 'book',
          label: 'Printed volumes',
          note: 'The official English print run',
          cta: 'Shop books',
          url: shopUrl(`${name} manga`, BOOKS, country),
        },
      ]

  rows.push({
    kind: 'merch',
    icon: 'figure',
    label: 'Figures and merch',
    note: 'Figures, art books, posters and apparel',
    cta: 'Shop merch',
    url: shopUrl(`${name} anime`, TOYS, country),
  })

  return rows
}

/**
 * The two short links printed under a cover on the shop page. Same idea as
 * shopLinks, cut down to what fits beside a thumbnail.
 *
 * The shop page is built ahead of time, so there is no reader to have a
 * country yet. These stay on the US store.
 */
export function shelfLinks(item) {
  const name = shopName(item)
  if (name.length < 2) return []
  const isAnime = item.kind === 'anime'
  return [
    isAnime
      ? { kind: 'discs', label: 'Discs', url: shopUrl(`${name} anime`, VIDEO) }
      : { kind: 'books', label: 'Books', url: shopUrl(`${name} manga`, BOOKS) },
    { kind: 'merch', label: 'Merch', url: shopUrl(`${name} anime`, TOYS) },
  ]
}

/**
 * A figure of one named character only exists for a story that sold enough
 * copies to pay for the mould. AniList popularity is the closest number we
 * hold to that. Under this line the character's own name finds an empty shop,
 * and an empty shop earns nothing and looks broken, so those pages are given
 * the printed volumes of the story instead. Those always exist.
 */
export const FIGURE_POPULARITY = 40000

/**
 * True when the character's buy page exists. The buy page picks its lead
 * title the same way the profile does (a main role first, a comic over its
 * own anime) and answers 404 under FIGURE_POPULARITY; the wall must agree
 * with it, or its merch door opens on nothing.
 */
export function hasMerchPage(person) {
  const rows = person?.appearsIn || []
  if (!rows.length) return false
  const best = (list) => list.find((a) => a.kind !== 'anime') || list[0]
  const main = rows.filter((a) => a.role === 'MAIN')
  const lead = best(main.length ? main : rows)
  return (lead?.popularity || 0) >= FIGURE_POPULARITY
}

/**
 * Merch for one character.
 *
 * A character is what a figure is actually made of, so the series name alone
 * finds the wrong shelf. The series is still added as a second word, because a
 * first name on its own matches half the shop — but only the first few words
 * of it, or the search matches nothing.
 *
 * `series` is the story's own record: its title, its kind and its popularity.
 */
export function characterShopLinks(person, series, country) {
  const who = String(person?.name || '').replace(/\s+/g, ' ').trim()
  if (who.length < 2) return []

  // Not famous enough for a figure. Offer the story itself.
  if ((series?.popularity || 0) < FIGURE_POPULARITY) {
    return shopLinks(series || {}, country)
  }

  const both = `${who} ${shortName(shopName(series), 4)}`.trim()

  return [
    {
      kind: 'figures',
      icon: 'figure',
      label: 'Figures',
      note: `Statues and scale figures of ${who}`,
      cta: 'Shop figures',
      url: shopUrl(`${both} figure`, TOYS, country),
    },
    {
      kind: 'prints',
      icon: 'poster',
      label: 'Posters and prints',
      note: 'Wall art, art books and canvases',
      cta: 'Shop prints',
      url: shopUrl(`${both} poster`, TOYS, country),
    },
    {
      kind: 'apparel',
      icon: 'shirt',
      label: 'Apparel',
      note: 'Shirts, hoodies and accessories',
      cta: 'Shop apparel',
      url: shopUrl(`${both} shirt`, TOYS, country),
    },
  ]
}

// Amazon requires this sentence wherever their links appear. It is kept beside
// the links so the two can never be shipped apart.
export const AMAZON_DISCLOSURE =
  'As an Amazon Associate we earn from qualifying purchases.'
