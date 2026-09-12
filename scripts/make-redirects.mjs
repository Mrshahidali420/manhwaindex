// Build data/redirects.json: every old id-suffixed URL -> its clean URL.
// Runs before astro build; the redirect worker imports the result.
import { readFileSync, writeFileSync } from 'node:fs'
import { reslugAll } from '../src/lib/reslug.mjs'

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'))

const comics = read('comics.json')
const anime = read('anime.json')
const characters = read('characters.json')

const { redirects } = reslugAll(comics, anime, characters)

writeFileSync(
  new URL('../data/redirects.json', import.meta.url),
  JSON.stringify(redirects)
)
console.log(`redirects.json: ${Object.keys(redirects).length} old URLs mapped`)
