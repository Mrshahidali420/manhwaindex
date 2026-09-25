/**
 * Links to WhereAnime (whereanime.com), the sister site with episode date
 * tables, full casts, voice actor pages and watch orders.
 *
 * A link is made only to a page WhereAnime says it has. It publishes that list
 * after each deploy that worked, next to its own state in the R2 bucket
 * sister-data (key anime/where-links.json):
 *
 *   {
 *     "v": 1,
 *     "builtAt": 1790351706081,
 *     "anime":       { "<AniList anime id>": "<slug>" },   -> /anime/<slug>
 *     "voiceActors": { "<AniList staff name.full>": "<slug>" }  -> /voice-actor/<slug>
 *   }
 *
 * Only pages that are live (in its sitemap) belong in it. Voice actors are
 * keyed by name because that is all our records hold; a name two live voice
 * actors share is left out on WhereAnime's side, and any two that collide
 * here after tidying are dropped too, so a link never lands on the wrong person.
 *
 * scripts/pull-where-links.mjs copies the file to data/where-links.json and
 * scripts/make-shards.mjs folds the slugs into the records, so the Worker
 * fetches nothing. No file, no links: every page builds as before.
 *
 * Pure: plain data in, plain data out.
 */

export const WHERE_ANIME = 'https://whereanime.com'

// WhereAnime slugs are plain lowercase words and dashes (entity-slugs.mjs).
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The key a voice actor's name is matched on: same letters, any spacing or case. */
export const nameKey = (name) =>
  String(name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * where-links.json, checked: { anime: Map(id -> slug), voiceActors: Map(nameKey -> slug) },
 * or null when it is not a where-links file. Bad rows are dropped one by one.
 */
export function indexWhereLinks(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null
  const isMap = (value) => value && typeof value === 'object' && !Array.isArray(value)
  if (!isMap(raw.anime) && !isMap(raw.voiceActors)) return null

  const anime = new Map()
  for (const [id, slug] of Object.entries(isMap(raw.anime) ? raw.anime : {})) {
    const n = Number(id)
    if (Number.isInteger(n) && n > 0 && typeof slug === 'string' && SLUG.test(slug)) anime.set(n, slug)
  }

  const voiceActors = new Map()
  const clashed = new Set()
  for (const [name, slug] of Object.entries(isMap(raw.voiceActors) ? raw.voiceActors : {})) {
    const key = nameKey(name)
    if (!key || typeof slug !== 'string' || !SLUG.test(slug)) continue
    if (voiceActors.has(key) && voiceActors.get(key) !== slug) clashed.add(key)
    voiceActors.set(key, slug)
  }
  for (const key of clashed) voiceActors.delete(key)

  return { anime, voiceActors }
}

export const whereAnimeUrl = (slug) => `${WHERE_ANIME}/anime/${slug}`
export const whereVoiceActorUrl = (slug) => `${WHERE_ANIME}/voice-actor/${slug}`

/**
 * Fold the slugs into the records: `whereSlug` on each anime WhereAnime has a
 * page for, and `voiceWhere` / `voiceEnWhere` on each character's anime rows
 * whose voice actor has one. Returns new arrays; a record with nothing to add
 * comes back as it was. `links` is indexWhereLinks output, or null.
 */
export function attachWhereLinks(anime, characters, links) {
  if (!links) return { anime, characters, titles: 0, voices: 0 }
  let titles = 0
  const nextAnime = anime.map((item) => {
    const slug = links.anime.get(item.id)
    if (!slug) return item
    titles++
    return { ...item, whereSlug: slug }
  })

  let voices = 0
  const voiceSlug = (name) => (name ? links.voiceActors.get(nameKey(name)) : undefined)
  const nextCharacters = characters.map((person) => {
    let changed = false
    const rows = (person.appearsIn || []).map((row) => {
      if (row.kind !== 'anime') return row
      const jp = voiceSlug(row.voice)
      const en = voiceSlug(row.voiceEn)
      if (!jp && !en) return row
      changed = true
      voices++
      return { ...row, ...(jp ? { voiceWhere: jp } : {}), ...(en ? { voiceEnWhere: en } : {}) }
    })
    return changed ? { ...person, appearsIn: rows } : person
  })

  return { anime: nextAnime, characters: nextCharacters, titles, voices }
}
