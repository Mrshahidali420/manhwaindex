/**
 * Facts this site works out for itself.
 *
 * Everything here is arithmetic on data we already hold: how many official
 * platforms carry a title, which languages they publish in, how the anime and
 * the comic line up, and the order a series is meant to be read in. None of
 * it is copied from anywhere, and none of it is a guess.
 *
 * Two rules, the same two that govern answers.mjs:
 *   1. It imports platform-facts.js and answers.mjs and NOTHING else, so the
 *      Worker can run it at request time.
 *   2. It never states more than the numbers support. Where a fact would need
 *      a human to check it (which chapter an episode ends on, for example),
 *      the text says what is generally true instead of inventing a number.
 */
import { factsFor, FREE } from './platform-facts.js'
import { uniqueBySite, listWords, wordOf } from './answers.mjs'

const PAID_FREE = new Set([FREE.NONE, FREE.TRIAL])

/**
 * How well a title is served by the official platforms: how many, in what
 * languages, in which parts of the world, and whether any of it is free.
 */
export function coverage(links = [], kind = 'manhwa') {
  const rows = uniqueBySite(links)
  if (rows.length === 0) return null

  const isComic = kind !== 'anime'
  const languages = [...new Set(links.map((l) => l.language).filter(Boolean))].sort()
  const regions = [...new Set(rows.map((l) => factsFor(l.site).region).filter(Boolean))]
  const free = rows.filter((l) => {
    const f = factsFor(l.site).free
    return f && !PAID_FREE.has(f)
  })
  const worldwide = rows.filter((l) => factsFor(l.site).region === 'Worldwide')
  const noAccount = rows.filter((l) => factsFor(l.site).account === false)

  const stats = [
    { label: 'Official platforms', value: String(rows.length) },
    {
      label: 'Free to start',
      value: free.length ? `${free.length} of ${rows.length}` : 'None',
      tone: free.length ? 'good' : 'flat',
    },
    {
      label: 'Works worldwide',
      value: worldwide.length ? `${worldwide.length} of ${rows.length}` : 'None',
      tone: worldwide.length ? 'good' : 'flat',
    },
    {
      label: 'No sign-in needed',
      value: noAccount.length ? `${noAccount.length} of ${rows.length}` : 'None',
      tone: noAccount.length ? 'good' : 'flat',
    },
  ]
  if (isComic) {
    stats.splice(1, 0, {
      label: 'Languages',
      value: languages.length ? String(languages.length) : 'Not listed',
    })
  }

  // The sentence a search engine can lift. It repeats no phrase from the
  // table, because a table is not a sentence.
  const parts = []
  parts.push(
    `${rows.length} official ${rows.length === 1 ? 'platform carries' : 'platforms carry'} it.`,
  )
  if (isComic && languages.length) {
    parts.push(
      languages.includes('English')
        ? `English is one of the ${languages.length} ${languages.length === 1 ? 'language' : 'languages'} on offer: ${listWords(languages)}.`
        : `No English edition yet. The official languages are ${listWords(languages)}.`,
    )
  }
  parts.push(
    free.length
      ? `${free.length} of them ${free.length === 1 ? 'lets' : 'let'} you start without paying.`
      : 'Every one of them asks for money first.',
  )
  if (worldwide.length === 0 && regions.length) {
    parts.push(`None of them is worldwide. They serve ${listWords(regions)}.`)
  }

  return { stats, line: parts.join(' '), languages, free: free.length, total: rows.length }
}

const STATUS_TAIL = {
  RELEASING: 'still releasing',
  NOT_YET_RELEASED: 'not out yet',
  FINISHED: 'finished',
  HIATUS: 'on hiatus',
  CANCELLED: 'cancelled',
}

/**
 * How the anime and the comic line up.
 *
 * We do NOT claim which chapter an episode ends on. Nobody publishes that as
 * data, and a wrong number is worse than no number. We give the counts, the
 * status of each side, and the one thing that is always true: a season is a
 * slice of the comic, so the comic is where the rest of the story lives.
 *
 * `item.adapt` is written by scripts/make-shards.mjs, which has the whole
 * catalog. See that file.
 */
