import { platform } from './catalog.js'

// Browse-page filters. Every one is honest: it only narrows what the
// index already knows, it never promises data we do not have.
const linksOf = (item, kind) => (kind === 'anime' ? item.watchLinks : item.readLinks) || []

const hasFreeLink = (item, kind) =>
  linksOf(item, kind).some((l) => (platform(l.site).note || '').toLowerCase().includes('free'))

export const FILTERS = {
  official: {
    label: 'With official links',
    blurb: (word) => `Every ${word} here has at least one official platform you can open right now.`,
    keep: (item, kind) => linksOf(item, kind).length > 0,
  },
  free: {
    label: 'Free to start',
    blurb: (word) => `Every ${word} here is on at least one platform with a free tier or free chapters.`,
    keep: hasFreeLink,
  },
  completed: {
    label: 'Completed',
    blurb: (word) => `Finished stories only — start any ${word} here and read it to the end.`,
    keep: (item) => item.status === 'FINISHED',
  },
  ongoing: {
    label: 'Ongoing',
    blurb: (word) => `Still releasing. New chapters or episodes are coming for every ${word} here.`,
    keep: (item) => item.status === 'RELEASING',
  },
}
