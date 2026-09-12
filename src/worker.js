// Edge worker: permanent redirects from the old id-suffixed URLs to the
// clean slugs, then normal static-asset serving for everything else.
// Cloudflare serves existing assets before this worker runs, so only
// unmatched paths (old URLs and true 404s) reach it.
import redirects from '../data/redirects.json'

export default {
  fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '') || '/'
    const target = redirects[path]
    if (target) {
      return Response.redirect(`${url.origin}${target}${url.search}`, 301)
    }
    return env.ASSETS.fetch(request)
  },
}
