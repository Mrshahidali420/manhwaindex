// The front door. It does three jobs, in this order:
//   1. old URLs are sent to their new home
//   2. a page already rendered once is served from the edge cache
//   3. everything else goes to Astro, which serves a static file or
//      renders a title or character page from a shard
import redirects from '../data/redirects.json'
import astro from '../dist/_worker.js/index.js'

// How long the edge keeps a rendered page. The data changes once a day.
const CACHE_SECONDS = 86400

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
    const hit = await cache.match(request)
    if (hit) return hit

    const response = await astro.fetch(request, env, ctx)

    // Only a good HTML answer is worth keeping. A 404 must stay cheap to fix.
    const type = response.headers.get('content-type') || ''
    if (response.status === 200 && type.includes('text/html')) {
      const kept = new Response(response.body, response)
      kept.headers.set('cache-control', `public, max-age=0, s-maxage=${CACHE_SECONDS}`)
      ctx.waitUntil(cache.put(request, kept.clone()))
      return kept
    }
    return response
  },
}
