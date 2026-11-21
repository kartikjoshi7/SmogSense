# Testing

## How to run

```bash
npm run check      # typecheck, lint, format check, knip, unit tests with coverage, build
npm run test:e2e   # Playwright (Chromium) against the production build
npm run check:repo # one branch, tracked files under 9 MB, no .env files
```

CI (`.github/workflows/ci.yml`) runs all three on every push and pull request, plus
`npm audit --audit-level=high`, in two jobs: `check` and `e2e`.

## What is tested

| Layer                                  | Files  | Tests   | Environment                        |
| -------------------------------------- | ------ | ------- | ---------------------------------- |
| `src/core` (engine)                    | 12     | 184     | Node                               |
| `src/shared` (schemas)                 | 2      | 13      | Node                               |
| `src/server` (API, Open-Meteo, Gemini) | 14     | 91      | Node                               |
| `api` (Vercel entry)                   | 1      | 3       | Node                               |
| `src/ui` (React)                       | 11     | 84      | jsdom + Testing Library + axe-core |
| **Vitest total**                       | **40** | **375** |                                    |
| `e2e` (Playwright)                     | 4      | 17      | Chromium, production build         |

**Engine.** Every AQI breakpoint edge on both scales, the most-sensitive-member rule, severity
modes, window search with missing hours and no daylight, the indoor model, emissions, ranking,
and golden scenarios built on a Delhi forecast shaped like real data: the Sharma family on Severe,
Very Poor and Moderate days, a healthy couple, a homebound senior, a London household on the US
AQI, and gaps in the data (too few hours, no boundary-layer height). `constants.test.ts` also fails
if the README's Assumptions table no longer matches `constants.ts`.

**Server.** Routes through `app.request()`: validation errors, oversized and malformed bodies,
CORS, security headers, CDN cache headers, 404s, a safe 500, upstream 502 and sparse-data 503,
and both rate limits. The Open-Meteo client runs against recorded responses
(`src/server/air/fixtures`), and the fetch wrapper is tested for retries on 5xx and network errors,
no retry on 4xx or timeouts, and malformed bodies. The Gemini client is tested with an injected SDK
call: a valid reply, the request settings (schema, system rules, thinking level), the 10-minute
skip after a 429, falling through to the next model, no key, and the daily budget. The grounding
check is tested with invented numbers, rounding, clock times and Devanagari digits.

**UI.** Tests query by role and label, and the main screens and both dialogs are also checked with
axe (jsdom cannot measure colour contrast; the end-to-end axe run does). They cover the setup form
(search, GPS allowed and denied, validation messages linked to fields, adding and removing
members), every lifestyle field, the plan (tabs with arrow keys, table view, what-if slider, retry
after an error), language switching, saving and restoring the household, both dialogs (focus
trap, Esc, focus return, errors, AI and standard answers, sharing), read-aloud with a stubbed
speech API, and both message catalogues (same keys, every template uses its arguments, nothing
left untranslated except names and units).

**End to end.** Playwright runs `vite build && vite preview`, which sends the same headers as
Vercel, and answers `/api/*` in the page with `src/ui/test/fake-server.ts`: the real Hono app from
`createApp` (validation, routes, engine, AI composition, grounding) with only the outside world
replaced, Open-Meteo by a Severe day in Delhi and Gemini by fixed replies. The Vitest UI tests use
the same harness, so no part of the API is re-implemented for tests. Any console error, uncaught
error or CSP violation fails the test. It covers:

- the full flow: example family → plan → chat answer → community notice → copy, plus reload and
  Hindi;
- a keyboard-only flow: skip link, setup, tabs with arrow keys, the chat dialog, Esc and focus return,
  with a visible focus outline at each step;
- axe (WCAG 2.2 A and AA, including colour contrast) on every screen and dialog, in light and dark;
- a 390×844 phone: no sideways scrolling and every control at least 44 × 44 px;
- the AI-unavailable path: every card, answer and notice says "Standard guidance".

## Coverage

Thresholds in `vitest.config.ts`: 100% lines, branches, functions and statements for `src/core`,
and 90% for the whole project. `npm run coverage`, and with it `npm run check` and CI, fails
below them. From the last run:

```
Statements   : 98.91% ( 1368/1383 )
Branches     : 95.05% ( 692/728 )
Functions    : 98.31% ( 524/533 )
Lines        : 99.15% ( 1294/1305 )
```

`src/core` is at 100% on all four. Test helpers, fixtures and `src/ui/main.tsx` (four lines that
mount the app) are excluded.

## Test doubles

Production code has no test-only branches and no test-only exports: tests go through each
module's public functions, and `knip --production` (part of `npm run check`) fails if an export
is used only by tests. Dependencies are injected instead: `fetch` and the
clock for the air service, the SDK call and clock for the Gemini client, the AI client for the AI
service, and a `KeyValueStore` in place of `localStorage` for the UI.
