export const prerender = true
import { comics, novels, anime } from '../../lib/catalog.js'
import { sectionOf } from '../../lib/section.mjs'

// The header search box used to fetch one file holding every title. At 107,036
// titles that file was 28 MB: over Cloudflare's 25 MB asset limit, and far too
// much for a phone to download to type in a box.
//
// The index is now cut into slices named after the first two letters of a word.
// Typing "to" fetches /search/to.json and nothing else. A title is filed under
// EVERY word (>= 2 letters) in its title and alternate names, not just the
// first, so "god" still finds "Tower of God" and a one-letter-first-word
// title like "I'm Standing on a Million Lives" is still reachable once the
// client (Base.astro's sliceOf) picks a later word to search on.
//
// This was chosen over filing only the first word + longest word: at the
// local seed size (3,598 titles) the biggest slice stays well under 200
// records either way, so there was no size pressure to trade indexing
// completeness for. Re-check MAX_PER_SLICE headroom if the catalog's word
// count per title grows a lot (e.g. long alternate-name lists).
//
// What this gives up: matching the middle of a word. "ower" no longer finds
// "Tower". Every search engine works that way, and it buys back the 95,000
// titles a single capped file had to drop.

/**
 * Most records a single slice may hold.
 *
 * Common openings like "th" or "ka" would otherwise carry tens of thousands of
 * titles and undo the whole point. Records are written most-popular first, so
 * the cap drops the titles nobody types into a box. They stay reachable through
 * browse, genre pages and search engines.
 */
const MAX_PER_SLICE = 1500

/** How much alternate-name text rides along, in characters. */
const MAX_ALT = 32

/**
 * Accents fold away, apostrophes vanish entirely ("I'll" -> "ill", matching
 * a typed "ill"), and every other punctuation mark becomes a space. This
 * MUST behave identically to the fold() in src/layouts/Base.astro's inline
 * search script: this build uses it to decide which slice a title is filed
 * under, the browser uses its copy to decide which slice to fetch and how
 * to match rows inside it. If the two drift, a client-side match can land
 * in a slice the build never wrote it into.
 */
const fold = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Latin words only: a Japanese synonym cannot be typed into this box. */
const wordsOf = (text) =>
  fold(text)
    .split(/\s+/)
    .filter((w) => w.length >= 2)

// Every cover of the same kind shares one long address, so only the file name
// is stored. The browser rebuilds the rest. That is about 60 bytes a record.
const COVER_HEAD =
  /^https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/(?:manga|anime)\/cover\/large\//

/**
 * One record, written as an array. Object keys would repeat on every one of the
 * several hundred thousand records and cost more than the data itself.
 *
 *   [ title, url, cover file, year, alternate names ]
 *
 * Popularity is not stored. Records are already written most-popular first, and
 * the browser's sort is stable, so that order survives on its own.
 */
function record(item, kind) {
  const cover = (item.cover || '').replace('/large/', '/small/')

  // The title is matched in the browser from the title itself, so it is not
  // repeated here. Only the other names a person might type are.
  const titleWords = new Set(wordsOf(item.title))
  const alt = [...new Set([item.titleRomaji, ...(item.synonyms || []).slice(0, 1)]
    .filter(Boolean)
    .flatMap(wordsOf)
    .filter((w) => !titleWords.has(w)))]

  return [
    item.title,
    `/${kind}/${item.slug}`,
    COVER_HEAD.test(item.cover || '') ? cover.split('/').pop() : cover,
    item.startYear || 0,
    alt.join(' ').slice(0, MAX_ALT).trim(),
  ]
}

/** prefix -> records. Built once and shared by every slice of the build. */
const shards = (() => {
  const map = new Map()
  const rows = [
    ...comics.map((c) => [c, record(c, sectionOf(c))]),
    ...novels.map((n) => [n, record(n, 'novel')]),
    ...anime.map((a) => [a, record(a, 'anime')]),
  ].sort((a, b) => (b[0].popularity || 0) - (a[0].popularity || 0))

  for (const [, row] of rows) {
    const prefixes = new Set(
      [...wordsOf(row[0]), ...row[4].split(' ').filter(Boolean)].map((w) => w.slice(0, 2))
    )
    for (const prefix of prefixes) {
      let list = map.get(prefix)
      if (!list) {
        list = []
        map.set(prefix, list)
      }
      if (list.length < MAX_PER_SLICE) list.push(row)
    }
  }
  return map
})()

export function getStaticPaths() {
  return [...shards.keys()].map((prefix) => ({ params: { prefix } }))
}

export function GET({ params }) {
  return new Response(JSON.stringify(shards.get(params.prefix) || []), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
