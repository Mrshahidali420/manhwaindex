/**
 * Turns the amazon-products crawl into data/product-picks.json.
 *
 * Most Amazon clicks that earned nothing were book searches for stories that
 * were never printed in English. The crawl in the sibling
 * amazon-products folder checked the 2,000 most read titles against publisher
 * records. This script keeps two things from it:
 *   - real products (volume 1, a box set, a disc) for titles nobody picked by
 *     hand, so the page can name the product instead of opening a search;
 *   - `noEnglishBooks`, the checked titles with no English print, so the buy
 *     box can stop offering a book search that finds nothing.
 *
 *   node scripts/picks-from-products.mjs [products folder]
 *
 * The folder defaults to ../amazon-products/products. data/picks.json, the
 * hand picks, is only read: a title picked by hand is left out here. The rules
 * live in product-picks-core.mjs.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeJsonAtomic } from '../src/lib/write-atomic.mjs'
import { buildProductPicks } from './product-picks-core.mjs'

const OUT = 'data/product-picks.json'
// manhwaindex shows comics of its own and the anime it shares with whereanime.
const SITES = ['manhwaindex', 'both']

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

function main(folder = '../amazon-products/products') {
  const records = readJson(join(folder, 'all.json'))
  const checkedIds = readJson(join(folder, 'title-list.json'))
    .filter((row) => SITES.includes(row.site))
    .map((row) => row.anilist_id)
  const handTitles = readJson('data/picks.json').titles || {}

  const { titles, noEnglishBooks } = buildProductPicks({ records, checkedIds, handTitles, sites: SITES })
  writeJsonAtomic(OUT, { updated: new Date().toISOString().slice(0, 10), titles, noEnglishBooks })

  const count = Object.values(titles).reduce((n, list) => n + list.length, 0)
  console.log(
    `${OUT}: ${Object.keys(titles).length} titles, ${count} picks, ` +
      `${noEnglishBooks.length} of ${checkedIds.length} checked titles with no English books`
  )
}

main(process.argv[2])
