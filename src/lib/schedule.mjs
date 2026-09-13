/**
 * The airing week, cut into days.
 *
 * AniList gives every releasing anime the timestamp of its next episode. That
 * one number is the only piece of data on this site that changes by itself,
 * so it is worth a page of its own: the page is different every single day
 * without anybody writing a word.
 *
 * Build-time only in practice (it is fed from catalog.js), but it imports
 * nothing, so it stays cheap and easy to test.
 */

const DAY = 86400

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Every time on this page is UTC. A visitor in Karachi and a visitor in Texas
 * must see the same HTML, because the page is cached at the edge and served
 * to both. The live countdown in the browser is what makes it personal.
 */
const utcKey = (epoch) => new Date(epoch * 1000).toISOString().slice(0, 10)

/** Groups anime into one bucket per UTC day, soonest day first. */
export function airingDays(airing, nowSec = Date.now() / 1000) {
  const todayKey = utcKey(nowSec)
  const tomorrowKey = utcKey(nowSec + DAY)

  const buckets = new Map()
  for (const show of airing) {
    const key = utcKey(show.nextEpisode.at)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(show)
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, shows]) => {
      const when = new Date(`${key}T00:00:00Z`)
      const weekday = DAY_NAMES[when.getUTCDay()]
      return {
        key,
        // "Today" and "Tomorrow" are what a reader actually wants to see.
        // The weekday stays next to it, so the label is never ambiguous.
        label: key === todayKey ? 'Today' : key === tomorrowKey ? 'Tomorrow' : weekday,
        weekday,
        date: `${weekday}, ${MONTHS[when.getUTCMonth()]} ${when.getUTCDate()}`,
        shows: shows.sort((a, b) => a.nextEpisode.at - b.nextEpisode.at),
      }
    })
}

/**
 * The sentence at the top of the page. It counts what is actually there, so
 * it can never promise a show the list does not hold.
 */
export function scheduleLede(days) {
  const total = days.reduce((sum, day) => sum + day.shows.length, 0)
  if (total === 0) {
    return 'No episode is scheduled in the next seven days. Check back tomorrow — this page is rebuilt every day.'
  }
  const today = days.find((day) => day.label === 'Today')
  const parts = [
    `${total} ${total === 1 ? 'episode airs' : 'episodes air'} in the next seven days, across ${days.length} ${days.length === 1 ? 'day' : 'days'}.`,
  ]
  if (today) {
    parts.push(
      `${today.shows.length} of ${today.shows.length === 1 ? 'them is' : 'them are'} today.`,
    )
  }
  parts.push('Every show below links to the platforms that legally carry it.')
  return parts.join(' ')
}
