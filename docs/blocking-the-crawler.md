# How to challenge the crawler

A guide for one firewall rule. Turn it on when the site needs it. Turn it off
the moment it costs you a reader.

**Do not turn this on while AdSense is still reviewing the site.**

---

## What the rule does

A visitor who is not a known search engine has to pass a one second Cloudflare
check before a page is sent. The check is usually invisible. A person sees a
short flicker. A crawler that drives a browser from a program fails it.

Google, Bing and the AdSense crawler are on Cloudflare's own verified list.
The rule lets them through without a check, so search is not touched.

---

## Why we might need it

A crawler visits the site from home internet lines in about forty six
countries. It runs a real browser. It waits, and it scrolls. Nothing the page
itself can measure catches it.

Cloudflare Turnstile already stops it being counted. It does not stop it
arriving. Every arrival costs one of the 100,000 free requests a day.

Turn the rule on when the daily count gets close to 100,000. Not before.

---

## Turn it on

1. Open https://dash.cloudflare.com
2. Pick the account `Mr.shahidali.sa@gmail.com's Account`.
3. Pick the site `manhwaindex.com`.
4. In the left menu open **Security**, then **WAF**.
5. Open the tab **Custom rules**.
6. Press **Create rule**.
7. Name it: `Challenge everything that is not a search engine`
8. Press **Edit expression** to get the text box.
9. Paste this in:

```
(not cf.client.bot)
and (not starts_with(http.request.uri.path, "/_"))
and (not starts_with(http.request.uri.path, "/cdn-cgi/"))
and (not http.request.uri.path contains "/sitemap")
and (http.request.uri.path ne "/robots.txt")
and (http.request.uri.path ne "/ads.txt")
```

10. Under **Then take action**, choose **Managed Challenge**.
11. Press **Deploy**.

---

## What each line does

| Line | Why it is there |
|---|---|
| `not cf.client.bot` | Googlebot, Bingbot and the AdSense crawler are verified. They skip the check. |
| `not starts_with(..., "/_")` | Our own beacon `/_a` and pass `/_p`. The browser has already passed. Do not check it twice. |
| `not starts_with(..., "/cdn-cgi/")` | Cloudflare's own paths. Never touch them. |
| `not ... contains "/sitemap"` | Sitemaps must stay open. IndexNow and Bing read them. |
| `ne "/robots.txt"` | Every crawler reads this first. It must never be challenged. |
| `ne "/ads.txt"` | Google's ad system reads this. It must stay open. |

---

## Limits to know

- The free plan allows **5 custom rules**. Two are already in use. This is the
  third.
- A Managed Challenge is not a CAPTCHA. Most people never see anything.
- Some readers on strict privacy browsers may see a short block page. That is
  the cost.

---

## Turn it off

Same screen. **Security** > **WAF** > **Custom rules**. Use the toggle next to
the rule. Turning it off takes about ten seconds to reach every country.

Turn it off at once if:

- Google Search Console reports a crawl error.
- Real readers tell you the site will not open.
- AdSense asks to review the site again.

---

## How to check it worked

Wait ten minutes. Then open Cloudflare, **Security** > **Events**. Look for
rows with the action **Managed Challenge**. The countries in that list should
be the crawler's: Brazil, Vietnam, South Africa, Bangladesh, Ukraine.

If you see Googlebot in that list, turn the rule off straight away and tell me.
