#!/usr/bin/env node
/**
 * Copy the episode air dates the sister ingest keeps in R2 to data/airing.json,
 * for scripts/make-shards.mjs to fold into the anime records.
 *
 *   node scripts/pull-airing.mjs
 *
 * The file is written each night by where-build's scripts/ingest-airing.mjs to
 * the bucket sister-data, key latest/airing.json. This script only ever READS
 * it: sister-data belongs to the sister sites, and nothing here writes there.
 *
 * Never fails a build. When the file cannot be read (no token, no rights on
 * the bucket, no file yet, bad JSON), it says why, removes any old local copy
 * so a stale schedule is never shown, and exits 0. The build then runs as
 * before and the episode lists simply do not appear.
 *
 * Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in CI; locally a
 * `wrangler login` is enough.
 */
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { writeFileAtomic } from '../src/lib/write-atomic.mjs'
import { indexAiring } from '../src/lib/episodes.mjs'
import { ROOT, BUCKET, pullSister, warnAs } from './sister-r2.mjs'

const OUT = join(ROOT, 'data', 'airing.json')
const KEY = 'latest/airing.json'
const warn = warnAs('episode dates')

function main() {
  let text
  try {
    text = pullSister(KEY)
  } catch (error) {
    rmSync(OUT, { force: true })
    warn(`${error.message}. Building without episode lists.`)
    return
  }
  let airing
  try {
    airing = indexAiring(JSON.parse(text))
  } catch (error) {
    airing = null
  }
  if (!airing) {
    rmSync(OUT, { force: true })
    warn(`${BUCKET}/${KEY} is not an airing file. Building without episode lists.`)
    return
  }
  writeFileAtomic(OUT, text)
  console.log(
    `episode dates: ${airing.history.size} shows with a full history, ${airing.window.size} in the +/-60 day schedule, ` +
      `${(Buffer.byteLength(text) / 1024).toFixed(0)} KB -> data/airing.json`
  )
}

main()
