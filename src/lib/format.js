// Pure formatting helpers. NOTHING in this file loads the catalog, so it is
// safe for the Worker to import at request time. Anything that needs the
// whole catalog lives in catalog.js and is build-time only.
import enrichRaw from '../../data/enrich.json'

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
// cross-site links via anime-offline-database. Keyed by AniList id, so
// reslugging never breaks the lookup. Empty object when not yet pulled.
export const enrichOf = (item) =>
  enrichRaw[`${item.kind === 'anime' ? 'anime' : 'comic'}:${item.id}`] || {}
