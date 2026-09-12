import { comics, anime } from '../lib/catalog.js'

const KIND_OF_COUNTRY = { KR: 'manhwa', JP: 'manga', CN: 'manhua', TW: 'manhua' }

// One compact record per title. Short keys keep the file small:
// s = searchable text, t = title, u = url, k = kind, y = year, c = cover.
function entry(item, kind) {
  return {
    s: [item.title, item.titleRomaji, ...(item.synonyms || []).slice(0, 2)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .slice(0, 140),
    t: item.title,
    u: `/${kind}/${item.slug}`,
    k: kind,
    y: item.startYear || '',
    c: (item.cover || '').replace('/large/', '/small/'),
  }
}

export function GET() {
  const rows = [
    ...comics.map((c) => entry(c, KIND_OF_COUNTRY[c.country] || 'manga')),
    ...anime.map((a) => entry(a, 'anime')),
  ] // catalog order already puts the most popular first within each block

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
