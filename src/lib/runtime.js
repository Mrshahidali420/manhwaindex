// REQUEST TIME. Reads a single record out of a shard through the ASSETS
// binding. Never import catalog.js from here: that would pull the whole
// 26 MB catalog into the Worker and the deploy would be rejected.
import manifest from '../../data/shards.json'
import { bucket, titleKey } from './shard-key.js'

// A shard file is a list of lines, "key<TAB>json". We find our line with a
// plain string search and parse only that one record, so a big shard costs
// almost the same as a small one.
const MAX_CACHED_SHARDS = 8
const cache = new Map()

async function readShard(env, folder, n) {
  const name = `${folder}/${n}`
  const hit = cache.get(name)
  if (hit !== undefined) return hit

  let text = ''
  try {
    const res = await env.ASSETS.fetch(new Request(`https://assets.local/d/${folder}/${n}.txt`))
    if (res.ok) text = await res.text()
  } catch {
    return ''
  }

  // A warm isolate keeps the shard, so the next hit on it is free.
  if (cache.size >= MAX_CACHED_SHARDS) cache.delete(cache.keys().next().value)
  cache.set(name, text)
  return text
}

async function readRecord(env, folder, count, key) {
  if (!count) return null
  const text = await readShard(env, folder, bucket(key, count))
  if (!text) return null

  const at = text.indexOf(`\n${key}\t`)
  if (at < 0) return null
  const from = at + key.length + 2
  const to = text.indexOf('\n', from)
  try {
    return JSON.parse(to < 0 ? text.slice(from) : text.slice(from, to))
  } catch {
    return null
  }
}

/** One title, or null when the kind and slug do not name a real page. */
export function loadTitle(env, kind, slug) {
  return readRecord(env, 't', manifest.titleShards, titleKey(kind, slug))
}

/** One character, or null. */
export function loadCharacter(env, slug) {
  return readRecord(env, 'c', manifest.characterShards, slug)
}

/** The Cloudflare runtime, whatever Astro version put it there. */
export const envOf = (astro) => astro.locals?.runtime?.env

/**
 * The real 404 page, with a real 404 status. Astro cannot rewrite to a
 * page that was built as a file, so the file is served directly.
 */
export async function notFound(astro) {
  const env = envOf(astro)
  let body = '<!doctype html><title>Not found</title><h1>Not found</h1>'
  try {
    const res = await env.ASSETS.fetch(new Request('https://assets.local/404.html'))
    if (res.ok || res.status === 404) body = await res.text()
  } catch {
    // fall through to the plain message above
  }
  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // A 404 must never stick. A title added tomorrow has to work at once,
      // even for a reader whose browser saw the miss today.
      'cache-control': 'no-store',
    },
  })
}
