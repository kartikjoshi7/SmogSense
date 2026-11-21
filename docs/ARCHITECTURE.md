# Architecture

SmogSense is one TypeScript codebase: a React single-page app and a Hono API that runs as one
Vercel function. Both use the same decision engine, so the browser can recompute a "what if"
without a network call.

## Layers

```
api/index.ts      Vercel entry: builds the Hono app and hands it every /api/* request
src/core/         the decision engine: pure functions, no I/O, no clock (time is passed in)
src/shared/       Zod schemas and the types inferred from them (profile, air data, plan, API)
src/server/       Hono app, middleware, routes, Open-Meteo and Gemini services, config, logger
src/ui/           React: components render, hooks orchestrate, api/client.ts does fetch
e2e/              Playwright tests against the production build
```

Dependencies point one way: `ui → shared, core`, `server → shared, core`, `core → shared`
(types only). ESLint enforces it: `src/core` may not import a package or anything from `ui` or
`server`, `src/ui` may not import `server` (only its test harness runs the real app), and
`import-x/no-cycle` rejects import cycles anywhere.

## The engine (`src/core`)

`buildPlan(profile, air)` in `plan.ts` is the only entry point the rest of the app needs. It
returns either a plan or `insufficient_data`; it never throws for bad data.

| Module                      | Responsibility                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `aqi.ts`                    | Sub-indexes from CPCB and EPA breakpoints, scale choice by time zone (India → NAQI), 24-hour headline index |
| `risk.ts`, `severity.ts`    | Member and household sensitivity, outdoor advice, the four severity modes                                   |
| `windows.ts`, `exposure.ts` | Cleanest daylight window and ventilation hour from hourly PM2.5; inhaled dose and % reduction               |
| `indoor.ts`                 | Steady-state room mass balance and the before/after effect of each indoor hack                              |
| `emissions.ts`              | Weekly commute CO₂ and in-transit dose for each mode, and the swaps that apply                              |
| `inversion.ts`              | Trapped-or-mixing analysis from boundary-layer height, with a wind-only fallback                            |
| `recommendations/*`         | One file per category builds candidates; `rank.ts` scores and orders them                                   |
| `explain/*`                 | Standard guidance (English and Hindi) for every recommendation, headline and fallback                       |
| `constants.ts`              | Every coefficient, each with its source (listed in the README)                                              |

## Request flow

```
POST /api/plan  { profile, location }
  secureHeaders → CORS → bodyLimit (16 KB) → rate limit (60/min) → Zod body validation
  → loadPlan: AirService.getAir(location)
      round to 0.1° → TtlCache (key: lat, lon, UTC hour; 15 min) → on a miss,
      Open-Meteo air quality + weather forecast in parallel (5 s timeout, 1 retry on 5xx)
      → Zod-validated, merged by local hour
  → buildPlan(profile, air) → 200 { plan } | 502 data unavailable | 503 not enough data

POST /api/explain  { profile, location, lang }
  same middleware with the AI rate limit (10/min) → loadPlan
  → AiService.explain: cache (SHA-256 of language, the whole plan and the members; 30 min)
  → GeminiClient.generate: each model in order, skipping cooled-down ones, within the daily budget,
    JSON schema in the request, Zod on the reply (a rejected reply is logged with its reason)
  → grounded AI text per item, standard guidance for the rest (dropped AI text is logged)
  → 200 { headline, summary, introSource, items[], source }
```

`/api/chat` and `/api/community` follow the same path as `/api/explain` with their own prompts;
their caches are keyed on a SHA-256 of the exact prompt. `GET /api/geocode` validates the query,
calls Open-Meteo's geocoding API through the same `fetchJson` wrapper and sets a one-day CDN cache
header.

**Errors.** The engine, the services and the UI's API client share one `Result` type
(`core/result.ts`: `{ ok: true, value } | { ok: false, error }`) instead of throwing. Each server
failure maps to one status and safe message in `http/errors.ts`; anything unexpected becomes a
logged 500 with the body `{ "error": "Internal error" }`. The UI shows its own message for each
status, in the interface language.

**Dependency injection.** `src/server/main.ts` is the only place real dependencies are created
(`fetch`, the clock, the Gemini SDK call). Tests pass fakes to `createApp`, `createAirService`,
`createAiService` and `createGeminiClient`; production code has no test-only branches.

## The UI (`src/ui`)

- **State:** one `AppProvider` with a reducer (`state/app-state.ts`) holds the language, household
  and location. `state/storage.ts` is the only code that touches `localStorage`, and it validates
  what it reads with Zod, so corrupt or outdated data is ignored.
- **Data:** components render; hooks in `hooks/` do the work. `use-plan.ts` loads the plan, then
  its explanation: a new household or place reloads both, a new language asks only for new wording.
  It cancels superseded requests and tags each result with the request it answers, so a slow old
  answer is never shown. `use-location-search.ts`, `use-chat.ts` and `use-community-notice.ts`
  handle search, chat and notices. `api/client.ts` is the only code that calls `fetch`, and it
  validates every response against the shared schemas. Browser-side timings live in
  `settings.ts`.
- **Screens:** `SetupForm` and `Dashboard`; `App` moves focus to the new screen's heading when one
  replaces the other. The chat and community dialogs are loaded with `React.lazy` when first
  opened, and share one `Dialog` component.
- **Instant text:** the plan renders with standard guidance from `src/core/explain` as soon as
  `/api/plan` answers; AI wording replaces it item by item when `/api/explain` arrives.
- **What-if:** the slider calls the engine's own `activityMeanPm25` and `exerciseDoseUg`, so its
  doses match the plan's exercise advice exactly, with no network call.

## Build and deploy

- `vite build` produces static files in `dist/`. Gzip sizes from the last build: main bundle
  120.3 kB, CSS 4.0 kB, and lazy chunks of 1.2 kB (chat), 1.0 kB (community) and 0.8 kB (dialog).
- What the main bundle holds, measured once by splitting a build by origin (gzip): React and
  React DOM 67.5 kB, Zod with the shared schemas 27.5 kB, the engine 9.6 kB, Hindi text 4.2 kB,
  English text 3.2 kB and the rest of the UI 10.3 kB. Zod stays in the browser because every
  response and the saved household are validated there. Hindi stays in the main bundle: loading
  it separately would save about 4 kB but make the first switch to Hindi wait on the network.
- Vercel serves `dist/` and runs `api/index.ts` in the Mumbai region (`bom1`). `vercel.json`
  rewrites `/api/*` to the function and sets the security headers for every page.
- `npm run dev` serves the UI and the same Hono app on one port through a small Vite plugin
  (`vite.config.ts`); `vite preview` applies the `vercel.json` headers so the end-to-end tests run
  the production build under the production CSP.
