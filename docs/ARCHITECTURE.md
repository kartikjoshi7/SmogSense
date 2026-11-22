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
```

Dependencies point one way: `ui → shared, core`, `server → shared, core`, `core → shared`
(types only, plus the bounds and time units in `shared/limits.ts`, which imports nothing). ESLint
enforces the direction and rejects import cycles
([Code quality › Layers](CODE_QUALITY.md#layers-enforced-by-the-linter)).

## The engine (`src/core`)

`buildPlan(profile, air)` in `plan.ts` builds the whole plan; the UI also calls the explain
functions and, for the what-if slider, the exposure functions. `buildPlan`
returns either a plan or `insufficient_data`; it never throws for bad data.

How it decides, step by step and module by module, is in the README's
[Approach and logic](../README.md#approach-and-logic). Besides those modules, `explain/*` holds the
standard guidance in English and Hindi, and `constants.ts` every coefficient (listed under
[Assumptions behind the numbers](#assumptions-behind-the-numbers)).

Each recommendation id carries its own facts and impact, the values its explanations quote. They are
declared once, as a Zod discriminated union on `id` in `src/shared/recommendation.ts`, and the English and
Hindi templates are typed per id, so a misspelt or missing fact fails the type check.

## Assumptions behind the numbers

The bounds the engine shares with the API (index 0–500, bands 0–5, clock hours) are in
`src/shared/limits.ts`. Everything else is in `src/core/constants/`, one file per topic, and this table shows every
constant there; `src/core/constants.test.ts` fails if one is missing or shows another value.

| Constant                             | Value                                                                                                                                   | Source or reasoning                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `AQI_SCALES.naqi`                    | PM2.5 band tops 30 / 60 / 90 / 120 / 250 / 380 µg/m³; PM10 50 / 100 / 250 / 350 / 430 / 510 µg/m³                                       | CPCB National AQI (2014); the Severe band is open-ended, so 380 (and 510 for PM10) is assumed                                |
| `AQI_SCALES.us_aqi`                  | PM2.5 band tops 9 / 35.4 / 55.4 / 125.4 / 225.4 / 325.4 µg/m³; PM10 54 / 154 / 254 / 354 / 424 / 604 µg/m³                              | US EPA AQI: PM2.5 rows from the February 2024 update, PM10 rows unchanged                                                    |
| `INDIA_TIMEZONES`                    | Asia/Kolkata, Asia/Calcutta                                                                                                             | Open-Meteo's time zones for India, where the NAQI applies                                                                    |
| `INDEX_WINDOW_HOURS`                 | 24 h                                                                                                                                    | CPCB and EPA average PM over 24 hours                                                                                        |
| `INDEX_MIN_VALID_HOURS`              | 16 h                                                                                                                                    | CPCB's 16-of-24-hours completeness rule                                                                                      |
| `PLAN_HORIZON_HOURS`                 | 24 h                                                                                                                                    | The plan covers the next day                                                                                                 |
| `DECIMALS`                           | pm25Mean 1, windowMean 2, doseUg 1, co2Kg 1 (decimal places)                                                                            | Display precision for engine figures, not measurement precision                                                              |
| `FLOAT_ERROR_DECIMALS`               | 6 decimal places                                                                                                                        | Removes float error before EPA truncation, so a mean of 9.0999… still counts as 9.1                                          |
| `INVERSION_TRAPPED_BLH_M`            | 200 m                                                                                                                                   | Estimate: a boundary layer this low traps pollution near the ground                                                          |
| `INVERSION_CLEARED_BLH_M`            | 500 m                                                                                                                                   | Estimate: daytime mixing has cleared the inversion                                                                           |
| `INVERSION_STAGNANT_WIND_KMH`        | 5 km/h                                                                                                                                  | Estimate: stagnant air, used when boundary-layer data is missing                                                             |
| `EXERCISE_BREATHING_M3H`             | walk 1.6, run 3, cycle 2.5, yoga 0.7, sports 3, none 0.3 (m³/h)                                                                         | US EPA Exposure Factors Handbook (2011), ch. 6, rounded                                                                      |
| `AGE_FACTOR`                         | infant 0.4, child 0.7, teen 0.9, adult 1, senior 0.9                                                                                    | Estimate: breathing volume relative to an adult                                                                              |
| `MASK_REDUCTION`                     | none 0, cloth 0.2, surgical 0.4, n95 0.8                                                                                                | Conservative estimate: filtration × typical fit                                                                              |
| `COMMUTE_MODES › exposureMultiplier` | walk 1.2, cycle 1.2, two_wheeler 1.4, auto 1.5, bus 1.2, metro 0.7, car_petrol 0.6, car_diesel 0.6, car_cng 0.6, car_ev 0.6             | Estimate informed by Delhi on-road studies (Goel et al. 2015)                                                                |
| `COMMUTE_MODES › co2KgPerKm`         | walk 0, cycle 0, two_wheeler 0.05, auto 0.08, bus 0.03, metro 0.02, car_petrol 0.17, car_diesel 0.16, car_cng 0.13, car_ev 0.08 (kg/km) | Estimate from India GHG Program road-transport factors; per passenger for bus and metro                                      |
| `COMMUTE_MODES › speedKmh`           | walk 5, cycle 12, two_wheeler 25, auto 20, bus 15, metro 30, car_petrol 22, car_diesel 22, car_cng 22, car_ev 22 (km/h)                 | Estimate: typical urban door-to-door speeds                                                                                  |
| `COMMUTE_MODES › breathingM3h`       | walk 1.6, cycle 2.5, two_wheeler 0.7, auto 0.7, bus 0.7, metro 0.7, car_petrol 0.7, car_diesel 0.7, car_cng 0.7, car_ev 0.7 (m³/h)      | US EPA Exposure Factors Handbook (2011) rates: moderate walking, between moderate and high for cycling, light for passengers |
| `CAR_MODES`                          | car_petrol, car_diesel, car_cng, car_ev                                                                                                 | The modes where carpooling applies                                                                                           |
| `TRIPS_PER_COMMUTE_DAY`              | 2 trips                                                                                                                                 | There and back on each commuting day                                                                                         |
| `CARPOOL_OCCUPANTS`                  | 3 people                                                                                                                                | Estimate                                                                                                                     |
| `MAX_CYCLE_KM, MAX_WALK_KM`          | 8 km, 2 km                                                                                                                              | Estimate: longest one-way trips suggested for cycling and walking                                                            |
| `ACTIVE_ALTERNATIVES`                | cycle, walk                                                                                                                             | Swaps that mean exertion outdoors; not suggested on days when that is unsafe                                                 |
| `INDOOR_PENETRATION`                 | 0.8                                                                                                                                     | Estimate; typical range 0.6–1.0                                                                                              |
| `INDOOR_DEPOSITION_PER_H`            | 0.2 per hour                                                                                                                            | Estimate; typical range 0.1–0.4                                                                                              |
| `AIR_CHANGES_PER_H`                  | leaky 1.5, average 1, sealed 0.5, windows_open 5 (per hour)                                                                             | Estimates for each kind of home                                                                                              |
| `TIGHTER_ENVELOPE`                   | leaky → average, average → sealed, sealed → sealed                                                                                      | What "seal gaps" changes the home to: one step tighter                                                                       |
| `CEILING_HEIGHT_M`                   | 2.8 m                                                                                                                                   | Estimate, to turn floor area into room volume                                                                                |
| `DEFAULT_PURIFIER_CADR_M3H`          | 250 m³/h                                                                                                                                | Estimate: a typical home purifier                                                                                            |
| `SMOKY_FUELS`                        | biomass, kerosene                                                                                                                       | WHO household-energy guidance: solid fuels and kerosene fill the home with smoke                                             |
| `INDOOR_SOURCE_UG_PER_H`             | incense 20000, smoking 25000, kerosene 10000, coal_wood 100000 (µg/h)                                                                   | Order-of-magnitude estimates; `kerosene` is an unvented heater and `coal_wood` a coal or wood fire (angithi) in the room     |
| `SEVERITY_BAND`                      | caution 2, restrict 3, emergency 5, sensitiveEmergency 4                                                                                | Band at which each severity mode starts; a highly sensitive household reaches emergency one band early                       |
| `OUTDOOR_ADVICE_BAND`                | reduce 3, avoid 4, stayIndoors 5                                                                                                        | Band at which each outdoor advice starts for most people, following the CPCB and EPA health advice                           |
| `SENSITIVE_ADVICE_SHIFT`             | 1 band                                                                                                                                  | Sensitive groups are advised one category sooner, as CPCB and EPA do                                                         |
| `ACTION_BAND`                        | commuteMask 2, alertSensitive 2, maskEveryone 3, reportOpenBurning 3, checkOnNeighbours 4, grapCheck 4                                  | Band (0–5) at which each action starts to apply                                                                              |
| `SENSITIVITY_WEIGHT`                 | normal 1, elevated 1.5, high 2                                                                                                          | Ranking design choice                                                                                                        |
| `CO2_RANK_WEIGHT`                    | 2 points per weekly kg                                                                                                                  | Ranking design choice                                                                                                        |
| `EFFORT_PENALTY`                     | low 0, medium 5, high 15                                                                                                                | Ranking design choice                                                                                                        |
| `QUALITATIVE_BENEFIT_PCT`            | low 5, medium 15, high 30                                                                                                               | Ranking weight for benefits that are described, not measured                                                                 |
| `EMERGENCY_BOOST`                    | 1000 points                                                                                                                             | Keeps protective actions first in an emergency                                                                               |
| `MIN_WORTHWHILE_REDUCTION_PCT`       | 10%                                                                                                                                     | A smaller gain is not worth moving a routine for                                                                             |
| `PURIFIER_NIGHT_HOUR`                | 21:00                                                                                                                                   | Bedtime, when the purifier entry appears on the timeline                                                                     |
| `NCR_BOUNDS`                         | lat 27.9–29.2, lon 76.8–77.9                                                                                                            | Approximate National Capital Region, where GRAP rules apply                                                                  |

## Request flow

```
POST /api/plan  { profile, location }
  secureHeaders → CORS → bodyLimit → data rate limit → Zod body validation
  → loadPlan: AirService.getAir(location)
      round the location → TtlCache (key: lat, lon, UTC quarter hour; 15 min) → on a miss,
      Open-Meteo air quality + weather forecast in parallel (timeouts and retries: Security)
      → Zod-validated, merged by local hour (without the forecast: no inversion or daylight data)
  → buildPlan(profile, air) → 200 { plan } | 502 data unavailable | 503 not enough data

POST /api/explain  { profile, location, lang }
  same middleware with the AI rate limit → loadPlan
  → AiService.explain: cache (SHA-256 of language, the whole plan and the members; 30 min)
  → on a miss, one unit of the caller's daily allowance (none left: standard guidance)
  → GeminiClient.generate: each model in order, skipping cooled-down ones, within the daily budget,
    JSON schema in the request, Zod on the reply (a rejected reply is logged with its reason)
  → grounded AI text per item, standard guidance for the rest (dropped AI text is logged)
  → 200 { headline, summary, introSource, items[] }
```

`/api/chat` and `/api/community` follow the same path as `/api/explain` with their own prompts;
their caches are keyed on a SHA-256 of the exact prompt and last 10 and 30 minutes. `GET
/api/geocode` validates the query and the interface language, calls Open-Meteo's geocoding API
through the same `fetchJson` wrapper (place names come back in that language) and sets a one-day
CDN cache header. The rate limits and the location rounding are described in
[Security](SECURITY.md).

**Errors.** Expected failures travel as `Result` values (`core/result.ts`:
`{ ok: true, value } | { ok: false, error }`), not exceptions. Each server plan or place-search
failure maps to one status and safe message in `http/errors.ts`;
validation (400), body size (413), rate limits (429) and unknown routes (404) answer from their
middleware, and anything unexpected becomes a
logged 500 with the body `{ "error": "Internal error" }`. The UI shows its own message for each
status, in the interface language.

**Dependency injection.** `src/server/main.ts` is the only place real dependencies are created
(`fetch`, the clock, the Gemini SDK call); `createApp`, `createAirService`, `createAiService` and
`createGeminiClient` receive them as arguments. What the tests pass instead is listed in
[Testing › Test doubles](TESTING.md#test-doubles).

## The UI (`src/ui`)

- **State:** one `AppProvider` with a reducer (`state/app-state.ts`) holds the language, household
  and location. `state/storage.ts` is the only code that touches `localStorage`, and it validates
  what it reads with Zod, so corrupt or outdated data is ignored. When the browser refuses to save,
  the footer says the household will not survive a reload.
- **Data:** components render; hooks in `hooks/` do the work. `use-plan.ts` loads the plan, then
  its explanation: a new household or place reloads both, a new language asks only for new wording.
  It cancels superseded requests and tags each result with the request it answers, so a slow old
  answer is never shown. `use-location-search.ts`, `use-chat.ts` and `use-community-notice.ts`
  handle search, chat and notices, and `use-setup-draft.ts` holds the setup form's draft until it is saved; `use-speech.ts` and `use-share-notice.ts` wrap the browser's
  speech synthesis, clipboard and share sheet. `api/client.ts` is the only code that calls `fetch`, and it
  validates every response against the shared schemas. Browser-side timings live in
  `settings.ts`.
- **Screens:** `SetupForm` and `Dashboard`; `App` moves focus to the new screen's heading when one
  replaces the other. The chat and community dialogs are split out with `React.lazy` and share
  one `Dialog` component.
- **Instant text:** the plan first renders with standard guidance from `src/core/explain`, then
  AI wording replaces it item by item ([Efficiency](EFFICIENCY.md#the-plan-never-waits-for-the-ai)
  explains why).
- **What-if:** the slider calls the engine's own `activityMeanPm25` and `exerciseDoseUg`, so its
  doses match the plan's exercise advice exactly.

## Build and deploy

- `vite build` produces static files in `dist/`; their sizes are in
  [Efficiency](EFFICIENCY.md#what-the-browser-downloads).
- Vercel serves `dist/` and runs `api/index.ts` in the Mumbai region (`bom1`). `vercel.json`
  rewrites `/api/*` to the function and sets the security headers for every page.
- `npm run dev` serves the UI and the same Hono app on one port through a small Vite plugin
  (`vite.config.ts`); `vite preview` applies the `vercel.json` headers so the end-to-end tests run
  the production build under the production CSP.
