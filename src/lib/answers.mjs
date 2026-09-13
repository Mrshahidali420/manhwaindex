/**
 * The answer pages.
 *
 * Every page on this site should answer one question a real person typed into
 * a search box, in our own words, from facts we already hold. These builders
 * take one catalog record and return the text for a whole page.
 *
 * Two rules keep this file safe:
 *   1. It imports platform-facts.js and NOTHING else. No catalog, no JSON.
 *      That lets the Worker run it at request time and lets make-shards.mjs
 *      run it at build time from plain node.
 *   2. It states only what the record and the platform facts already say.
 *      No guessing, no prices, no promises about a licence we cannot see.
 *
 * Because platform facts belong to the PLATFORM, a title added tomorrow gets
 * a complete set of answer pages tomorrow with no extra step.
 */
import { factsFor, FREE } from './platform-facts.js'

/* -------------------------------------------------------------- tiny words */

const KIND_WORD = { manhwa: 'manhwa', manhua: 'manhua', manga: 'manga', anime: 'anime' }
const STATUS_WORD = {
  FINISHED: 'finished',
  RELEASING: 'still releasing',
  NOT_YET_RELEASED: 'not out yet',
  CANCELLED: 'cancelled',
  HIATUS: 'on hiatus',
}

export const wordOf = (kind) => KIND_WORD[kind] || 'comic'
export const verbOf = (kind) => (kind === 'anime' ? 'watch' : 'read')
export const unitOf = (kind) => (kind === 'anime' ? 'episodes' : 'chapters')

/** "a, b and c" — the way a person says a list out loud. */
export function listWords(names) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** One title can sit on the same platform in four languages. Say it once. */
export function uniqueBySite(links = []) {
  const seen = new Set()
  const out = []
  for (const link of links) {
    if (!link || !link.site || seen.has(link.site)) continue
    seen.add(link.site)
    out.push(link)
  }
  return out
}

export const linksOf = (item) => (item.kind === 'anime' ? item.watchLinks : item.readLinks) || []

/* ------------------------------------------------------------ free or not */

// A trial ends and "none" was never free. Everything else gives a reader
// something real without a card.
const NOT_REALLY_FREE = new Set([FREE.NONE, FREE.TRIAL])

/**
 * Splits the official platforms into three groups: ones that give something
 * away, ones that do not, and ones we hold no facts for. The third group is
 * never called free. Silence is better than a wrong promise.
 */
export function freeSplit(links) {
  const free = []
  const paid = []
  const unknown = []
  for (const link of uniqueBySite(links)) {
    const facts = factsFor(link.site)
    const row = { link, facts }
    if (!facts.free) unknown.push(row)
    else if (NOT_REALLY_FREE.has(facts.free)) paid.push(row)
    else free.push(row)
  }
  return { free, paid, unknown }
}

/** How the free part works, in one sentence, grouped so we never repeat. */
function howFreeWorks(rows, kind) {
  const unit = unitOf(kind)
  const lines = []
  const has = (text) => rows.some((r) => r.facts.free === text)

  if (has(FREE.ALL)) lines.push(`Some of them carry the whole thing for nothing.`)
  if (has(FREE.MOST)) lines.push(`Some carry most of it for nothing.`)
  if (has(FREE.EARLY)) {
    lines.push(`On most of them the older ${unit} are free and only the newest ones cost money.`)
  }
  if (has(FREE.TIMER)) {
    lines.push(`Some hand you one more ${unit.slice(0, -1)} every few hours if you are happy to wait.`)
  }
  if (has(FREE.SOME) || has(FREE.SOME_EP)) {
    lines.push(`Some give you the opening ${unit} and then ask you to pay.`)
  }
  return lines
}

/* ------------------------------------------------ page 1: the free answer */

/**
 * "Where to read X free and legal". The single highest-volume question about
 * any title, and the one a pirate site normally wins. We answer it honestly:
 * yes and where, or no and why.
 */
