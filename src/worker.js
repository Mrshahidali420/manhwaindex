// The front door. It does three jobs, in this order:
//   1. old URLs are sent to their new home
//   2. a page already rendered once is served from the edge cache
//   3. everything else goes to Astro, which serves a static file or
//      renders a title or character page from a shard
import redirects from '../data/redirects.json'
import shards from '../data/shards.json'
import astro from '../dist/_worker.js/index.js'
import { runRollup } from './lib/rollup.js'

// How long the edge keeps a rendered page. The data changes once a day.
const CACHE_SECONDS = 86400

// Every build writes a new builtAt. It goes in the cache key, so a page kept
// by the last build can never be found again after a deploy. Without this a
// template change stays invisible for a full day.
const BUILD = String(shards.builtAt || 0)

// Where the page script posts one row per view, per outbound click and per
// exit. It is short on purpose: it travels in every page.
const BEACON_PATH = '/_a'

// A row is small. Anything bigger than this is a mistake or an attack, and is
// dropped before it reaches the database.
const MAX_BODY = 32768
// Most visits now arrive as one batch at the end, so a body holds many rows.
const MAX_ROWS = 25
const MAX_AGE = 86400000

// The only words allowed in the kind column. Anything else becomes 'other', so
// a made up value can never widen a table or break a count.
const KINDS = new Set(['view', 'read', 'watch', 'buy', 'other', 'leave', 'missing'])

// The longest time on page we believe: 30 minutes. A tab left open all night
// must not pull the average up.
const MAX_DWELL = 1800000

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
    const raw = await request.text()
    if (!raw || raw.length > MAX_BODY) return done
    body = JSON.parse(raw)
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

  // A number we can trust, or zero.
  const num = (value, max) => {
    const n = Math.round(Number(value))
    if (!Number.isFinite(n) || n < 0) return 0
    return n > max ? max : n
  }

  // One visit used to cost three requests: open, click, leave. On a free
  // Workers plan that was 82% of the whole daily allowance, and the site
  // started answering 504 once the allowance ran out. The page now keeps its
  // rows in the tab and sends them all together when the reader really goes,
  // so a whole visit costs one request instead of three.
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [body]
  const now = Date.now()
  const sql =
    'INSERT INTO events (ts, day, name, kind, path, page_type, label, platform, shop_kind, target, country, referrer, device, visitor, session, step, prev, prev_type, dwell, campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  const country = text(request.headers.get('cf-ipcountry'), 2)

  try {
    const stmt = env.ANALYTICS.prepare(sql)
    const batch = []
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const kind = text(row.kind, 20) || 'view'
      // The tab says how long ago each row happened, so a batch sent at the
      // end still keeps the real order and the real times.
      const ts = now - num(row.age, MAX_AGE)
      batch.push(
        stmt.bind(
          ts,
          new Date(ts).toISOString().slice(0, 10),
          text(row.name, 60) || 'page_view',
          KINDS.has(kind) ? kind : 'other',
          text(row.path, 200),
          text(row.page_type, 40),
          text(row.label, 120),
          text(row.platform, 60),
          text(row.shop_kind, 20),
          text(row.target, 300),
          country,
          text(row.referrer, 120),
          text(row.device, 10),
          text(row.visitor, 40),
          text(row.session, 40),
          num(row.step, 500),
          text(row.prev, 200),
          text(row.prev_type, 40),
          num(row.dwell, MAX_DWELL),
          text(row.campaign, 120)
        )
      )
    }
    if (batch.length) await env.ANALYTICS.batch(batch)
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

    // The admin pages read the database on every request, so they are
    // rendered fresh every time and never kept by the edge.
    if (path === '/my-admin' || path.startsWith('/my-admin/')) {
      return astro.fetch(request, env, ctx)
    }

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

  /**
   * Once a night, at 00:10 UTC, yesterday is squeezed into the small daily
   * tables and raw rows older than 30 days are thrown away. See
   * src/lib/rollup.js. One run is one Worker request out of 100,000 a day.
   */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runRollup(env && env.ANALYTICS))
  },
}
