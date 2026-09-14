// The front door. It does three jobs, in this order:
//   1. old URLs are sent to their new home
//   2. a page already rendered once is served from the edge cache
//   3. everything else goes to Astro, which serves a static file or
//      renders a title or character page from a shard
import redirects from '../data/redirects.json'
import shards from '../data/shards.json'
import astro from '../dist/_worker.js/index.js'

// How long the edge keeps a rendered page. The data changes once a day.
const CACHE_SECONDS = 86400

// Every build writes a new builtAt. It goes in the cache key, so a page kept
// by the last build can never be found again after a deploy. Without this a
// template change stays invisible for a full day.
const BUILD = String(shards.builtAt || 0)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '') || '/'

    const target = redirects[path]
    if (target) return Response.redirect(`${url.origin}${target}${url.search}`, 301)

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return astro.fetch(request, env, ctx)
    }

    const cache = caches.default
    // The buy links point at the reader's own Amazon store, so a page cached
    // for one country must never be served to another. The country joins the
    // key. This costs almost nothing: an edge cache is per data centre, and a
    // data centre already serves mostly one country.
    const country = request.headers.get('cf-ipcountry') || 'zz'
    // Always GET: the cache API refuses to store a HEAD request.
    const cacheKey = new Request(
      `${url.origin}${url.pathname}?_b=${BUILD}&_c=${country}`,
      { method: 'GET' }
    )
    const hit = await cache.match(cacheKey)
    if (hit) return hit

    const response = await astro.fetch(request, env, ctx)

    // Only a good HTML answer is worth keeping. A 404 must stay cheap to fix.
    const type = response.headers.get('content-type') || ''
    if (response.status === 200 && type.includes('text/html')) {
      const kept = new Response(response.body, response)
      kept.headers.set('cache-control', `public, max-age=0, s-maxage=${CACHE_SECONDS}`)
      ctx.waitUntil(cache.put(cacheKey, kept.clone()))
      return kept
    }
    return response
  },
}
