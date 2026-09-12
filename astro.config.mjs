import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://manhwaindex.com',
  output: 'static',
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
