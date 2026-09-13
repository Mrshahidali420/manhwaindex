// Cloudflare serves everything in dist/ as a static file. The adapter's own
// worker code lives there too and must never be downloadable, so it is
// listed in .assetsignore.
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
writeFileSync(join(ROOT, 'dist', '.assetsignore'), '_worker.js\n_routes.json\n')
console.log('wrote dist/.assetsignore')
