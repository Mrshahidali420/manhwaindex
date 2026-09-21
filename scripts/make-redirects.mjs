// Build data/redirects.json: every old id-suffixed URL -> its clean URL.
// Runs before astro build; the redirect worker imports the result.
//
// Two sources feed it. reslugAll() works out the machine-made ones from the
// catalog itself. data/manual-redirects.json holds the hand-written ones: a
// dead address a real reader hit, pointed at the page that answers them. The
// hand-written ones are applied last, so they always win.
import { readFileSync, writeFileSync } from 'node:fs'
import { reslugAll } from '../src/lib/reslug.mjs'

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'))

const comics = read('comics.json')
const anime = read('anime.json')
const characters = read('characters.json')

const { redirects } = reslugAll(comics, anime, characters)

const manual = read('manual-redirects.json')
Object.assign(redirects, manual)

writeFileSync(
  new URL('../data/redirects.json', import.meta.url),
  JSON.stringify(redirects)
)
console.log(
  `redirects.json: ${Object.keys(redirects).length} old URLs mapped ` +
    `(${Object.keys(manual).length} hand-written)`
)
