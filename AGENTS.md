# SmogSense — engineering rules

SmogSense is a GenAI assistant that helps families and communities get through severe winter smog and urban air pollution. It builds a daily plan (low-emission routines, indoor air hacks, sustainable alternatives) from live local air-quality data and the household's lifestyle, and shows the impact of every choice in numbers.

These rules apply to every change in this repository, whoever makes it.

## Stack (don't change without asking)

- TypeScript (strict) · React 19 + Vite 8 · Tailwind CSS 4 · Hono 4 API on Vercel (Node runtime) · Zod 4 · `@google/genai` · Open-Meteo APIs (no key).
- Vitest 5 + Testing Library + jsdom + axe-core; Playwright for end-to-end tests.
- ESLint **9** (pinned, because `eslint-plugin-jsx-a11y` doesn't support 10) · typescript-eslint · Prettier · knip.
- Only add a dependency when it is clearly needed. No UI-kit, chart or state-management libraries: charts are hand-written SVG, state is React context + reducer.

## Layout and layers

```
api/index.ts      Vercel entry: wires the Hono app, nothing else
src/core/         pure domain logic: no I/O, no React, no clock (time is passed in)
src/shared/       Zod schemas and the types inferred from them, shared by UI and server
src/server/       Hono app, routes, middleware, services (Open-Meteo, Gemini), config, logger
src/ui/           React: components render, hooks orchestrate, api/ does fetch
```

Dependencies point one way: `ui → shared, core` · `server → shared, core` · `core → (type-only) shared`, except `src/shared/limits.ts`, which imports nothing and whose bounds and units `core` may use. `core` never imports a package or anything from `ui`/`server`.

## Code rules

1. **One place per concept.** Search before you write a helper. Never create a second version of something that exists (one Gemini client, one fetch wrapper, one `Dialog`, one formatter module, one cache).
2. **No `any`, no `as` on external data, no non-null `!`, no `@ts-ignore`.** Validate every boundary with Zod (request bodies and queries, Open-Meteo responses, Gemini JSON, `localStorage`) and use `z.infer` types. Define each domain type once.
3. **Name every number.** Domain coefficients and thresholds live in `src/core/constants/` (one file per topic, all re-exported by `src/core/constants.ts`), each with a source comment. Runtime settings (timeouts, limits, TTLs, model list) live in `src/server/config.ts`, browser-side ones in `src/ui/settings.ts`. Input bounds are defined once in `src/shared/limits.ts` and used by the schemas, the form controls and the engine.
4. **Small units:** a source file holds at most 150 lines of code (a test file 200), and a function at most 40, with complexity at most 8, nesting at most 3 and no nested ternaries. ESLint enforces all of these. Split code by responsibility: a sub-component, a hook or a module of its own. Never squash code onto long lines to meet a limit. Prettier formats all code and config (`printWidth` 100); Markdown is left as written.
5. **Explicit errors.** No empty `catch`. Only catch an error to handle it or add context. Services return the one `Result` type from `src/core/result.ts` (`{ ok: true, value } | { ok: false, error }`). All logging goes through `src/server/logger.ts`; no stray `console`.
6. **Never present a failure as success.** AI output carries a truthful `source: "ai" | "fallback"`, and the UI shows it. Upstream failures return a proper status code with a safe message.
7. **No dead code:** no unused exports, files or dependencies, and no export that only tests use (knip enforces both, the second with `knip --production`), no commented-out code, no TODOs in committed code.
8. **No test-only branches in production code.** Inject dependencies (fetch, clock, AI client) instead.
9. Named exports only (default exports only where a framework requires them). Function components. `kebab-case` file names. Every source file opens with a one-line comment saying what it is for, and every exported function in `core/` and `server/` has a JSDoc comment.
10. **Relative imports end in `.js`** (`import { x } from './x.js'`, even when the file is `x.ts`/`x.tsx`). Vercel compiles each `.ts` file to `.js` without rewriting import paths, so `.ts` or missing extensions crash the API at runtime. The server type-check (`NodeNext`) enforces this.
11. **State lives in one place:** one React context + reducer for the language, household and location, persisted through a single storage module. Server data (the plan, answers) lives in the hooks that load it.

## Security rules

- The Gemini key is server-side only: `GEMINI_API_KEY`, read in `src/server/config.ts`. It never appears in client code, logs or git. `.env.example` lists variable names only.
- Every route has Zod validation and a body-size limit, plus rate limiting on AI routes, strict CORS and secure headers. Responses never include stack traces. Logs never include personal data.
- Household member names stay on the device. Requests send member ids, age groups and conditions only, and prompts to the model never include conditions. The setup form says so.
- Render AI output as plain text (never `dangerouslySetInnerHTML`). User text goes into prompts as delimited data, kept separate from the system instruction.
- Outbound requests go only to fixed hosts (Open-Meteo, Gemini), with timeouts.

## Accessibility rules

- Semantic HTML and landmarks, labelled controls, `fieldset`/`legend` for groups, everything reachable by keyboard, visible focus, tap targets at least 44 px, WCAG AA contrast.
- Never use colour alone to carry meaning: the AQI shows text + icon + colour. Use `aria-live` for loading states and AI answers.
- Dialogs trap focus, close on Esc and return focus to the button that opened them. When the screen changes, move focus to its `h1`.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`. Set `lang` to the active language.

## Testing rules

- Tests sit next to the code they cover (`foo.ts` → `foo.test.ts`). A small module may instead be covered by the test of the module that uses it (`recommendations/*` through `plan.test.ts`, routes through `app.test.ts` and `routes/ai.test.ts`, `state/storage.ts` through `state.test.ts`, the hooks through the components that use them, and the `shared/plan.ts` schema through the engine and API tests), but nothing goes untested: `src/core` needs 100% lines and branches, and the whole project at least 90%. The thresholds are enforced in the Vitest config.
- End-to-end tests (`e2e/`, Playwright) run the production build with `/api/*` served by `src/ui/test/fake-server.ts`: the real Hono app with fakes for the air service and the AI client. The UI unit tests use the same harness; the services themselves are tested against recorded responses and an injected SDK call.
- Test behaviour, not implementation. Cover the edges: breakpoint boundaries, missing data, invalid input, upstream failure, AI fallback.
- UI tests query by role and label and include an axe check.

## Docs rules

- Only claim what the code or tests prove. No hand-made badges, no hand-written line counts (sizes in the docs come from `npm run size`, and `npm run check:repo` checks them), no buzzwords ("enterprise", "neurosymbolic", "triple-redundant"). Update docs in the same change as the code.
- One `README.md` plus `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and one doc per judging area (`docs/CODE_QUALITY.md`, `docs/SECURITY.md`, `docs/EFFICIENCY.md`, `docs/TESTING.md`, `docs/ACCESSIBILITY.md`, `docs/ALIGNMENT.md`), with nothing duplicated: each fact lives in one doc and the others link to it.
- A choice that shapes the code (a layer rule, a library, a data source, a trade-off) gets a record in `docs/DECISIONS.md`: context, decision, what was turned down, what it costs, and the code and tests that carry it.

## Workflow

- Work on `main` only. Never create branches, and don't add bots that open branches or PRs (no Dependabot).
- npm hygiene: never use `--legacy-peer-deps` or `--force`, never add an `.npmrc` that changes resolution, and never hand-edit `package-lock.json`. If `npm ci` fails, delete `node_modules` and `package-lock.json`, run `npm install`, and confirm a clean `npm ci` passes. Peer dependencies you import directly (e.g. `@testing-library/dom`) are listed in `devDependencies`.
- Before finishing any task, run `npm run check` (typecheck, lint, format check, knip, tests with coverage, build) and `npm run check:repo`. Both must pass with zero warnings.
- Commit each finished task with a conventional commit message (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
