import { readFileSync, writeFileSync } from 'node:fs'

const edit = (p, pairs) => {
  let s = readFileSync(p, 'utf8')
  for (const [from, to] of pairs) {
    if (!s.includes(from)) throw new Error(`${p}: anchor not found -> ${from.slice(0, 60)}`)
    s = s.replace(from, to)
  }
  writeFileSync(p, s)
  console.log('patched', p)
}

// 1. runtime.js gains the country reader, beside envOf.
edit('src/lib/runtime.js', [[
  'export const envOf = (astro) => astro.locals?.runtime?.env',
  'export const envOf = (astro) => astro.locals?.runtime?.env\n\n' +
  '// Cloudflare stamps every request with the reader\'s country. It is used to\n' +
  '// pick their own Amazon store. An empty answer is fine: the shop links fall\n' +
  '// back to the US store on their own.\n' +
  "export const countryOf = (astro) => astro.request.headers.get('cf-ipcountry') || ''",
]])

// 2. The title page passes the country into its buy rows.
edit('src/pages/[kind]/[slug].astro', [
  ["import { loadTitle, envOf, notFound } from '../../lib/runtime.js'",
   "import { loadTitle, envOf, countryOf, notFound } from '../../lib/runtime.js'"],
  ['const buys = shopLinks(item)', 'const buys = shopLinks(item, countryOf(Astro))'],
])

// 3. Same on the character page.
edit('src/pages/character/[slug].astro', [
  ["import { loadCharacter, envOf, notFound } from '../../lib/runtime.js'",
   "import { loadCharacter, envOf, countryOf, notFound } from '../../lib/runtime.js'"],
  ['const buys = characterShopLinks(person, lead.title)',
   'const buys = characterShopLinks(person, lead.title, countryOf(Astro))'],
])

// 4. The edge cache must not hand one country's links to another.
edit('src/worker.js', [[
  "    const cache = caches.default\n" +
  "    // Always GET: the cache API refuses to store a HEAD request.\n" +
  "    const cacheKey = new Request(`${url.origin}${url.pathname}?_b=${BUILD}`, { method: 'GET' })",
  "    const cache = caches.default\n" +
  "    // The buy links point at the reader's own Amazon store, so a page cached\n" +
  "    // for one country must never be served to another. The country joins the\n" +
  "    // key. This costs almost nothing: an edge cache is per data centre, and a\n" +
  "    // data centre already serves mostly one country.\n" +
  "    const country = request.headers.get('cf-ipcountry') || 'zz'\n" +
  "    // Always GET: the cache API refuses to store a HEAD request.\n" +
  "    const cacheKey = new Request(\n" +
  "      `${url.origin}${url.pathname}?_b=${BUILD}&_c=${country}`,\n" +
  "      { method: 'GET' }\n" +
  "    )",
]])
