# Decisions

The choices that shaped SmogSense, why we made them, what we turned down and what each one costs.
Each record ends with the code that carries the decision and the tests that would fail if it were
quietly undone. The other docs describe how things work; this one records why.

| #                                                     | Decision                                                        | What it costs                                               |
| ----------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| [1](#1-the-engine-decides-the-ai-explains)            | A deterministic engine makes the plan; Gemini only explains it  | The AI cannot suggest an action the engine does not know    |
| [2](#2-every-number-the-ai-writes-is-checked)         | Every number in an AI reply must match a number in the plan     | Some correct replies are replaced by standard guidance      |
| [3](#3-one-hono-app-in-one-vercel-function)           | One Hono app, served by one Vercel function                     | State in memory is per instance; cold starts                |
| [4](#4-one-set-of-zod-schemas-on-both-sides)          | One set of Zod schemas, used by the server and the browser      | Zod is about a quarter of the main bundle                   |
| [5](#5-facts-are-typed-per-recommendation)            | Each recommendation's facts and impact are typed by its id      | A new recommendation touches the schema and both languages  |
| [6](#6-one-exception-to-a-pure-engine-sharedlimitsts) | The engine may read one dependency-free module from `shared`    | One documented exception in the layer rule                  |
| [7](#7-caches-and-limits-in-memory)                   | Caches, rate limits and the AI budget live in memory            | Limits are per instance, not global                         |
| [8](#8-the-time-zone-picks-the-aqi-scale)             | The location's time zone picks India's NAQI or the US AQI       | Near a border, the grid point's time zone decides           |
| [9](#9-open-meteo-as-the-only-data-source)            | Open-Meteo's modelled forecast is the only air and weather data | Grid-cell estimates, not readings from the nearest monitor  |
| [10](#10-no-chart-ui-kit-or-state-library)            | No chart, UI-kit or state-management library                    | We own the chart's drawing and accessibility code ourselves |

## 1. The engine decides, the AI explains

**Context.** The brief asks for advice tailored to a household and for the impact of each choice
to be explained clearly. A language model asked to plan from raw readings writes plausible numbers
nobody can verify, and on a free key it is sometimes rate-limited or slow.

**Decision.** Every number, choice and ranking comes from pure functions in `src/core`, called as
`buildPlan(profile, air)`. Gemini receives the finished plan and rewrites it in plain language,
answers questions about it and turns it into community notices.

**Turned down.** Letting the model draft the plan from the forecast: its numbers could not be
checked, and there would be no plan when it is unavailable. Retrieval over health guidelines: it
improves wording but still leaves the numbers unchecked.

**Cost.** The assistant only ever suggests the 27 actions the engine knows. A new kind of advice
means new engine code and tests, not a new prompt.

**Carried by** `src/core/plan.ts` and `src/core/recommendations/*`. **Checked by** `plan.test.ts`
(golden scenarios) and the end-to-end test in which the AI is unavailable and every card,
answer and notice is labelled standard guidance.

## 2. Every number the AI writes is checked

**Context.** Even when a model is given the facts, it can round them differently, convert units or
invent a figure, and in Hindi or Tamil it may write digits in that language's script.

**Decision.** A reply is used only if every number in it, in any script, is one of the plan's
numbers at the precision written. Anything else is replaced by standard guidance, and each text
says whether it came from the AI or not. The mechanism and its known gaps are in
[Security › AI safety](SECURITY.md#ai-safety).

**Turned down.** Trusting the instruction "use only these numbers" alone. Asking the model to
cite fact ids: more tokens, and the citations themselves would still need checking.

**Cost.** A correct reply that writes a number the plan does not contain (a sum of two figures,
say) is thrown away; the user then sees standard guidance, labelled as such.

**Carried by** `src/server/ai/grounding.ts` and `src/server/ai/ai-service.ts`. **Checked by**
`grounding.test.ts` (invented numbers, rounding, units, every Indian script) and
`ai-service.test.ts`.

## 3. One Hono app in one Vercel function

**Context.** The UI and the API share types, schemas and the engine, and the project has one
person, one repository and a free hosting tier.

**Decision.** `createApp` builds a Hono app from injected dependencies. On Vercel, `api/index.ts`
hands it every `/api/*` request as a Web-standard `Request`; in development a small Vite plugin
serves the same app on the UI's port; in tests the same app answers inside the page.

**Turned down.** Next.js: a full framework, replacing Vite, for a single-page app with five
routes. Express: Node-specific request objects and a separate harness to test them. A separate
backend host: a second deployment and cross-origin calls.

**Cost.** One function means its in-memory state is per instance ([decision 7](#7-caches-and-limits-in-memory)),
and the first request after a quiet spell pays a cold start.

**Carried by** `src/server/app.ts`, `src/server/main.ts`, `api/index.ts` and `vite.config.ts`.
**Checked by** `app.test.ts`, `main.test.ts`, `api/index.test.ts` and every end-to-end test.

## 4. One set of Zod schemas on both sides

**Context.** The same data crosses many boundaries: request bodies, Open-Meteo and Gemini
replies, API responses and the household saved in the browser. Hand-written types drift from
hand-written checks.

**Decision.** Schemas live once in `src/shared`, every domain type is inferred from them, and the
browser validates every response and the saved household with the same schemas the server uses.

**Turned down.** `zod/mini` in the browser: smaller, but every shared schema would have to be
rewritten in its functional style, leaving two schema styles to keep in step. Validating only on
the server: a bad response or an outdated saved household would reach the UI unchecked.

**Cost.** Zod and the schemas are a large share of the main bundle; the measured size is in
[Efficiency](EFFICIENCY.md#what-the-browser-downloads).

**Carried by** `src/shared/*` and `src/ui/api/client.ts`. **Checked by** `profile.test.ts`,
`api.test.ts`, `air.test.ts` and the storage tests in `state.test.ts`.

## 5. Facts are typed per recommendation

**Context.** Each recommendation's explanation quotes its own numbers (best hour, PM2.5 before and
after, kilograms of CO₂) in two languages. With facts in a loose record read through helpers, a
misspelt key silently printed 0 or an empty string, and only a test of that exact text could
notice.

**Decision.** The facts are a Zod discriminated union on the recommendation id
(`src/shared/plan.ts`), and each id also fixes the shape of its impact: a dose, an indoor
change, a commute swap, a share of particles, or a qualitative level. Each language's templates
are typed per id, so reading a fact or figure the recommendation does not carry fails the type
check. The facts stopped being a loose record in `0a3281c`; the impact, which a later review
found still read through a default of 0, followed.

**Turned down.** Keeping the lookup helpers with defaults (the earlier design): they hid mistakes
as zeros and empty text. Plain TypeScript interfaces without a schema: types and validation would drift.

**Cost.** Adding a recommendation touches the schema, the engine and both language packs; the
compiler lists every place.

**Carried by** `src/shared/plan.ts`, `src/core/explain/en-recommendations.ts` and
`src/core/explain/hi-recommendations.ts`. **Checked by** the type check and `explain.test.ts`.

## 6. One exception to a pure engine: `shared/limits.ts`

**Context.** Bounds and units, such as the 0–500 range of an index or the minutes in an hour, are
needed by the request schemas, the form controls and the engine. The engine imports no packages, so it cannot import
the Zod schemas.

**Decision.** The bounds and time units live in `src/shared/limits.ts`, which imports nothing. The
engine may import values from that one module and only types from the rest of `shared`; the lint
rule names the exception.

**Turned down.** Copying the bounds into the engine: two places to keep in step. Letting the
engine import Zod: the engine would stop being dependency-free. Passing every bound as an
argument: noise in every signature.

**Cost.** The layer rule has one written exception instead of none.

**Carried by** `src/shared/limits.ts` and the `no-restricted-imports` block for `src/core` in
`eslint.config.js`. **Checked by** `npm run lint`.

## 7. Caches and limits in memory

**Context.** Upstream data changes hourly, the AI quota is small, and the app runs on a free tier
with no database.

**Decision.** One bounded in-memory cache (`TtlCache`) holds air data, place searches and AI
answers; the rate limits (per minute, plus a daily AI allowance per client) and the daily AI
budget are kept in memory too.

**Turned down.** A hosted key-value store: another service, another secret and a network round
trip on every request, for a demo-sized deployment. A per-minute limit alone: within it, one
client could spend the whole day's AI budget in about twenty minutes, which the daily allowance
prevents.

**Cost.** The limits hold per instance, not across the deployment; what that allows, and the
upgrade path, are in [Security › Rate limits](SECURITY.md#rate-limits-caches-and-budgets).

**Carried by** `src/server/cache.ts` and `src/server/middleware/rate-limit.ts`. **Checked by**
`cache.test.ts`, `rate-limit.test.ts` and `app.test.ts`.

## 8. The time zone picks the AQI scale

**Context.** Families in India read air quality on CPCB's National AQI, whose breakpoints and
category names differ from the US AQI used in most other apps. The app needs to know which applies
without asking.

**Decision.** Open-Meteo returns the IANA time zone of every point it serves. A point in
`Asia/Kolkata` (or its older name, `Asia/Calcutta`) gets the NAQI; anywhere else gets the US AQI.

**Turned down.** Reverse geocoding to a country: another upstream call, made for every GPS user.
A setting on the form: one more question, which most people would leave at the default. The US
AQI everywhere: the wrong categories for the people the app is built for.

**Cost.** Near a border, the scale follows the time zone of the forecast's grid point.

**Carried by** `src/core/aqi.ts` (`INDIA_TIMEZONES` in `constants.ts`). **Checked by**
`aqi.test.ts` and the London scenario in `plan.test.ts`.

## 9. Open-Meteo as the only data source

**Context.** The app has to work for any address in India, on a free tier, with an hourly
forecast, not only the last reading.

**Decision.** Air quality (the CAMS forecast) and weather, including boundary-layer height, come
from Open-Meteo, which needs no key and covers every location.

**Turned down.** Government monitor feeds: patchy coverage away from big cities, no forecast,
and keys or scraping. Paid air-quality APIs: a cost and another secret.

**Cost.** Readings are modelled estimates for a grid cell, which the README's
[assumptions](../README.md#assumptions) state.

**Carried by** `src/server/air/open-meteo.ts`. **Checked by** `open-meteo.test.ts`, against
recorded responses.

## 10. No chart, UI-kit or state library

**Context.** The app has one chart, a few dozen components and three pieces of shared state
(language, household, place).

**Decision.** The forecast is hand-written SVG with a table view, styling is Tailwind, and state
is one React context with a reducer.

**Turned down.** A charting library: tens of kilobytes for one line chart, and canvas charts are
hard to make accessible. A component kit: weight and styling we would fight. A state library:
more machinery than three values need.

**Cost.** The chart's scales, labels and accessible names are our own code to maintain.

**Carried by** `src/ui/components/dashboard/forecast-chart.tsx` and `src/ui/state/*`.
**Checked by** `forecast-chart.test.tsx` and the end-to-end axe runs.
