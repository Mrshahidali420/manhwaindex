// Pure formatting helpers. NOTHING in this file loads the catalog, so it is
// safe for the Worker to import at request time. Anything that needs the
// whole catalog lives in catalog.js and is build-time only.
import { PLATFORMS, FALLBACK } from './platforms.js'
import { LOGOS } from './platform-logos.js'

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

// AniList character bios use a tiny markdown: __bold__, _italic_,
// [name](url) links and ~!spoiler!~ blocks. Render them as safe HTML.
// A bio that was cut mid-sentence (older data) loses its last fragment.
const wholeSentences = (text) => {
  const t = String(text).trim()
  if (/[.!?"'’”)\]]$/.test(t)) return t
  const end = Math.max(t.lastIndexOf('. '), t.lastIndexOf('.\n'), t.lastIndexOf('\n\n'))
  return end > 0 ? t.slice(0, end + 1) : t
}

export const bioHtml = (text) => {
  const safe = wholeSentences(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return safe
    .replace(/~!([\s\S]*?)!~/g, '')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1')
    .replace(/__([^_\n]+)__/g, '<b>$1</b>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s:.,)]|$)/gm, '$1<i>$2</i>')
    .split(/\n{2,}/)
    .map((para) => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// The same bio as plain text, for meta descriptions and structured data.
export const bioText = (text) =>
  bioHtml(text).replace(/<\/p><p>/g, ' ').replace(/<br>/g, ' ').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

export const truncate = (text, length) =>
  !text ? '' : text.length <= length ? text : `${text.slice(0, length).replace(/\s+\S*$/, '')}…`

/**
 * How tall a character is, pulled out of the AniList bio.
 *
 * People search "how tall is X" all day, and the answer is already sitting in
 * the text we store. AniList writers mark it with bold markers, but they are
 * not consistent: the colon sits inside the markers on some records and
 * outside on others, the space before "cm" goes missing, and a growing
 * character is given a range. All of those shapes are the same fact.
 *
 * Returns a short clean string such as "170 cm (5'7\")", or '' when the bio
 * says nothing about height.
 */
export function parseHeight(description) {
  const text = String(description || '')
  // All of these say the same thing, and all of them are in the data:
  //   __Height:__ 170 cm      __Height__: 170 cm
  //   **Height:** 170 cm      **Height**: 170 cm
  //   __Initial Height:__ 168cm      __Height (2045-2049):__ 138 - 155 cm
  const found =
    text.match(
      /(?:__|\*\*)\s*(?:[a-z]+\s+)?height(?![a-z])[^_*\n]{0,24}(?:__|\*\*)\s*:?\s*([^\n]{1,60})/i
    ) ||
    // Some writers use no bold at all. Only a line that STARTS with the word
    // is trusted, so the word "height" inside a sentence is never mistaken
    // for a fact.
    text.match(/(?:^|\n)\s*height\s*:\s*([^\n]{1,60})/i)
  if (!found) return ''

  let value = found[1]
    .replace(/~!.*$/, '')       // a spoiler marker ends the fact
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Stop at the next fact when the writer put two on one line.
  value = value.split(/\s+(?:__|\*\*)/)[0].trim()
  // A trailing separator left over from the cut.
  value = value.replace(/[;,.\-–—\s]+$/, '').trim()
  // "168cm" is the same as "168 cm".
  value = value.replace(/(\d)\s*(cm|mm|m|ft|in|kg)\b/gi, '$1 $2')

  // A height with no digit in it is not a height.
  if (!/\d/.test(value)) return ''
  if (value.length > 48) return ''
  return value
}

export function genreSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const pathOf = (item, kind) =>
  kind === 'anime' ? `/anime/${item.slug}` : `/${formatWord(item)}/${item.slug}`

// A character is worth its own page only if we can say something about it.
export function characterHasPage(c) {
  return Boolean(c.image) && c.appearsIn.length > 0
}

// A page with a portrait and no bio says nothing a search engine wants.
// It stays reachable and keeps passing links, but it is kept out of the
// index and out of the sitemap.
export function characterIsThin(c) {
  return !c.description || bioText(c.description).length < 40
}

export function charactersOf(item) {
  return (item.characters || []).filter((c) => c.image)
}

export function kindOfAppearance(appearance) {
  if (appearance.kind === 'anime') return 'anime'
  if (appearance.country === 'KR') return 'manhwa'
  if (appearance.country === 'CN' || appearance.country === 'TW') return 'manhua'
  return 'manga'
}

// Extra data pulled by scripts/enrich-mal.mjs: MAL score via Jikan, and
// cross-site links via anime-offline-database.
//
// It used to be imported here as one JSON file. That file is packed INTO the
// Worker, and Cloudflare allows 3 MB of Worker code in total. At 2,610 titles
// it was 463 KB; at all 107,036 titles it would break every deploy. So
// scripts/make-shards.mjs now folds each title's entry into that title's own
// shard record, and the Worker reads it off the record it already loaded.
// Empty object when nothing has been pulled for this title yet.
export const enrichOf = (item) => item.extra || {}

/* ------------------------------------------------------------ brand marks */
/**
 * Every platform gets the same square tile. Inside it is the platform's real
 * logo, downloaded once from that platform's own site and served from our own
 * /brand/ folder. We never hotlink one, so no reader is ever reported back to
 * a platform, and a platform going down cannot break our page.
 *
 * A platform we have no logo for yet still gets the same tile, with its
 * initials in the brand colour. So a platform added next year looks deliberate
 * from the first day, and the logo can follow later.
 */
const initialsOf = (site) => {
  const words = site.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words[0][0] + words[1][0]
  // One word can still be two words joined: WebComics, WeTV, KakaoPage. Using
  // the second capital keeps them apart, which "We" three times would not.
  const inner = site.slice(1).search(/[A-Z]/)
  if (inner > -1) return site[0] + site[inner + 1]
  return site.slice(0, 2)
}

export const markOf = (site) => {
  // The logo files are named by slug, so any platform gets its logo without
  // being listed anywhere by hand: drop the file in, and it appears.
  const slug = (site || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // A leading "!" is the build script telling us this mark is drawn dark and
  // needs a pale plate under it. See scripts/make-brand.mjs.
  const entry = LOGOS[slug] || null
  const dark = entry ? entry.startsWith('!') : false
  return {
    ...platform(site),
    src: entry ? `/brand/${dark ? entry.slice(1) : entry}` : null,
    plate: dark,
    initials: initialsOf(site || '?'),
  }
}
