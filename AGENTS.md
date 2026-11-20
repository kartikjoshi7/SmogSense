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

Dependencies point one way: `ui → shared, core` · `server → shared, core` · `core → (type-only) shared`. `core` never imports a package or anything from `ui`/`server`.

## Code rules

1. **One place per concept.** Search before you write a helper. Never create a second version of something that exists (one Gemini client, one fetch wrapper, one `Dialog`, one formatter module, one cache).
2. **No `any`, no `as` on external data, no non-null `!`, no `@ts-ignore`.** Validate every boundary with Zod (request bodies and queries, Open-Meteo responses, Gemini JSON, `localStorage`) and use `z.infer` types. Define each domain type once.
3. **Name every number.** Domain coefficients and thresholds live in `src/core/constants.ts`, each with a source comment. Runtime settings (timeouts, limits, TTLs, model list) live in `src/server/config.ts`.
4. **Small, flat functions:** at most 60 lines, complexity at most 10, nesting at most 3, no nested ternaries. Split code by responsibility. Never squash code onto long lines to meet a limit. Prettier formats everything (`printWidth` 100).
5. **Explicit errors.** No empty `catch`. Only catch an error to handle it or add context. Services return typed results (`{ ok: true, value } | { ok: false, error }`). All logging goes through `src/server/logger.ts`; no stray `console`.
6. **Never present a failure as success.** AI output carries a truthful `source: "ai" | "fallback"`, and the UI shows it. Upstream failures return a proper status code with a safe message.
7. **No dead code:** no unused exports, files or dependencies (knip enforces this), no commented-out code, no TODOs in committed code.
8. **No test-only branches in production code.** Inject dependencies (fetch, clock, AI client) instead.
9. Named exports only (default exports only where a framework requires them). Function components. `kebab-case` file names. A JSDoc comment on every exported function in `core/` and `server/`.
10. **State lives in one place:** one React context + reducer for profile and plan, persisted through a single storage module.

## Security rules

- The Gemini key is server-side only: `GEMINI_API_KEY`, read in `src/server/config.ts`. It never appears in client code, logs or git. `.env.example` lists variable names only.
- Every route has Zod validation and a body-size limit, plus rate limiting on AI routes, strict CORS and secure headers. Responses never include stack traces. Logs never include personal data.
- Household member names stay on the device. Requests send member ids, age groups and conditions only.
- Render AI output as plain text (never `dangerouslySetInnerHTML`). User text goes into prompts as delimited data, kept separate from the system instruction.
- Outbound requests go only to fixed hosts (Open-Meteo, Gemini), with timeouts.

## Accessibility rules

- Semantic HTML and landmarks, labelled controls, `fieldset`/`legend` for groups, everything reachable by keyboard, visible focus, tap targets at least 44 px, WCAG AA contrast.
- Never use colour alone to carry meaning: the AQI shows text + icon + colour. Use `aria-live` for loading states and AI answers.
- Dialogs trap focus, close on Esc and return focus to the button that opened them. When the screen changes, move focus to its `h1`.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`. Set `lang` to the active language.

## Testing rules

- Every module ships with a test file next to it (`foo.ts` → `foo.test.ts`). `src/core` needs 100% lines and branches, and the whole project at least 90%. The thresholds are enforced in the Vitest config.
- Test behaviour, not implementation. Cover the edges: breakpoint boundaries, missing data, invalid input, upstream failure, AI fallback.
- UI tests query by role and label and include an axe check.

## Docs rules

- Only claim what the code or tests prove. No hand-made badges, no line-count claims, no buzzwords ("enterprise", "neurosymbolic", "triple-redundant"). Update docs in the same change as the code.
- One `README.md` plus `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/ACCESSIBILITY.md`, with nothing duplicated.

## Workflow

- Work on `main` only. Never create branches.
- Before finishing any task, run `npm run check` (typecheck, lint, format check, knip, tests with coverage, build) and `npm run check:repo`. Both must pass with zero warnings.
- Commit each finished task with a conventional commit message (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