export function freeAnswer(item, kind) {
  const verb = verbOf(kind)
  const word = wordOf(kind)
  const unit = unitOf(kind)
  const { free, paid, unknown } = freeSplit(linksOf(item))
  const freeNames = free.map((r) => r.link.site)
  const paidNames = paid.map((r) => r.link.site)
  const status = STATUS_WORD[item.status] || 'listed'

  const heading = `Where to ${verb} ${item.title} free and legal`
  const paragraphs = []
  let lede

  if (free.length > 0) {
    lede =
      `Yes. You can ${verb} ${item.title} for free, and legally, on ` +
      `${listWords(freeNames)}. ${free.length === 1 ? 'That platform holds' : 'These platforms hold'} ` +
      `the licence, so nobody is taking a risk here.`

    const works = howFreeWorks(free, kind)
    if (works.length) {
      paragraphs.push({
        heading: 'What free means here',
        text:
          `Free is not the same on every platform. ${works.join(' ')} ` +
          `The table above says exactly what each one gives you, and which country it works in.`,
      })
    }
  } else if (paid.length > 0 || unknown.length > 0) {
    lede =
      `No. There is no free and legal way to ${verb} ${item.title} at the moment. ` +
      `The ${paidNames.length + unknown.length === 1 ? 'one platform that holds' : 'platforms that hold'} ` +
      `the licence ${paidNames.length + unknown.length === 1 ? 'asks' : 'ask'} for money before you start.`
    paragraphs.push({
      heading: 'What it does cost',
      text:
        `${listWords([...paidNames, ...unknown.map((r) => r.link.site)])} ` +
        `${paidNames.length + unknown.length === 1 ? 'is' : 'are'} the official ${
          kind === 'anime' ? 'streaming' : 'reading'
        } ` +
        `${paidNames.length + unknown.length === 1 ? 'home' : 'homes'} for this ${word}. ` +
        `The table above shows how each one charges and where it works. ` +
        `Prices move, so we do not print numbers we cannot keep true.`,
    })
  } else {
    lede =
      `Not yet. No platform we track has an official licence for ${item.title}, ` +
      `free or paid. That normally changes once a ${word} gets popular.`
    paragraphs.push({
      heading: 'What to do meanwhile',
      text:
        `We rebuild this index every day. The moment a publisher or a streaming service ` +
        `picks ${item.title} up, it appears on this page. Nothing else on this page will ` +
        `change: we will never point you at a copy that nobody paid for.`,
    })
  }

  if (free.length > 0 && (paid.length > 0 || unknown.length > 0)) {
    paragraphs.push({
      heading: `Where the rest of it is`,
      text:
        `${listWords([...paidNames, ...unknown.map((r) => r.link.site)])} also ` +
        `${paid.length + unknown.length === 1 ? 'carries' : 'carry'} ${item.title}, ` +
        `but ${paid.length + unknown.length === 1 ? 'it asks' : 'they ask'} for money up front. ` +
        `That is usually how you reach the newest ${unit} on the day they come out.`,
    })
  }

  paragraphs.push({
    heading: 'Why every link here is an official one',
    text:
      `A scan site costs you nothing and pays the people who made ${item.title} nothing. ` +
      `It also tends to carry the kind of advert you do not want on your phone. ` +
      `manhwaindex lists licensed platforms only. We hold no ${unit} of our own, ` +
      `and we take no cut from the platforms we send you to.`,
  })

  const description =
    free.length > 0
      ? `${item.title} is free and legal to ${verb} on ${listWords(freeNames.slice(0, 3))}. ` +
        `Here is how much of it is free on each one, and what the rest costs.`
      : `${item.title} has no free and legal ${
          kind === 'anime' ? 'stream' : 'read'
        } right now. Here is every official platform that carries it, and how each one charges.`

  return {
    heading,
    pageTitle:
      free.length > 0
        ? `Where to ${verb} ${item.title} free (and legal) — ${listWords(freeNames.slice(0, 2))}`
        : `Is ${item.title} free to ${verb}? — the official answer`,
    description,
    lede,
    paragraphs,
    free,
    paid,
    unknown,
    status,
  }
}

/* ------------------------------------------------ page 2: the "like" answer */

/**
 * "Manhwa like X". A recommendation page only earns its place if it says WHY
 * each pick belongs and WHERE you can legally get it. Both come from the
 * record, so both are true for a title added tomorrow.
 */
