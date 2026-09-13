import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'

// Hybrid rendering. Listings, the home page and the sitemaps are built as
// files. Title pages and character pages are rendered by the Worker when a
// reader asks for one, so the catalog can grow past the 20,000 file limit
// the free plan puts on static assets.
export default defineConfig({
  site: 'https://manhwaindex.com',
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
  image: {
    // Covers are served straight from AniList's CDN, so no local processing.
    remotePatterns: [{ protocol: 'https', hostname: 's4.anilist.co' }],
  },
})
