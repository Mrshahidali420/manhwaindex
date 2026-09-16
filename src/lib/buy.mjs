/**
 * The words on the buy pages.
 *
 * A buy page answers one question: "I want to own this, where do I get it?"
 * That is a different question from "where can I read it", so it gets its own
 * page rather than a box at the bottom of another one.
 *
 * Every sentence here is written from the record we already hold, so a title
 * added tomorrow gets a full page with no hand editing. Nothing here invents a
 * price, a stock level or an edition: we hold no product data and we are not
 * allowed to hold any until Amazon opens their API to us. See shop-links.js.
 *
 * It imports only the small word helpers. No catalog, no network.
 */
import { wordOf, verbOf, listWords } from './answers.mjs'

/**
 * How popular a story must be before it earns a buy page.
 *
 * Under this line the story was almost certainly never printed in English, so
 * every shop link would open an empty shelf. An empty shelf earns nothing,
 * helps nobody, and a few thousand of them would make the site look like a
 * doorway farm. The title page still carries its buy box, so nothing is lost.
 */
export const BUY_POPULARITY = 10000

const unquote = (text) =>
  String(text || '')
    .split('"')
    .join('')
    .split('“')
    .join('')
    .split('”')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

const capitalise = (text) => String(text || '').charAt(0).toUpperCase() + String(text || '').slice(1)

/** Trim a description to what a search result will actually print. */
const fit = (lines, cap = 165) => lines.find((line) => line.length <= cap) || lines[lines.length - 1]

// ------------------------------------------------------------------- a title

/**
 * Everything the title buy page prints.
 *
 * `item` is the full title record. `kind` is the url word: manhwa, manga,
 * manhua or anime.
 */
export function buyAnswer(item, kind) {
  const title = unquote(item.title)
  const word = wordOf(kind)
  const verb = verbOf(kind)
  const isComic = item.kind !== 'anime'
  const authors = (item.authors || []).map((a) => a.name).filter(Boolean).slice(0, 2)
  const by = authors.length ? ` by ${listWords(authors)}` : ''
  const volumes = isComic && item.volumes ? item.volumes : 0
  const chapters = isComic && item.chapters ? item.chapters : 0
  const episodes = !isComic && item.episodes ? item.episodes : 0
  const studio = !isComic && item.studios && item.studios[0] ? item.studios[0] : ''
  const running = item.status === 'RELEASING'

  // The title tag. The story's whole name stays in it however long it runs:
  // Google cuts what it shows on a phone but still reads the rest, and the
  // rest is what decides which search this page answers.
  const pageTitle = isComic
    ? `Buy ${title} — ${word} volumes, figures and merch`
    : `Buy ${title} — Blu-ray, DVD, figures and merch`

  const heading = `Where to buy ${title}`

  const goods = isComic
    ? 'Printed volumes, figures, art books and posters'
    : 'Discs, figures, art books and posters'

  const description = fit([
    `${goods} for ${title}${by}. Official shops only, in your own country's store. ${
      volumes ? `${volumes} volumes in print.` : 'No fakes, no scan sites.'
    }`,
    `${goods} for ${title}. Official shops only, in your own country's store.`,
    `Where to buy ${title}: official books, discs, figures and merch.`,
  ])

  // The opening line. It says what exists before it asks for a tap.
  const lede = isComic
    ? volumes
      ? `${title}${by} runs to ${volumes} printed ${volumes === 1 ? 'volume' : 'volumes'}${
          running ? ' so far' : ''
        }. Below are the official shops that carry them, and the figures and art books made for the story.`
      : `${title} is a ${word}${by}. Below are the official shops that carry it in print, and the figures, posters and art books made for the story.`
    : `${title} is an anime${studio ? ` from ${studio}` : ''}${
        episodes ? `, ${episodes} ${episodes === 1 ? 'episode' : 'episodes'} long` : ''
      }. Below are the official shops for the disc release, and for the figures and art books made for it.`

  const paragraphs = []

  paragraphs.push({
    heading: `What you can own of ${title}`,
    text: isComic
      ? `${
          volumes
            ? `The print run stands at ${volumes} ${volumes === 1 ? 'volume' : 'volumes'}${
                running ? ', and it is still going' : ''
              }.`
            : `We do not hold a volume count for ${title} yet.`
        } ${
          chapters ? `There are ${chapters} chapters in all. ` : ''
        }Whether an English edition exists depends on the publisher, not on us, so the book link opens a live search rather than a page we wrote. If the shelf comes back empty, that is the honest answer: nobody has printed it in your language yet. The figure and poster links search the merch shelf instead, which is often stocked even when the books are not.`
      : `${
          episodes ? `There are ${episodes} ${episodes === 1 ? 'episode' : 'episodes'}. ` : ''
        }A disc set only exists if a distributor licensed ${title} for your region, and that is their decision, not ours. The disc link opens a live search so you see what is really in print today. The figure and poster links search the merch shelf, which usually stays stocked long after the discs go out of print.`,
  })

  paragraphs.push({
    heading: 'Why there are no prices on this page',
    text: `We are an index, not a shop. We hold no stock, take no payment and ship nothing. Showing a price would mean keeping our own copy of Amazon's data, and a kept price goes wrong within hours. So every link here opens the shop itself with the name already typed in. The price, the edition and the stock you see are the shop's own, and they are right at the second you look.`,
  })

  const faq = []

  faq.push({
    q: `Where can I buy ${title}?`,
    a: isComic
      ? `Through the official shop links on this page. They open Amazon in your own country's store with ${title} already searched, so you see the editions really in print today.`
      : `Through the official shop links on this page. They open Amazon in your own country's store and search for the ${title} disc release and merch.`,
  })

  if (volumes) {
    faq.push({
      q: `How many volumes of ${title} are there?`,
      a: `${volumes} ${volumes === 1 ? 'volume' : 'volumes'}${
        running
          ? ', and more are still coming: the story has not finished yet.'
          : `, and the story is complete at that.`
      }${chapters ? ` That is ${chapters} chapters in all.` : ''}`,
    })
  }

  faq.push({
    q: `Are there ${title} figures?`,
    a: `Figures are only made for stories that sold enough to pay for the mould, so we cannot promise one exists. The merch link on this page searches the figure shelf for ${title}, and what comes back is what is really being sold.`,
  })

  faq.push({
    q: `Can I ${verb} ${title} for free instead?`,
    a: `Sometimes, yes, and legally. Some official platforms give part of a story away to bring readers in. Our free page for ${title} lists every one that does, and says plainly when none does.`,
  })

  return { pageTitle, heading, description, lede, paragraphs, faq, word, verb, isComic }
}

