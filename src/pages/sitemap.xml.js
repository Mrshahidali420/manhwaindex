import { comics, anime, charactersWithPages } from '../lib/catalog.js'

const SITE = 'https://manhwaindex.com'
const KIND_OF_COUNTRY = { KR: 'manhwa', JP: 'manga', CN: 'manhua', TW: 'manhua' }
const PER_PAGE = 60

export function GET() {
  const urls = [
    { loc: SITE, priority: '1.0' },
    { loc: `${SITE}/manhwa`, priority: '0.9' },
    { loc: `${SITE}/manga`, priority: '0.9' },
    { loc: `${SITE}/manhua`, priority: '0.9' },
    { loc: `${SITE}/anime`, priority: '0.9' },
    { loc: `${SITE}/character`, priority: '0.9' },
  ]

  const counts = {
    manhwa: comics.filter((c) => c.country === 'KR').length,
    manga: comics.filter((c) => c.country === 'JP').length,
    manhua: comics.filter((c) => c.country === 'CN' || c.country === 'TW').length,
    anime: anime.length,
  }
  for (const [kind, total] of Object.entries(counts)) {
    for (let page = 2; page <= Math.ceil(total / PER_PAGE); page++) {
      urls.push({ loc: `${SITE}/${kind}/page/${page}`, priority: '0.4' })
    }
  }

  for (const item of comics) {
    urls.push({
      loc: `${SITE}/${KIND_OF_COUNTRY[item.country] || 'manga'}/${item.slug}`,
      // Pages that answer the question get crawled first.
      priority: item.readLinks.length > 0 ? '0.8' : '0.5',
    })
  }
  for (const item of anime) {
    urls.push({
      loc: `${SITE}/anime/${item.slug}`,
      priority: item.watchLinks.length > 0 ? '0.8' : '0.5',
    })
  }

  for (let page = 2; page <= Math.ceil(charactersWithPages.length / 120); page++) {
    urls.push({ loc: SITE + '/character/page/' + page, priority: '0.4' })
  }
  for (const person of charactersWithPages) {
    urls.push({ loc: SITE + '/character/' + person.slug, priority: '0.6' })
  }

  const today = new Date().toISOString().slice(0, 10)
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
