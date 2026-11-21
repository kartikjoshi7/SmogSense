# Testing

## How to run

```bash
npm run coverage   # Vitest: every unit and integration test, with the coverage thresholds
npm run test:e2e   # Playwright (Chromium) against the production build
```

CI (`.github/workflows/ci.yml`) runs both on every push and pull request, in two jobs: `check`,
which also runs the other gates in [Code quality](CODE_QUALITY.md#gates-that-fail-the-build), and
`e2e`.

## What is tested

| Layer                                  | Files  | Tests   | Environment                        |
| -------------------------------------- | ------ | ------- | ---------------------------------- |
| `src/core` (engine)                    | 13     | 214     | Node                               |
| `src/shared` (schemas)                 | 3      | 16      | Node                               |
| `src/server` (API, Open-Meteo, Gemini) | 14     | 119     | Node                               |
| `api` (Vercel entry)                   | 1      | 3       | Node                               |
| `src/ui` (React)                       | 15     | 114     | jsdom + Testing Library + axe-core |
| **Vitest total**                       | **46** | **466** |                                    |
| `e2e` (Playwright)                     | 4      | 19      | Chromium, production build         |

**Engine.** Every AQI breakpoint edge on both scales (through `computeIndex`, so float error in
the 24-hour mean is covered too), the most-sensitive-member rule, severity
modes, window search with missing hours and no daylight, the indoor model, emissions, ranking,
and golden scenarios built on a Delhi forecast shaped like real data: the Sharma family on Severe,
Very Poor and Moderate days, a healthy couple, a homebound senior, a London household on the US
AQI, a walker offered the metro as protection on a smoggy day (and not on a clean one), and
gaps in the data (too few hours, no boundary-layer height). `constants.test.ts` also fails
if the assumptions table in `docs/ARCHITECTURE.md` no longer matches `constants.ts`.

**Server.** Routes through `app.request()`: validation errors, oversized and malformed bodies,
CORS, security headers, CDN cache headers, 404s, a safe 500, upstream 502 and sparse-data 503,
both rate limits and the daily AI allowance per client. The Open-Meteo client runs against recorded responses
(`src/server/air/fixtures`), and the fetch wrapper is tested for retries on 5xx and network errors,
no retry on 4xx or timeouts, and malformed bodies. The Gemini client is tested with an injected SDK
call: a valid reply, the request settings (schema, system rules, thinking level), the 10-minute
skip after a 429, falling through to the next model, no key, the daily budget, and a log line for
each rejected reply. The grounding check is tested with invented numbers, rounding, clock times,
units, the digits of every Indian script the ten languages use, and the word for "percent" in each
of them; the AI service logs the text it drops. The explanation cache is
tested to tell plans apart that differ only below the items the model sees.

**UI.** Tests query by role and label, and the main screens and both dialogs are also checked with
axe (jsdom cannot measure colour contrast; the end-to-end axe run does). They cover the setup form
(search, a failed search, short queries, GPS allowed and denied, validation messages linked to
fields, adding and removing members), every lifestyle field, the plan (tabs with arrow keys, an
empty category, table view, missing forecast hours, retry after an error, a message for each
error status, a slow answer for a place already left never shown), the what-if slider (its doses equal the plan's own exercise advice; a session past
the forecast says so), language switching, saving and restoring the household (and the notice when the browser cannot
save it), both dialogs
(focus trap, Esc, focus return, the first answer announced, focus kept after a suggestion,
suggestions disabled while an answer is on its way, errors, AI and standard answers, the answer
language and the `lang` of answers, notices and language options, copy and share failures), read-aloud with a
stubbed speech API (including a failed or interrupted utterance), and both message catalogues (same keys, every template uses its arguments,
nothing left untranslated except names and units).

**End to end.** Playwright runs `vite build && vite preview`, which sends the same headers as
Vercel, and answers `/api/*` in the page with `src/ui/test/fake-server.ts`: the real Hono app from
`createApp` (validation, routes, engine, AI composition, grounding) with its two services'
outside edges replaced: the air service returns a Severe day in Delhi, and the AI client returns
fixed replies or none. The Vitest UI tests use the same harness, so no part of the API is
re-implemented for tests. The pieces the harness skips are tested on their own: the air service
(location rounding, caching, Open-Meteo normalisation) against recorded responses, the Gemini
client (schema request, JSON parsing, model fallback) with an injected SDK call, and
`main.test.ts` runs the production wiring of `/api/plan` against the recorded responses. Any
console error, uncaught error or CSP violation fails an end-to-end test. They cover:

- the full flow: example family → plan → chat answer → community notice → copy, plus reload and
  Hindi;
- the AI-unavailable path: every card, answer and notice says "Standard guidance";
- the keyboard, axe and phone-size checks listed in
  [Accessibility › How it is tested](ACCESSIBILITY.md#how-it-is-tested).

## Coverage

Thresholds in `vitest.config.ts`: 100% lines, branches, functions and statements for `src/core`,
and 90% for the whole project. `npm run coverage`, and with it `npm run check` and CI, fails
below them. From the last run:

```
Statements   : 99.16% ( 1537/1550 )
Branches     : 96.66% ( 724/749 )
Functions    : 98.79% ( 576/583 )
Lines        : 99.32% ( 1463/1473 )
```

`src/core` is at 100% on all four. Test helpers, fixtures and `src/ui/main.tsx` (the file that
mounts the app) are excluded.

## Test doubles

Production code has no test-only branches and no test-only exports: tests go through each
module's public functions, and `knip --production` (part of `npm run check`) fails if an export
is used only by tests. Dependencies are injected instead: `fetch` and the
clock for the air service, the SDK call and clock for the Gemini client, the AI client for the AI
service, and a `KeyValueStore` in place of `localStorage` for the UI.
