#!/usr/bin/env node
/**
 * Copy WhereAnime's list of live pages from R2 to data/where-links.json, for
 * scripts/make-shards.mjs to turn into links (src/lib/where-links.mjs).
 *
 *   node scripts/pull-where-links.mjs
 *
 * WhereAnime writes the file to the bucket sister-data, key
 * anime/where-links.json, after each deploy that worked, so it always matches
 * the site that is live. This script only ever READS it.
 *
 * Never fails a build. When the file cannot be read (no token, no file yet,
 * bad JSON), it says why, removes any old local copy so a link to a page that
 * went away is never kept, and exits 0. The pages then build without the
 * WhereAnime links.
 */
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { writeFileAtomic } from '../src/lib/write-atomic.mjs'
import { indexWhereLinks } from '../src/lib/where-links.mjs'
import { ROOT, BUCKET, pullSister, warnAs } from './sister-r2.mjs'

const OUT = join(ROOT, 'data', 'where-links.json')
const KEY = process.env.WHERE_LINKS_KEY || 'anime/where-links.json'
const warn = warnAs('WhereAnime links')

function main() {
  let text
  try {
    text = pullSister(KEY)
  } catch (error) {
    rmSync(OUT, { force: true })
    warn(`${error.message}. Building without WhereAnime links.`)
    return
  }
  let links
  try {
    links = indexWhereLinks(JSON.parse(text))
  } catch {
    links = null
  }
  if (!links) {
    rmSync(OUT, { force: true })
    warn(`${BUCKET}/${KEY} is not a where-links file. Building without WhereAnime links.`)
    return
  }
  writeFileAtomic(OUT, text)
  console.log(
    `WhereAnime links: ${links.anime.size} anime and ${links.voiceActors.size} voice actors, ` +
      `${(Buffer.byteLength(text) / 1024).toFixed(0)} KB -> data/where-links.json`
  )
}

main()
