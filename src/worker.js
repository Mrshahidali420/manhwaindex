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

// Where the page script posts one row per view and per outbound click. It is
// short on purpose: it travels in every page.
const BEACON_PATH = '/_a'

// The reading room. It must never be cached, or one reader would see another
// reader's numbers, and the numbers would be stale anyway.
const LIVE_PATHS = new Set(['/my-admin'])

/**
 * Keep one event. It can never fail the page: the script does not wait for the
 * answer, and every error here ends as the same empty 204.
 */
async function recordEvent(request, env) {
  const done = new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  })
  if (!env || !env.ANALYTICS) return done

  let body
  try {
    body = await request.json()
  } catch (e) {
    return done
  }
  if (!body || typeof body !== 'object') return done

  // Everything written is cut to a sane length first. A row is only ever read
  // back by us, but a database row should never be allowed to grow without a
  // limit set here.
  const text = (value, max) =>
    String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)

  const now = Date.now()
  try {
    await env.ANALYTICS.prepare(
      'INSERT INTO events (ts, day, name, kind, path, page_type, label, platform, shop_kind, target, country, referrer, device, visitor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )
      .bind(
        now,
        new Date(now).toISOString().slice(0, 10),
        text(body.name, 60) || 'page_view',
        text(body.kind, 20) || 'view',
        text(body.path, 200),
        text(body.page_type, 40),
        text(body.label, 120),
        text(body.platform, 60),
        text(body.shop_kind, 20),
        text(body.target, 300),
        text(request.headers.get('cf-ipcountry'), 2),
        text(body.referrer, 120),
        text(body.device, 10),
        text(body.visitor, 40)
      )
      .run()
  } catch (e) {
    // A full day allowance or a dropped connection must not break a page view.
  }
  return done
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '') || '/'

    const target = redirects[path]
    if (target) return Response.redirect(`${url.origin}${target}${url.search}`, 301)

    if (url.pathname === BEACON_PATH) {
      if (request.method !== 'POST') return new Response(null, { status: 405 })
      return recordEvent(request, env)
    }

    // The admin page reads the database on every request, so it is rendered
    // fresh every time and never kept by the edge.
    if (LIVE_PATHS.has(path)) return astro.fetch(request, env, ctx)

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
