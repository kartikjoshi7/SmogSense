# Security

What SmogSense protects, how, and where the limits are. Each control names the code that
implements it and the test that checks it.

## Secrets

- The Gemini key is read only on the server, from `GEMINI_API_KEY` in `src/server/config.ts`. No
  client code imports server modules, so the key cannot reach the bundle.
- `.env.example` lists variable names only. `.gitignore` excludes every other `.env*` file, and
  `npm run check:repo` (run in CI) fails if one is ever tracked.
- Without a key the app still works: every AI route answers with standard guidance.

## Input validation

| Boundary                   | Control                                                                                                 | Code                                      | Tests                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Request bodies and queries | Zod schemas from `src/shared`; invalid input gets a 400 listing the problem fields, never a stack trace | `middleware/validate.ts`, `shared/api.ts` | `app.test.ts`, `profile.test.ts`           |
| Body size                  | 16 KB limit, 413 beyond it                                                                              | `app.ts` (`bodyLimit`)                    | `app.test.ts`                              |
| Chat                       | Question 1–500 characters, at most 6 earlier turns of up to 1,000 characters                            | `shared/api.ts`                           | `app.test.ts`                              |
| City search                | 2–60 letters, spaces and `,.'-` only                                                                    | `shared/api.ts`                           | `app.test.ts`                              |
| Open-Meteo responses       | Parsed with Zod before use; anything unexpected is a typed failure                                      | `air/open-meteo.ts`, `http/fetch-json.ts` | `open-meteo.test.ts`, `fetch-json.test.ts` |
| Gemini replies             | Must match the JSON schema sent with the request, checked again with Zod                                | `ai/gemini-client.ts`                     | `gemini-client.test.ts`                    |
| Saved state                | `localStorage` is parsed with Zod; anything invalid is ignored                                          | `ui/state/storage.ts`                     | `state.test.ts`                            |

## Rate limits, caches and budgets

- `GET /api/geocode` and `POST /api/plan` allow 60 requests a minute per client IP; the three AI
  routes allow 10. Over the limit the API answers 429 with `Retry-After`
  (`middleware/rate-limit.ts`, tested in `rate-limit.test.ts` and `app.test.ts`).
- The client IP is the first `x-forwarded-for` entry, which Vercel's proxy sets.
- **The rate limits, the caches and the Gemini daily budget are kept in memory, per serverless
  instance.** Two instances count separately, and a cold start begins empty. This bounds abuse on
  a small deployment but is not a global guarantee. The upgrade path is a shared store (for example
  Redis) behind the same middleware and cache interfaces.
- The rate limiter forgets the oldest clients after 10,000, and each cache holds at most 500
  entries, so memory stays bounded.

## Headers and CORS

- The API sets secure headers with Hono's `secureHeaders` (`app.ts`, checked in `app.test.ts`).
- Static pages get a strict Content-Security-Policy from `vercel.json`: `script-src 'self'`,
  `style-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, plus HSTS,
  `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy that allows only
  geolocation. The app has no inline scripts or styles. `e2e/flow.spec.ts` checks the header on the
  production build, and every end-to-end test fails on any console error, which includes CSP
  violations.
- CORS allows only `ALLOWED_ORIGIN` (and the Vite dev server in development). The UI calls its own
  origin, so it needs no CORS at all.

## AI safety

- The system instruction is sent separately from user content. The user's question goes inside
  `<user_question>` delimiters with `<` and `>` removed, and the instruction says it can never change
  the rules (`ai/prompts.ts`, `prompts.test.ts`).
- The model may only use the plan's numbers. `ai/grounding.ts` extracts every number from the
  reply (Devanagari digits included) and rejects any that is not one of the plan's numbers within
  rounding; a rejected reply is replaced by standard guidance (`grounding.test.ts`,
  `ai-service.test.ts`). Two limits: whole numbers up to 24 pass as clock hours or counts unless a
  percent sign or a unit of mass follows them, and a number may come from anywhere in the plan, not
  only from the item being explained.
- Every response says truthfully whether it is `ai` or `fallback` text (the headline and summary
  have their own label), and the UI shows it.
- AI output is rendered as plain React text; the codebase has no `dangerouslySetInnerHTML`.
- The model is told not to diagnose and to send people with symptoms to a doctor.

## Privacy

- Family members' names stay in the browser. Requests carry member ids (`m1`, `m2`…), age groups
  and conditions only; community notices are prompted without member ids at all.
- Locations are rounded to 0.1° (about 11 km) before they reach Open-Meteo or a cache
  (`air/air-service.ts`, `air-service.test.ts`).
- Logs go through `logger.ts` only, and only failures are logged: upstream failures with the host
  name (never the query string), Gemini failures with the model, and unexpected errors with the
  method and path. Request bodies are never logged.

## Outbound requests

The server calls only fixed hosts: `air-quality-api.open-meteo.com`, `api.open-meteo.com`,
`geocoding-api.open-meteo.com` (5-second timeout, one retry on network errors and 5xx) and Gemini
through the official SDK (8-second timeout per model). No URL is built from user text other than
validated coordinates and the city-search query.

## Dependencies

CI runs `npm audit --audit-level=high` on every push. Installs use `npm ci` with the committed
lockfile.

## Known limits

- Per-instance rate limits, caches and AI budget, as above.
- There are no accounts, so nothing server-side is tied to a person; the trade-off is that a
  household profile lives in one browser and is lost if storage is cleared.
