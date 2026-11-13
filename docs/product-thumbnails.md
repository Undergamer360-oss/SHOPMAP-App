# Product thumbnails

How to give every product a picture, and what the options actually cost.

## The short version

**Google Images is not a viable source here**, for one hard reason and one soft
reason:

1. **The API is closed to new customers.** Google's Custom Search JSON API is
   the only sanctioned way to run image queries programmatically, and
   [its docs](https://developers.google.com/custom-search/v1/overview) now say
   the API "is closed to new customers", with existing customers required to
   migrate by **January 1, 2027**. There is no new API key to sign up for.
   Pricing for grandfathered accounts was 100 queries/day free, then $5 per
   1,000.
2. **Scraping `google.com/search?tbm=isch` directly violates Google's Terms of
   Service.** It is also the single most heavily defended scraping target on
   the internet, blocks datacenter IPs, and serves CAPTCHAs. Not worth it.

The two workable paths are:

- **Openverse** (recommended) — free, no API key needed for anonymous use, and
  every image carries a machine-readable Creative Commons licence plus a
  ready-made attribution string.
- **SerpApi** — a paid proxy that returns Google Images results as JSON.
  $0 for 250 searches/month, $25/mo for 1,000. Legal, reliable, but you are
  paying Google-by-proxy and the results carry no licence metadata.

## Option A: Openverse (recommended)

[Openverse](https://openverse.org) is a CC-licensed media search run by the
Word Foundation. It aggregates Flickr, Wikimedia Commons, StockSnap, Rawpixel,
museums and more — around 500M images.

```jsonc
// GET https://api.openverse.org/v1/images/?q=bananas&page_size=1
{
  "result_count": 240,
  "results": [{
    "id": "e51b57c9-ba3f-4ce5-9cc1-aa1d7865c80c",
    "title": "Bananas (edited)",
    "url": "https://live.staticflickr.com/7013/...jpg",   // full size
    "thumbnail": "https://api.openverse.org/v1/images/e51b.../thumb/",  // proxied, ~600px
    "license": "by-sa",
    "license_version": "2.0",
    "license_url": "https://creativecommons.org/licenses/by-sa/2.0/",
    "attribution": "\"Bananas (edited)\" by 24oranges.nl is licensed under CC BY-SA 2.0. ...",
    "creator": "24oranges.nl",
    "foreign_landing_url": "https://www.flickr.com/photos/30091649@N06/6612824761"
  }]
}
```

**Why it fits this project**

- No API key, no signup, no billing.
- Anonymous rate limit is 20 requests/minute and **200 requests/day**
  (`X-RateLimit-Limit-anon_sustained`). Registering a free account raises this
  to 10,000/day and 100/min, which matters if we ever bulk-fetch.
- The `attribution` field is pre-built, so attribution is a copy-paste away
  and we can satisfy CC BY / BY-SA obligations mechanically.
- `license_type=commercial` filters out NC/ND licences in one query parameter,
  so we only ever surface images we may actually use.
- The `/thumb/` endpoint is an Openverse-hosted proxy. Hotlinking a Flickr URL
  directly can fail; the proxy is stable and lets us cache safely.

**Cost:** $0. **Licence:** clean, as long as we keep the attribution.

## Option B: SerpApi (Google Images, paid)

[SerpApi](https://serpapi.com) proxies Google Images and returns JSON. It
gives real Google results, which matters if you specifically want branded
product shots rather than generic food photography.

- Free: 250 searches/month. Starter $25/mo: 1,000. Developer $75/mo: 5,000.
- The "Legal Shield" ($2M coverage) only starts on the $150/mo Production
  plan.
- **No licence metadata.** Google Images results are a mix of copyrighted
  work, so surfacing them in an app carries real risk. The Production plan's
  Legal Shield exists precisely because of this.

**Verdict:** fine for a prototype or a personal build; I'd not put it in
something shipped.

## Option C: Pre-generate and bundle (the real answer)

Both APIs above are **runtime** dependencies, which is the wrong shape for this
app for three reasons:

1. It is a **mobile app running in Expo Go**. Every product thumbnail is a
   network request on a phone connection, on a page that may list 20 products.
2. It **costs money or rate-limits** the moment the catalogue grows. We have
   2,934 products; one lookup each is 2,934 requests, which blows through
   Openverse's 200/day anonymous limit in a single day.
3. Thumbnails for "banana" are the same every time. Re-fetching them is waste.

So: **resolve images once, at build time, and ship the URLs in the catalogue.**
The catalogue already has a generated step (`scripts/build-store-catalog.mjs`),
so this slots straight in.

```jsonc
// in store-catalog.json
"products": {
  "24": [["Bananas", 7, "openverse:e51b57c9-ba3f-4ce5-9cc1-aa1d7865c80c"], ...]
}
```

The app then renders `https://api.openverse.org/v1/images/{id}/thumb/` and
never talks to a search API at all. Consequences:

- **Zero runtime API cost.** Works offline after the first load.
- **No key in the bundle**, so no shipping an API secret inside an app.
- **Consistent images.** The same product always looks the same.
- **Build time is the only slow part** — one script run, resumable, cached.

### Deduplicate by type, not by product

We do **not** need 2,934 distinct images. Products cluster hard by head noun:
`Bananas`, `Apple`, `Milk`, `Chicken Breast` recur across aisles. There are
roughly **400–500 distinct head nouns** in the catalogue. Resolve one image per
head noun and every product inherits it. That turns a 2,934-request job into a
~450-request job — comfortably inside Openverse's daily limit, even anonymous.

### The fallback ladder

Not every head noun will have a good image. The build script should fall back
in order and record which rung it used:

1. Openverse exact match on the head noun
2. Openverse match on the aisle name ("Banana" → try "fresh fruits")
3. Openverse match on the department ("bakery desserts")
4. A locally drawn placeholder — a coloured tile with the initials, which
   we can render with `react-native-svg` and need no asset at all

That last rung means **no product is ever left without a picture**, which is
what actually matters for a shelf UI.

## Architecture sketch

```
scripts/build-store-catalog.mjs      <- picks which products are on each shelf
scripts/build-product-images.mjs     <- NEW: resolves one image per head noun
  |
  |-- reads data/store/*.csv
  |-- for each distinct head noun (~450):
  |     GET api.openverse.org/v1/images/?q=<noun>&license_type=commercial&page_size=5
  |     pick the best candidate (landscape, >=400px, not flagged mature)
  |     write to src/data/product-images.json  (id, thumbUrl, attribution, license)
  |     remember the id so a re-run does not re-fetch it
  |
  `-- writes the manifest, keyed by head noun

src/data/product-images.ts           <- NEW: typed lookup + placeholder fallback
src/components/product-thumb.tsx     <- NEW: <Image> with placeholder + fallback
```

### The manifest

```jsonc
{
  "banana": {
    "id": "e51b57c9-...",
    "url": "https://api.openverse.org/v1/images/e51b57c9-.../thumb/",
    "attribution": "\"Bananas (edited)\" by 24oranges.nl is licensed under CC BY-SA 2.0. ...",
    "license": "by-sa",
    "source": "https://www.flickr.com/photos/30091649@N06/6612824761"
  },
  "kumquat": null          // no image found; render the placeholder
}
```

Roughly 40 KB for ~450 entries. It bundles with the app, so there is no
runtime lookup at all.

### Rendering

`expo-image` is already a dependency and **is included in Expo Go**, so it
works without a dev build:

```tsx
<Image
  source={entry?.url ?? null}
  placeholder={{ blurhash }}          // or a colour
  contentFit="cover"
  transition={150}
  style={styles.thumb}
/>
```

`expo-image` gives us disk caching for free (250 MB LRU on Android, a week
idle on iOS), so revisiting a product does not re-download it.

Because `expo-image` handles its own disk cache, we do **not** need
`expo-file-system` or to store image bytes ourselves. We only need the URL
in the bundle.

### Where to show them

- **Search results** — a 40 px thumbnail per match, so "Bananas" is
  recognisable at a glance. Highest value, lowest cost.
- **Shelf sheet** — the selected shelf lists its products; a thumbnail each
  turns the list into something you can actually scan.
- **The map itself** — tempting, but 2,934 more images on a canvas that is
  already dense. I would skip this.

### Attribution

CC BY and CC BY-SA require attribution. Options:

- A **Product credits** screen listing every image with its creator and
  licence, reachable from Profile.
- A per-image credit line in the shelf sheet.

The credits screen is the standard approach and is cheap: the attribution
strings are already in the manifest.

Note that CC BY-SA is *share-alike*: if we display a BY-SA image, our
derivative must also be BY-SA. For a storefront thumbnail this is a nuisance
but not a blocker. If it becomes one, filter to `license=by,cc0,pdm` only.

## Caching and rate limiting, in detail

Because the build script may need ~450 requests:

- **Cache on disk.** Key the cache file by the Openverse image id. A re-run
  only fetches head nouns it has not seen. This makes the script re-runnable
  and cheap to iterate on.
- **Respect the limit.** 20/minute anonymous means ~1.5 s between requests.
  450 requests ≈ 11 minutes. With a registered key (10,000/day, 100/min) it
  is under a minute.
- **Be a good citizen.** Send a `User-Agent`, and keep the `attribution`
  field for every image we use.

## What I would build first

1. `scripts/build-product-images.mjs` for Openverse, with a disk cache and
   the four-rung fallback ladder.
2. `src/data/product-images.ts` — typed lookup, returns `null` when there is
   no image.
3. `src/components/product-thumb.tsx` — `expo-image` with a coloured
   initials placeholder.
4. Thumbnails in search results only. Measure how it feels before putting
   them anywhere else.

Then, if it works and we want Google Images specifically, that is a
SerpApi decision ($25/mo for 1,000) and it belongs on the server, not in the
app — an Expo Router API route on EAS Hosting, or a small proxy, so the API
key is never in the client bundle and the results can be cached server-side.

## Summary table

| Option | Cost | Licence clarity | Google results | Runtime cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| Openverse, pre-resolved | Free | Excellent (CC + attribution) | No | None | **Recommended** |
| Openverse, live lookup | Free | Excellent | No | 1 req/product, rate-limited | Bad at 2,934 products |
| SerpApi, live | $25/mo | Poor (no licence info) | Yes | 1 req/product | Expensive + risky |
| Google Custom Search API | N/A | Poor | Yes | 1 req/product | **Closed to new customers** |
| Scraping google.com | Free | Very poor | Yes | Blocked | Do not do this |
| Bundled placeholder only | Free | N/A | No | None | Fine as a floor |
