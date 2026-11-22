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
| Chat                       | Question 1–500 characters, at most 6 earlier turns of up to 1,200 characters                            | `shared/limits.ts`, `shared/api.ts`       | `api.test.ts`, `routes/ai.test.ts`         |
| City search                | 2–60 characters: letters and digits in any script, spaces and `,.'()-` only                             | `shared/api.ts`                           | `app.test.ts`                              |
| Open-Meteo responses       | Parsed with Zod before use; anything unexpected is a typed failure                                      | `air/open-meteo.ts`, `http/fetch-json.ts` | `open-meteo.test.ts`, `fetch-json.test.ts` |
| Gemini replies             | Must match the JSON schema sent with the request, checked again with Zod                                | `ai/gemini-client.ts`                     | `gemini-client.test.ts`                    |
| Saved state                | `localStorage` is parsed with Zod; anything invalid is ignored                                          | `ui/state/storage.ts`                     | `state.test.ts`                            |

## Rate limits, caches and budgets

- `GET /api/geocode` and `POST /api/plan` share an allowance of 60 requests a minute per client
  IP; the three AI routes share one of 10. Over the limit the API answers 429 with `Retry-After`
  (`middleware/rate-limit.ts`, tested in `rate-limit.test.ts`, `app.test.ts` and `routes/ai.test.ts`).
- Each client may also have 30 answers a day written by the model. The AI service charges this
  allowance only when it calls the model, so answers from its cache are free (`allowance.ts`,
  `ai-service.test.ts`). An answer can try both models, so one client can spend at most 60 of the
  default daily budget of 200 and cannot leave everyone else with standard guidance; past its
  allowance, that client gets standard guidance, not an error (`routes/ai.test.ts`).
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
  `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy that allows
  geolocation for the app's own origin and turns off the camera, microphone, payments, USB and
  screen capture. The app has no inline scripts or styles. `e2e/flow.spec.ts` checks the header on the
  production build, and every end-to-end test fails on any console error, which includes CSP
  violations.
- CORS allows only `ALLOWED_ORIGIN`, and no origin at all when it is unset, not even localhost
  (`app.test.ts`). The UI calls its own origin, in production and under `npm run dev` alike, so it
  needs no CORS at all.

## AI safety

- The system instruction is sent separately from user content. The user's question goes inside
  `<user_question>` delimiters with `<` and `>` removed, and the instruction says it can never change
  the rules (`ai/prompts.ts`, `prompts.test.ts`).
- The model may only use the plan's numbers, and is told to write them with the digits 0–9 in
  every language. `ai/grounding.ts` reads every number in the reply, whatever script its digits
  are in (Devanagari, Bengali, Tamil and the rest are converted first), and rejects any that is
  not one of the plan's numbers rounded to the digits written ("1.2" may stand for 1.24, not 1.7); a rejected reply is replaced by standard guidance
  (`grounding.test.ts`, `ai-service.test.ts`). Its limits: whole numbers up to 24 pass as clock
  hours or counts unless a percent sign, a unit of mass or the word for "percent" in one of the ten
  languages is next to them; numbers spelled out in words are not read; and a number may come from
  anywhere in the plan, not only from the item being explained.
- Every response says truthfully whether it is `ai` or `fallback` text (the headline and summary
  have their own label), and the UI shows it.
- AI output is rendered as plain React text; the codebase has no `dangerouslySetInnerHTML`.
- The model is told not to diagnose and to send people with symptoms to a doctor.

## Privacy

- Family members' names stay in the browser. Requests to the server carry member ids (`m1`,
  `m2`…), age groups and health conditions, which the engine needs; nothing is stored. The schema
  accepts only ids of that form, so a name cannot pass as an id (`profile.test.ts`).
- Prompts to Gemini carry member ids and age groups, never conditions: the model learns who needs
  extra care only from the plan (the household's sensitivity level and the members each
  recommendation is for). Community notices are prompted without member ids at all
  (`ai/prompts.ts`, `prompts.test.ts`). The setup form says all this next to the household fields.
- Locations are rounded to 0.1° (about 11 km) before they reach Open-Meteo or a cache
  (`air/air-service.ts`, `air-service.test.ts`).
- Logs go through `logger.ts` only, and only failures are logged: upstream failures with the host
  name (never the query string), Gemini failures with the model, and unexpected errors with the
  method, the path and the error's class name. Request bodies are never logged.

## Outbound requests

The server calls only fixed hosts: `air-quality-api.open-meteo.com`, `api.open-meteo.com`,
`geocoding-api.open-meteo.com` (5-second timeout, one retry on network errors and 5xx) and Gemini
through the official SDK (8-second timeout per model). No URL is built from user text other than
validated coordinates and the city-search query.

## Dependencies

CI runs `npm audit --audit-level=high` on every push. Installs use `npm ci` with the committed
lockfile.

## Static analysis

CodeQL (`.github/workflows/codeql.yml`) scans the JavaScript and TypeScript with the
`security-extended` queries on every push and pull request to `main`, and weekly so that new
queries also reach unchanged code. Its findings go to the repository's code-scanning alerts.

## Known limits

- Per-instance rate limits, caches and AI budget, as above.
- The limits count per IP address, so people behind one address (a school or office network)
  share the daily AI allowance. Cached answers are free, and once the allowance is spent new
  answers are standard guidance until the day's window passes; the plan itself is never limited.
- There are no accounts, so nothing server-side is tied to a person; the trade-off is that a
  household profile lives in one browser and is lost if storage is cleared.
