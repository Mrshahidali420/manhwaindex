// Cloudflare serves everything in dist/ as a static file. The adapter's own
// worker code lives there too and must never be downloadable, so it is
// listed in .assetsignore.
import { writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
writeFileSync(join(DIST, '.assetsignore'), '_worker.js\n_routes.json\n')
console.log('wrote dist/.assetsignore')

// Cloudflare refuses to serve any single asset over 25 MiB, and it only says so
// at deploy time, after the build has already been paid for. One 28 MB
// search-index.json cost a whole CI run that way. Fail here instead, where the
// message names the file and nothing has been uploaded yet.
const LIMIT = 25 * 1024 * 1024
const IGNORED = new Set(['_worker.js', '_routes.json', '.assetsignore'])

function walk(dir) {
  const tooBig = []
  for (const name of readdirSync(dir)) {
    if (dir === DIST && IGNORED.has(name)) continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) tooBig.push(...walk(path))
    else if (stat.size > LIMIT) tooBig.push([relative(DIST, path), stat.size])
  }
  return tooBig
}

const oversized = walk(DIST)
if (oversized.length) {
  for (const [path, size] of oversized) {
    console.error(`asset too large: ${path} is ${(size / 1024 / 1024).toFixed(1)} MB (limit 25 MB)`)
  }
  process.exit(1)
}
