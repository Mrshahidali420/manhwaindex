// Pure formatting helpers. NOTHING in this file loads the catalog, so it is
// safe for the Worker to import at request time. Anything that needs the
// whole catalog lives in catalog.js and is build-time only.
import { PLATFORMS, FALLBACK } from './platforms.js'

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
