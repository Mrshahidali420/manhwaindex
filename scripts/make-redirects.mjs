// Build data/redirects.json: every old id-suffixed URL -> its clean URL.
// Runs before astro build; the redirect worker imports the result.
//
// Two sources feed it. reslugAll() works out the machine-made ones from the
// catalog itself. data/manual-redirects.json holds the hand-written ones: a
// dead address a real reader hit, pointed at the page that answers them. The
// hand-written ones are applied last, so they always win.
//
// This is also the ONE script that writes data/slug-registry.json. It runs
// first in `npm run build`, registers every page the registry has not seen,
// and saves it; make-shards.mjs and catalog.js then read it frozen, so all
// three agree on every slug. REGISTRY_READONLY=1 skips the save (the readers
// then work the same new slugs out in memory, from the same inputs).
// ALIAS_REDIRECTS=0 turns the character alias redirects off.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { reslugAll } from '../src/lib/reslug.mjs'
import { dropBlocked, dropBlockedRows } from '../src/lib/blocked.js'
import { loadRegistry, saveRegistry, newRegistry, registrySize } from '../src/lib/slug-registry.mjs'
import { writeFileAtomic } from '../src/lib/write-atomic.mjs'

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'))

// Blocked titles leave first, exactly as they do in make-shards.mjs and
// catalog.js. They used to stay in here, so a blocked title still competed
// for a clean slug and could push a live namesake onto its year slug in the
// redirect map while the pages used the plain one.
const comics = dropBlockedRows(dropBlocked(read('comics.json')))
const anime = dropBlockedRows(dropBlocked(read('anime.json')))
const characters = read('characters.json')

const readonly = process.env.REGISTRY_READONLY === '1'
const aliases = process.env.ALIAS_REDIRECTS !== '0'

const before = loadRegistry()
const start =
  before ||
  newRegistry({
    runId: process.env.GITHUB_RUN_ID || 'local',
    titles: comics.length + anime.length,
    characterPages: characters.filter((c) => c.image && (c.appearsIn || []).length > 0).length,
  })

const result = reslugAll(comics, anime, characters, { registry: start, aliases })
const { redirects, registry } = result

if (readonly) {
  console.log('slug registry: REGISTRY_READONLY=1, not saved')
} else {
  saveRegistry(registry)
}
console.log(
  `slug registry: ${registrySize(registry)} entries` +
    `${before ? '' : ' (new registry)'}, added: ${result.added}, moved: ${result.moved}, ` +
    `renamed: ${result.renamed}, aliases added: ${result.aliases}`
)

const manual = read('manual-redirects.json')
Object.assign(redirects, manual)

const text = JSON.stringify(redirects)
writeFileAtomic(fileURLToPath(new URL('../data/redirects.json', import.meta.url)), text)
console.log(
  `redirects.json: ${Object.keys(redirects).length} old URLs mapped ` +
    `(${Object.keys(manual).length} hand-written, ${result.aliasRedirects} character aliases` +
    `${aliases ? '' : ', ALIAS_REDIRECTS=0'}), ${(text.length / 1048576).toFixed(2)} MB`
)
