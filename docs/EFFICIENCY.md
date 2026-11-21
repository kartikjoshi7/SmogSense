# Efficiency

SmogSense answers fast on a free tier: the plan is computed without waiting for the AI, upstream
calls are cached and shared, prompts are small, and the browser downloads little. How a request
passes through the caches, with their keys and times, is in
[Architecture › Request flow](ARCHITECTURE.md#request-flow).

## The plan never waits for the AI

`POST /api/plan` runs the decision engine on the air data and makes no model call, so the plan
appears with standard guidance at once; `POST /api/explain` replaces that text item by item when
Gemini answers. The "what if" slider recomputes exercise exposure in the browser with the engine's
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
- One call explains the whole plan, and the explain and chat prompts carry only its 8
  highest-priority items.
- AI answers are cached; a response with no AI text is never cached, so the next request can reach
  the model again.
- A model that answers 429 is skipped for 10 minutes, and a daily budget (`GEMINI_DAILY_BUDGET`,
  200 by default) stops calls before the quota does. Rate limits are in
  [Security](SECURITY.md#rate-limits-caches-and-budgets).

## What the browser downloads

- Gzip sizes from the last build: main bundle 124.0 kB, CSS 5.2 kB, and lazy chunks of 1.3 kB
  (chat), 1.0 kB (community) and 0.8 kB (the dialog they share).
- What the main bundle holds, measured by splitting a build by origin (gzip): React and React DOM
  67.5 kB, Zod with the shared schemas 28.6 kB, the engine with its English and Hindi text
  19.0 kB (the Hindi text alone 4.7 kB) and the rest of the UI 11.0 kB. Why Zod is worth its
  share is [decision 4](DECISIONS.md#4-one-set-of-zod-schemas-on-both-sides). Hindi stays in the
  main bundle: loading it separately would save about 4 kB but make the first switch to Hindi
  wait on the network.
- The chat and community dialogs are loaded only when first opened; the forecast chart is
  hand-written SVG (no chart library), there is no UI kit, and fonts are the system's.
- A request the user has moved past (a new place, a new household) is cancelled rather than left
  to finish ([Architecture › The UI](ARCHITECTURE.md#the-ui-srcui) explains how).