export function likeAnswer(item, kind) {
  const word = wordOf(kind)
  const verb = verbOf(kind)
  const picks = (item.similar || []).map((p) => {
    const sites = uniqueBySite(p.kind === 'anime' ? p.watchLinks : p.readLinks).map((l) => l.site)
    return { ...p, sites }
  })
  // A pick you can actually go and read is worth more than one you cannot.
  picks.sort((a, b) => b.sites.length - a.sites.length)

  const shared = [...new Set(picks.flatMap((p) => p.shared || []))].slice(0, 4)
  const withLinks = picks.filter((p) => p.sites.length > 0).length

  const heading = `${word.charAt(0).toUpperCase()}${word.slice(1)} like ${item.title}`
  const lede =
    picks.length > 0
      ? `${picks.length} ${word} in this index sit closest to ${item.title}. ` +
        `${shared.length ? `They pull from the same shelves: ${listWords(shared.map((s) => s.toLowerCase()))}. ` : ''}` +
        `${withLinks} of them have an official place to ${verb} them right now.`
      : `We have no close match for ${item.title} in the index yet.`

  const paragraphs = [
    {
      heading: 'How these were picked',
      text:
        `Nothing here is a hand-written list. Every ${word} in the index is compared with ` +
        `${item.title} on the genres both carry. A title needs at least two genres in common ` +
        `to appear, and the most-read ones come first. The list is rebuilt every day, so a ` +
        `${word} added this week can show up here next week.`,
    },
    {
      heading: 'What the platform names mean',
      text:
        `Under each cover we print the official platforms that carry that title. ` +
        `If a title shows no platform, no publisher has licensed it in a language we track. ` +
        `We list it anyway, because knowing a ${word} is not available yet is also an answer.`,
    },
  ]

  return {
    heading,
    pageTitle: `${heading} — ${picks.length} similar titles you can ${verb} legally`,
    description:
      picks.length > 0
        ? `${picks.length} ${word} similar to ${item.title}, picked on shared genres, each with the official platforms that carry it.`
        : `Similar titles to ${item.title}.`,
    lede,
    paragraphs,
    picks,
  }
}

/* ------------------------------------------- the "is it on X" question set */

// The platforms people name in a search box. Everything else is a long tail
// nobody types. Keeping the list short keeps the questions worth reading.
const ASKED_ABOUT = {
  anime: ['Crunchyroll', 'Netflix', 'Hulu', 'Amazon Prime Video'],
  comic: ['WEBTOON', 'Tapas', 'MANGA Plus', 'VIZ'],
}

/**
 * The questions a visitor types instead of reading a table: "is it on
 * Netflix", "is it free", "do I need an account". Answered from the same
 * facts, so the answers can never drift away from the table above them.
 */
export function titleFaq(item, kind) {
  const verb = verbOf(kind)
  const word = wordOf(kind)
  const unit = unitOf(kind)
  const links = uniqueBySite(linksOf(item))
  const names = links.map((l) => l.site)
  const onIt = new Set(names)
  const { free } = freeSplit(links)
  const faq = []

  faq.push({
    q: `Where can I ${verb} ${item.title} legally?`,
    a: links.length
      ? `On ${listWords(names)}. Each one holds a licence for ${item.title}. ` +
        `manhwaindex carries no ${unit} and links only to the platform itself.`
      : `Nowhere yet. No platform we track has an official licence for ${item.title}. ` +
        `This page updates every day, so a new licence shows up here on its own.`,
  })

  faq.push({
    q: `Is ${item.title} free to ${verb}?`,
    a: free.length
      ? `Partly. ${listWords(free.map((r) => r.link.site))} ` +
        `${free.length === 1 ? 'gives' : 'give'} you some of it without paying. ` +
        `The table on this page says how much.`
      : links.length
        ? `No. Every official platform that carries ${item.title} asks for money first.`
        : `There is nothing to pay for yet, because no platform has licensed it.`,
  })

  for (const site of ASKED_ABOUT[kind === 'anime' ? 'anime' : 'comic']) {
    if (faq.length >= 6) break
    if (onIt.has(site)) {
      const facts = factsFor(site)
      faq.push({
        q: `Is ${item.title} on ${site}?`,
        a:
          `Yes. ${site} carries ${item.title}. ` +
          `${facts.pay ? `${facts.pay}. ` : ''}` +
          `${facts.free ? `Free part: ${facts.free.toLowerCase()}. ` : ''}` +
          `${facts.region ? `It works in: ${facts.region.toLowerCase()}.` : ''}`.trim(),
      })
    } else if (links.length > 0 && faq.length < 5) {
      faq.push({
        q: `Is ${item.title} on ${site}?`,
        a: `No. ${site} does not carry ${item.title} in any region we track. ${listWords(names)} ${
          names.length === 1 ? 'does' : 'do'
        }.`,
      })
    }
  }

  if (item.chapters || item.episodes) {
    faq.push({
      q: `How many ${unit} does ${item.title} have?`,
      a: `${item.chapters || item.episodes} ${unit}, and it is ${
        STATUS_WORD[item.status] || 'listed'
      }. That count comes from AniList and is refreshed every day.`,
    })
  }

  return faq.slice(0, 6)
}

/** JSON-LD for a question set. Google reads this; a person reads the block. */
export const faqJsonld = (faq) => ({
  '@type': 'FAQPage',
  mainEntity: faq.map((row) => ({
    '@type': 'Question',
    name: row.q,
    acceptedAnswer: { '@type': 'Answer', text: row.a },
  })),
})