export function adaptationAnswer(item, kind) {
  const adapt = item.adapt
  if (!adapt) return null
  const word = wordOf(kind)

  if (kind === 'anime') {
    const src = adapt.source
    if (!src) return null
    const lines = []
    lines.push(
      `${item.title} is drawn first and animated second. The original is a ${wordOf(src.kind)}${
        src.chapters ? ` of ${src.chapters} chapters` : ''
      }, and it is ${STATUS_TAIL[src.status] || 'listed'}.`,
    )
    if (item.episodes) {
      lines.push(
        `This anime has ${item.episodes} ${item.episodes === 1 ? 'episode' : 'episodes'}. One episode carries a few chapters, so the anime shows you a slice of the book, never the whole of it.`,
      )
    }
    if (src.chapters) {
      lines.push(
        `If the anime stopped too soon for you, the ${wordOf(src.kind)} is where the story keeps going.`,
      )
    }
    return { heading: `The anime and the ${wordOf(src.kind)}`, lines, link: src }
  }

  const shows = adapt.shows || []
  if (shows.length === 0) return null
  const tv = shows.filter((s) => s.format === 'TV')
  const films = shows.filter((s) => s.format === 'MOVIE')
  const episodes = tv.reduce((sum, s) => sum + (s.episodes || 0), 0)
  const coming = shows.filter((s) => s.status === 'RELEASING' || s.status === 'NOT_YET_RELEASED')

  const lines = []
  const madeOf = []
  if (tv.length) {
    // "series", not "season": AniList lists One Piece as one entry with a
    // thousand episodes, and calling that a season would be wrong.
    madeOf.push(
      `${tv.length} anime series${episodes ? `, ${episodes} episodes in total` : ''}`,
    )
  }
  if (films.length) madeOf.push(`${films.length} ${films.length === 1 ? 'film' : 'films'}`)
  if (madeOf.length) lines.push(`The anime side of ${item.title} is ${listWords(madeOf)}.`)

  if (item.chapters) {
    lines.push(
      `The ${word} runs to ${item.chapters} chapters and is ${STATUS_TAIL[item.status] || 'listed'}. An episode carries a few chapters at a time, so the anime is a slice of the ${word}, not a replacement for it.`,
    )
  }
  if (coming.length) {
    lines.push(
      `More is coming: ${listWords(coming.map((s) => s.title))} ${coming.length === 1 ? 'is' : 'are'} ${STATUS_TAIL[coming[0].status]}.`,
    )
  } else if (item.chapters) {
    lines.push(`Finished the anime? The ${word} carries the story on from there.`)
  }

  return { heading: `The anime and the ${word}`, lines, shows }
}

/**
 * The order to read or watch a series in.
 *
 * `item.chain` is a straight line of prequels and sequels, worked out at build
 * time by walking the catalog. It exists only when there is more than one
 * part, because a single book has no order.
 */
export function readingOrder(item, kind) {
  const chain = item.chain || []
  if (chain.length < 2) return null
  const word = wordOf(kind)
  const verb = kind === 'anime' ? 'watch' : 'read'
  const at = chain.findIndex((part) => part.self)
  const line =
    at === 0
      ? `${item.title} is where the story starts. ${chain.length - 1} more ${chain.length === 2 ? 'part follows' : 'parts follow'} it.`
      : at === chain.length - 1
        ? `${item.title} is the last part. ${at} ${at === 1 ? 'part comes' : 'parts come'} before it, so ${verb} ${at === 1 ? 'that one' : 'those'} first.`
        : `${item.title} is part ${at + 1} of ${chain.length}. There ${at === 1 ? 'is 1 part' : `are ${at} parts`} before it and ${chain.length - at - 1} after.`
  return { heading: `The order to ${verb} it in`, line, chain, word }
}
