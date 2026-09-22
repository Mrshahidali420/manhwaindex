/**
 * Which answer pages a title or a character has earned.
 *
 * A page that cannot answer its own question is a thin page: "0 similar
 * titles", a cast list of two faces, a shop page for a story that was never
 * printed in English. Google finds those and counts them against the site.
 *
 * These gates are the one place that decides. Three readers use them:
 *   - scripts/make-shards.mjs, to pick the answer pages for the sitemap.
 *   - each answer page, which answers 404 when its own gate says no.
 *   - every page that links to an answer page, so we never link to a 404.
 * If they ever disagreed, the sitemap would list pages the Worker refuses,
 * or a title page would send readers to a dead end.
 *
 * Every gate reads only the one record, and every field it reads travels
 * inside the shard record, so the Worker can run them at request time. No
 * catalog and no files: this module must stay safe to load in the Worker.
 */
import { freeSplit, linksOf } from './answers.mjs'
import { shopName, FIGURE_POPULARITY } from './shop-links.js'
import { BUY_POPULARITY } from './buy.mjs'

/** "Where to read X free": only when at least one platform gives some away. */
export function hasFreePage(item) {
  return freeSplit(linksOf(item)).free.length > 0
}

/** "Manhwa like X": a list of fewer than four picks is not a list. */
export function hasLikePage(item) {
  return (item.similar || []).length >= 4
}

/**
 * "All characters in X". "all members of X" and "X characters" are real
 * searches and the title page only shows the first twelve faces. Under six
 * faces the title page already shows them all, so a separate page would say
 * nothing new.
 */
export function hasCastPage(item) {
  const faces = (item.characters || []).filter((c) => c.image)
  return faces.length >= 6
}

/**
 * "Where to buy X". Only worth having for a story people search for. Under
 * the line it was almost certainly never printed in English, so every shop
 * link would open an empty shelf. A name under two letters finds nothing.
 */
export function hasBuyPage(item) {
  return (item.popularity || 0) >= BUY_POPULARITY && shopName(item).length >= 2
}

/**
 * "Where to buy X merch", for one character. The line is higher than for a
 * story: a figure of one named person only gets made for a story that sold
 * enough to pay for the mould. The lead is picked exactly as the profile page
 * picks it: a main role first, and a comic over its own anime.
 */
export function hasCharacterBuyPage(person) {
  const rows = person?.appearsIn || []
  const main = rows.filter((a) => a.role === 'MAIN')
  const from = main.length ? main : rows
  const lead = from.find((a) => a.kind !== 'anime') || from[0]
  if (!lead) return false
  if ((lead.popularity || 0) < FIGURE_POPULARITY) return false
  if (String(person.name || '').trim().length < 2) return false
  return true
}
