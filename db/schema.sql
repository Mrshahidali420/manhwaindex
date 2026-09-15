-- The analytics database, as it stands.
--
-- This file is the written record. It is NOT run by the build. The tables live
-- in the Cloudflare D1 database `manhwaindex-analytics`
-- (uuid a31cde34-a594-4430-b415-79869e4f4435), bound to the Worker as ANALYTICS.
-- To apply a change by hand:
--   npx wrangler d1 execute manhwaindex-analytics --remote --file db/schema.sql
-- Every statement below is safe to run twice.
--
-- The shape of the thing: `events` holds one row per page view, per outbound
-- click and per page exit, and is kept for 30 days only. Every night a cron
-- squeezes the closed day into the small `daily_*` tables, which are kept
-- forever. So "last 7 days" reads a few hundred rows instead of a few hundred
-- thousand, and the free allowance of 5 million row reads a day is never at
-- risk.

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,                  -- Date.now() when it happened
  day TEXT NOT NULL,                    -- 'YYYY-MM-DD', UTC
  name TEXT NOT NULL,                   -- page_view, affiliate_amazon_books, read_webtoon, ...
  kind TEXT NOT NULL,                   -- view | read | watch | buy | other | leave
  path TEXT NOT NULL DEFAULT '',
  page_type TEXT NOT NULL DEFAULT '',   -- first path part: manhwa|manga|manhua|anime|character|shop|home
  label TEXT NOT NULL DEFAULT '',       -- page title, or the words on the button
  platform TEXT NOT NULL DEFAULT '',    -- WEBTOON, Netflix, Amazon, ...
  shop_kind TEXT NOT NULL DEFAULT '',   -- books | discs | figures | prints | apparel | merch
  target TEXT NOT NULL DEFAULT '',      -- the outside address the click went to
  country TEXT NOT NULL DEFAULT '',     -- two letters, from Cloudflare
  referrer TEXT NOT NULL DEFAULT '',    -- the sending site's host name only
  device TEXT NOT NULL DEFAULT '',      -- phone | desktop
  visitor TEXT NOT NULL DEFAULT '',     -- random id, kept in the browser
  session TEXT NOT NULL DEFAULT '',     -- random id, one visit, dies after 30 idle minutes
  step INTEGER NOT NULL DEFAULT 0,      -- 1, 2, 3 ... page number inside the visit
  prev TEXT NOT NULL DEFAULT '',        -- the page they came from, on this site
  prev_type TEXT NOT NULL DEFAULT '',   -- that page's type, or 'entry' if they arrived here
  dwell INTEGER NOT NULL DEFAULT 0,     -- milliseconds the page was on screen
  campaign TEXT NOT NULL DEFAULT ''     -- utm_source/utm_medium/utm_campaign, if the link had them
);

CREATE INDEX IF NOT EXISTS events_day_kind ON events(day, kind);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS events_session ON events(session, step);
CREATE INDEX IF NOT EXISTS events_day_type ON events(day, page_type, kind);

-- ---------------------------------------------------------------- the rollups

CREATE TABLE IF NOT EXISTS daily_totals (
  day TEXT PRIMARY KEY, views INTEGER DEFAULT 0, people INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0, bounces INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
  buys INTEGER DEFAULT 0, reads INTEGER DEFAULT 0, watches INTEGER DEFAULT 0,
  dwell_sum INTEGER DEFAULT 0, dwell_n INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS daily_types (
  day TEXT, page_type TEXT, views INTEGER DEFAULT 0, people INTEGER DEFAULT 0,
  entries INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, buys INTEGER DEFAULT 0,
  reads INTEGER DEFAULT 0, watches INTEGER DEFAULT 0, dwell_sum INTEGER DEFAULT 0,
  dwell_n INTEGER DEFAULT 0, PRIMARY KEY (day, page_type));

-- Only the best 300 pages of each day are kept. A page nobody looked at twice
-- is not worth a row forever.
CREATE TABLE IF NOT EXISTS daily_pages (
  day TEXT, path TEXT, page_type TEXT, label TEXT, views INTEGER DEFAULT 0,
  people INTEGER DEFAULT 0, entries INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
  buys INTEGER DEFAULT 0, reads INTEGER DEFAULT 0, watches INTEGER DEFAULT 0,
  dwell_sum INTEGER DEFAULT 0, dwell_n INTEGER DEFAULT 0, PRIMARY KEY (day, path));

-- The only place "all time" comes from. One row per page, ever.
CREATE TABLE IF NOT EXISTS total_pages (
  path TEXT PRIMARY KEY, page_type TEXT, label TEXT, views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0, buys INTEGER DEFAULT 0, reads INTEGER DEFAULT 0,
  watches INTEGER DEFAULT 0, dwell_sum INTEGER DEFAULT 0, dwell_n INTEGER DEFAULT 0,
  last_day TEXT);

CREATE TABLE IF NOT EXISTS daily_countries (
  day TEXT, country TEXT, page_type TEXT, views INTEGER DEFAULT 0,
  people INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
  PRIMARY KEY (day, country, page_type));

CREATE TABLE IF NOT EXISTS daily_clicks (
  day TEXT, kind TEXT, platform TEXT, shop_kind TEXT, page_type TEXT,
  clicks INTEGER DEFAULT 0, people INTEGER DEFAULT 0,
  PRIMARY KEY (day, kind, platform, shop_kind, page_type));

CREATE TABLE IF NOT EXISTS daily_sources (
  day TEXT, source TEXT, views INTEGER DEFAULT 0, entries INTEGER DEFAULT 0,
  PRIMARY KEY (day, source));

-- Section to section moves, so the shape of a visit survives the 30 day prune.
CREATE TABLE IF NOT EXISTS daily_edges (
  day TEXT, from_type TEXT, to_type TEXT, moves INTEGER DEFAULT 0,
  PRIMARY KEY (day, from_type, to_type));

CREATE TABLE IF NOT EXISTS rollup_log (day TEXT PRIMARY KEY, ran_at INTEGER, rows INTEGER);

CREATE INDEX IF NOT EXISTS total_pages_views ON total_pages(views DESC);
