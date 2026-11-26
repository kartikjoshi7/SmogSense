# Efficiency

SmogSense answers fast on a free tier: the plan is computed without waiting for the AI, upstream
calls are cached and shared, prompts are small, and the browser downloads little. How a request
passes through the caches, with their keys and times, is in
[Architecture › Request flow](ARCHITECTURE.md#request-flow).

## The plan never waits for the AI

`POST /api/plan` runs the decision engine on the air data and makes no model call, so the plan
appears with standard guidance at once; `POST /api/explain` replaces that text item by item when
Gemini answers, and it sends only the parts the AI wrote: the browser already has the standard text. The "what if" slider recomputes exercise exposure in the browser with the engine's
own functions, with no network call.

## Upstream data

- Air quality and weather come from Open-Meteo in two calls made in parallel, not one after the
  other.
- Locations are rounded before any call ([Security › Privacy](SECURITY.md#privacy)), so nearby
  households share one cache entry instead of each causing an upstream call.
- Requests that miss the same cache key at the same time share one upstream call
  (`TtlCache.getOrLoad` in `src/server/cache.ts`), so a burst of identical requests costs one call.
- Place searches are cached on the server and carry a one-day CDN cache header, so a repeated
  search does not reach the function at all.

## Gemini on the free tier

- `gemini-3.5-flash-lite` first, then `gemini-3.8-flash` (`GEMINI_MODELS`), with minimal thinking
  and capped output tokens (900 for a plan, 400 for chat and notices).
- One call explains the plan's 8 highest-priority items (the rest keep standard text), and the
  chat prompt carries the same 8 plus the next 24 hours' PM2.5 by hour. Each reply's JSON Schema is built once and reused for every call.
- AI answers are cached; a response with no AI text is never cached, so the next request can reach
  the model again. An answer from the cache never spends the client's daily AI allowance.
- A model that answers 429 is skipped for 10 minutes, and a daily budget (`GEMINI_DAILY_BUDGET`,
  200 by default) stops calls before the quota does. Rate limits are in
  [Security](SECURITY.md#rate-limits-caches-and-budgets).

## What the browser downloads

- Gzip sizes from a production build on 26 Nov 2026 (`npm run build` prints them every time):
  main bundle 124.7 kB, CSS 5.2 kB, and lazy chunks of 1.4 kB
  (chat), 1.1 kB (community) and 0.8 kB (the dialog they share).
- What the main bundle holds, measured once by splitting a build by origin (gzip): React and React DOM
  67.4 kB, Zod with the shared schemas 28.7 kB, the engine with its recommendation text in both
  languages 10.4 kB and the UI with its labels 18.8 kB. All the Hindi text, the engine's and the
  UI's, is 9.4 kB. Why Zod is worth its
  share is [decision 4](DECISIONS.md#4-one-set-of-zod-schemas-on-both-sides). Hindi stays in the
  main bundle: loading it separately would save about 9 kB but make the first switch to Hindi
  wait on the network.
- Every built file has a content hash in its name, and the live site serves those files with
  `Cache-Control: public, max-age=31536000, immutable` and Brotli compression, while the page
  itself is revalidated on each visit, so a returning visitor downloads only what changed.
- The chat and community dialogs are loaded only when first opened; the forecast chart is
  hand-written SVG (no chart library), there is no UI kit, and fonts are the system's.
- A request the user has moved past (a new place, a new household) is cancelled rather than left
  to finish ([Architecture › The UI](ARCHITECTURE.md#the-ui-srcui) explains how).
