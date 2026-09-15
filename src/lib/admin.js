/**
 * The shared parts of the reading room at /my-admin.
 *
 * The door, the date ranges, and the small helpers that turn a database row
 * into a sentence a person can read. The pages themselves only ask questions
 * and draw tables.
 */

const COOKIE = 'mi_admin'
const THIRTY_DAYS = 60 * 60 * 24 * 30

/** 'YYYY-MM-DD', counted back from now, in UTC. */
export function dayKey(shift = 0, now = Date.now()) {
  return new Date(now - shift * 86400000).toISOString().slice(0, 10)
}

/**
 * A one-way fingerprint. The same word always gives the same answer, and the
 * answer can never be turned back into the word.
 */
async function fingerprint(word) {
  const bytes = new TextEncoder().encode(`manhwaindex:${word}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * The door. One secret word, kept as the Cloudflare secret ADMIN_SECRET.
 * The word is never stored: the cookie holds its fingerprint only.
 *
 * Returns { db, secret, signedIn, wrongWord }.
 */
export async function gate(Astro, env) {
  const db = env?.ANALYTICS || null
  const secret = env?.ADMIN_SECRET || ''
  if (!secret) return { db, secret: '', signedIn: false, wrongWord: false }

  const wanted = await fingerprint(secret)

  if (Astro.request.method === 'POST') {
    const form = await Astro.request.formData()
    const given = String(form.get('word') || '')
    if (given && (await fingerprint(given)) === wanted) {
      Astro.cookies.set(COOKIE, wanted, {
        path: '/my-admin',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: THIRTY_DAYS,
      })
      return { db, secret, signedIn: true, wrongWord: false }
    }
    return { db, secret, signedIn: false, wrongWord: true }
  }

  return {
    db,
    secret,
    signedIn: Astro.cookies.get(COOKIE)?.value === wanted,
    wrongWord: false,
  }
}

/** Ask the database one question. A broken query gives an empty answer, never
 * a broken page. */
export async function ask(db, sql, ...args) {
  if (!db) return []
  try {
    const out = await db.prepare(sql).bind(...args).all()
    return out.results || []
  } catch (e) {
    return []
  }
}

/** The same, for a question with one answer. */
export async function askOne(db, sql, ...args) {
  const rows = await ask(db, sql, ...args)
  return rows[0] || {}
}

// --------------------------------------------------------------- date ranges

/**
 * The five time windows, and where each one reads from.
 *
 * `raw` means the one-by-one `events` table: exact, and able to say "people"
 * and show a journey, but only the last 30 days are kept.
 * `rolled` means the small nightly tables: cheap, and kept forever, but a day
 * is only added there after midnight.
 */
export const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
]

export function rangeOf(url, fallback = 'today') {
  const key = url.searchParams.get('range') || fallback
  const found = RANGES.find((r) => r.key === key) || RANGES[0]
  const now = Date.now()
  const today = dayKey(0, now)

  if (found.key === 'today') {
    return { ...found, mode: 'raw', fromDay: today, toDay: today, sinceTs: 0, exactPeople: true }
  }
  if (found.key === '24h') {
    return {
      ...found,
      mode: 'raw',
      fromDay: dayKey(1, now),
      toDay: today,
      sinceTs: now - 86400000,
      exactPeople: true,
    }
  }
  if (found.key === 'all') {
    return { ...found, mode: 'all', fromDay: '0000-00-00', toDay: today, sinceTs: 0, exactPeople: false }
  }
  const back = found.key === '7d' ? 6 : 29
  return {
    ...found,
    mode: 'mixed',
    fromDay: dayKey(back, now),
    toDay: today,
    today,
    sinceTs: 0,
    exactPeople: false,
  }
}

/** Keep the chosen range when moving between tabs. */
export function withRange(path, range) {
  return range.key === 'today' ? path : `${path}?range=${range.key}`
}

// -------------------------------------------------------------- plain English

/** A page address, said as a name. */
export function humanize(path, label) {
  if (label) return label
  if (!path || path === '/') return 'Home'
  const parts = path.replace(/^\//, '').split('/')
  const last = parts[parts.length - 1] || ''
  const words = last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return words || path
}

/** The section a page belongs to, said as a word. */
export const SECTIONS = {
  home: 'Home',
  manhwa: 'Manhwa',
  manga: 'Manga',
  manhua: 'Manhua',
  anime: 'Anime',
  character: 'Characters',
  shop: 'Shop',
  browse: 'Browse',
  entry: 'Arrived from outside',
}

export function sectionName(type) {
  return SECTIONS[type] || type || 'Other'
}

// Cloudflare gives a two letter country code. The browser engine already
// knows the full name of every country, so no list has to be kept here.
const REGION = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' })
  } catch (e) {
    return null
  }
})()

/** "SG" becomes "Singapore". A code that is not known is given back as it came. */
export function countryName(code) {
  const c = String(code || '').trim().toUpperCase()
  if (!c || c === '??' || c === 'XX' || c === 'T1') return 'Unknown'
  try {
    return (REGION && REGION.of(c)) || c
  } catch (e) {
    return c
  }
}

/** A sending site, said as a name. */
const SOURCES = {
  'google.com': 'Google search',
  'www.google.com': 'Google search',
  'bing.com': 'Bing search',
  'duckduckgo.com': 'DuckDuckGo',
  'l.facebook.com': 'Facebook',
  'facebook.com': 'Facebook',
  't.co': 'Twitter / X',
  'out.reddit.com': 'Reddit',
  'reddit.com': 'Reddit',
  'www.reddit.com': 'Reddit',
  'com.google.android.googlequicksearchbox': 'Google app',
  'yandex.com': 'Yandex search',
}

export function sourceName(source) {
  if (!source) return 'Typed the address'
  if (source.startsWith('utm:')) return `Your own link: ${source.slice(4)}`
  if (SOURCES[source]) return SOURCES[source]
  if (source.startsWith('www.google.')) return 'Google search'
  return source
}

/** Milliseconds, said as time. */
export function fmtDwell(ms) {
  const s = Math.round((Number(ms) || 0) / 1000)
  if (s <= 0) return '—'
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const rest = s % 60
  return rest ? `${m} min ${rest} s` : `${m} min`
}

/** A clock time, UTC. */
export function clock(ts) {
  return `${new Date(ts).toISOString().slice(11, 16)} UTC`
}

/** A big number with spaces, so 12400 reads as 12 400. */
export function num(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Clicks per hundred views. The one number that says if a page does its job. */
export function handOff(clicks, views) {
  if (!views) return 0
  return Math.round((clicks / views) * 1000) / 10
}

/** An event name, said as words: affiliate_amazon_books -> amazon books. */
export function words(name) {
  return String(name || '').replace(/_/g, ' ')
}
