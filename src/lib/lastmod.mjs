/**
 * The lastmod each title and character URL carries in the sitemap.
 *
 * Until 26 Sep 2026 every URL carried the build date, so all 100,000+ pages
 * claimed to change every night. Google learns to ignore a lastmod that is
 * always new. Now a page says it changed on the later of two days: the last
 * day the page template changed in a way a reader would notice, and the day
 * AniList last edited the record the page is built from.
 */

/** Move this by hand when the title or character page template changes again. */
export const PAGES_CHANGED = '2026-09-26'

// AniList's updatedAt is in seconds; 0 or null means we never saw one.
const dayOf = (seconds) => (seconds > 0 ? new Date(seconds * 1000).toISOString().slice(0, 10) : '')

/** The later of the template date and the record's own AniList edit. */
export function titleLastmod(item) {
  const edited = dayOf(item?.updatedAt)
  return edited > PAGES_CHANGED ? edited : PAGES_CHANGED
}