// --------------------------------------------------------------- a character

/**
 * Everything the character buy page prints.
 *
 * `merchIsCharacter` says whether the shop rows are really about this person
 * (figures, prints, apparel) or fell back to the story's own books. The page
 * must not promise a figure when it is offering a paperback.
 */
export function characterBuyAnswer(person, lead, series, leadKind, merchIsCharacter) {
  const who = unquote(person.name)
  const from = unquote(lead.title)
  const word = wordOf(leadKind)
  const verb = verbOf(leadKind)
  const isMain = lead.role === 'MAIN'

  const pageTitle = merchIsCharacter
    ? `Buy ${who} figures and merch — ${from}`
    : `Buy ${who} merch — ${from} ${word} and figures`

  const heading = `Where to buy ${who} merch`

  const description = fit([
    `${
      merchIsCharacter ? 'Figures, posters and apparel' : 'Books, figures and posters'
    } of ${who} from the ${word} ${from}. Official shops only, in your own country's store.`,
    `${who} merch from ${from}: figures, posters and apparel. Official shops only.`,
    `Where to buy ${who} merch from ${from}.`,
  ])

  const lede = merchIsCharacter
    ? `${who} is ${isMain ? 'a main character' : 'a character'} in the ${word} ${from}, and ${from} is big enough that merch of ${who} is really made. Below are the official shelves: figures, wall art and apparel.`
    : `${who} is ${isMain ? 'a main character' : 'a character'} in the ${word} ${from}. ${from} is not big enough for figures of one named character yet, so the honest offer is the story itself: the printed volumes and the merch made for the series.`

  const paragraphs = []

  paragraphs.push({
    heading: merchIsCharacter ? `What ${who} merch exists` : `What you can own of ${from}`,
    text: merchIsCharacter
      ? `A figure of one named character only gets made when the story sold enough copies to pay for the mould. ${from} passed that line, so ${who} shows up on the figure shelf, on posters and on shirts. What we cannot promise is which pose, which scale or which price: those change week to week. Each link opens a live search of the shop so you see what is really being sold today, not a listing we wrote months ago.`
      : `Nobody has made a figure of ${who} that we can find, and we would rather say so than send you to an empty shelf. What does exist is ${from} itself: the printed volumes, and whatever merch carries the series name. Those links are below. If ${from} grows, this page grows with it: the shelves are chosen from the story's own numbers and are re-checked every day.`,
  })

  paragraphs.push({
    heading: 'Why there are no prices on this page',
    text: `We are an index, not a shop. We hold no stock, take no payment and ship nothing. A price copied out of a shop goes stale within hours, so we keep none. Every link opens the shop itself with the name already typed in, and the price, the edition and the stock you see are the shop's own at the second you look.`,
  })

  const faq = []

  faq.push({
    q: `Is there a ${who} figure?`,
    a: merchIsCharacter
      ? `${from} is popular enough that figures of its cast are made and sold, so a ${who} figure is likely. We hold no stock list, so the figure link on this page searches the real shelf and shows you what is there right now.`
      : `We cannot find one. ${from} has not sold at the level that pays for a character figure. The links on this page offer the story itself instead, which does exist in print.`,
  })

  faq.push({
    q: `What is ${who} from?`,
    a: `${who} is ${isMain ? 'a main character' : 'a character'} in ${from}, a ${word}${
      series && series.startYear ? ` that started in ${series.startYear}` : ''
    }. You can see every title ${who} appears in, and where to ${verb} each one legally, on their profile page.`,
  })

  faq.push({
    q: `Where can I buy a ${who} poster?`,
    a: merchIsCharacter
      ? `The wall art link on this page searches posters, canvases and art books for ${who} in your own country's Amazon store.`
      : `Posters of one character are rare for a story this size. The merch link on this page searches the ${from} shelf, which is where art of ${who} would sit if it exists.`,
  })

  return { pageTitle, heading, description, lede, paragraphs, faq, word, verb }
}

export { capitalise }
