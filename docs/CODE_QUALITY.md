# Code quality

How SmogSense keeps its code clean, and how to check each claim yourself. `npm run check` runs the
first six gates below and `npm run check:repo` the seventh; CI (`.github/workflows/ci.yml`) runs
all eight on every push.

## Gates that fail the build

| Gate               | Command                        | What it enforces                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types              | `npm run typecheck`            | Four TypeScript projects (browser, server with `NodeNext` resolution, end-to-end tests, and the repository script through its JSDoc types), all with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters` and `noFallthroughCasesInSwitch`                    |
| Lint               | `npm run lint`                 | typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, React `recommended` with `no-danger`, React hooks, jsx-a11y `strict` and import-x (no cycles, no unresolved or duplicate imports). Each file: at most 250 lines of code. Each function: complexity ≤ 10, ≤ 60 lines, nesting ≤ 3, ≤ 4 parameters, no nested ternaries. Zero warnings allowed |
| Format             | `npm run format:check`         | Prettier on every file, 100 columns; `.editorconfig` sets the same defaults in editors                                                                                                                                                                                                                                                                         |
| Unused code        | `npm run knip`                 | No unused files, exports or dependencies; `knip --production` also fails on an export that only tests use                                                                                                                                                                                                                                                      |
| Tests and coverage | `npm run coverage`             | Vitest with the coverage thresholds in [Testing › Coverage](TESTING.md#coverage)                                                                                                                                                                                                                                                                               |
| Build              | `npm run build`                | The production build                                                                                                                                                                                                                                                                                                                                           |
| Repository         | `npm run check:repo`           | One branch (in CI, on GitHub as well as locally), tracked files under 9 MB, no `.env` files                                                                                                                                                                                                                                                                    |
| Dependencies       | `npm audit --audit-level=high` | No high or critical advisories ([Security › Dependencies](SECURITY.md#dependencies))                                                                                                                                                                                                                                                                           |

`eslint.config.js` is the one script outside the type check: its plugins ship incomplete type
definitions, and ESLint validates the config itself every time it runs.

## Layers, enforced by the linter

```
ui ──▶ shared, core          server ──▶ shared, core          core ──▶ shared (types only)
```

`src/core` (the decision engine) may not import any npm package, any value from `src/shared`
except the dependency-free bounds in `shared/limits.ts`, or anything from `ui` or `server`. `src/ui`
may not import `server`; only its test harness runs the real app. Import cycles fail the lint.
[Architecture](ARCHITECTURE.md#layers) describes what each layer holds.

## Design rules the code follows

Each rule is stated here once; the linked section shows how the code applies it.

- **One way to fail.** Expected failures are values, never exceptions: the engine, the services
  and the UI's API client return the one `Result` type in `core/result.ts`. No `catch` is empty,
  and every log line goes through `server/logger.ts`. How failures become status codes:
  [Architecture › Request flow](ARCHITECTURE.md#request-flow).
- **Validation at every boundary.** Every input from outside the code is parsed by a Zod schema
  from `src/shared`, and every domain type is inferred from its schema
  ([Security › Input validation](SECURITY.md#input-validation) lists the boundaries).
- **Typed facts and impact.** Each recommendation id carries its own typed facts and impact, so a
  template that reads a figure its recommendation lacks fails the type check
  ([Architecture › The engine](ARCHITECTURE.md#the-engine-srccore)).
- **Named numbers.** Coefficients and thresholds live in `core/constants.ts`, each with its source,
  and `constants.test.ts` fails if [the table of them](ARCHITECTURE.md#assumptions-behind-the-numbers)
  misses one. Runtime settings live in `server/config.ts` and `ui/settings.ts`; input bounds and
  time units in `shared/limits.ts`.
- **One place per concept.** One cache (`TtlCache`, also used by the rate limiter), one fetch
  wrapper, one Gemini client, one dialog component, one set of text formatters.
- **Injected dependencies, no test-only branches.** Real `fetch`, clocks, the Gemini SDK call and
  browser storage are created in one place and passed in
  ([Testing › Test doubles](TESTING.md#test-doubles)).
- **Components render, hooks orchestrate.** Browser I/O (speech, clipboard, sharing, location,
  requests) lives in `ui/hooks` and `ui/api/client.ts`.
- **Decisions are written down.** Why the code is shaped this way, and what each choice cost, is
  recorded in [Decisions](DECISIONS.md).

## By the numbers

Measured on the source (tests, fixtures and test helpers excluded) in the commit that last changed this file:

| Check                                              | Count   |
| -------------------------------------------------- | ------- |
| `any` types                                        | 0       |
| Type assertions (other than `as const`)            | 0       |
| Non-null assertions (`!`)                          | 0       |
| `@ts-ignore`, `@ts-expect-error`, `eslint-disable` | 0       |
| Source files / test files                          | 96 / 52 |

## Check it yourself

```bash
npm ci
npm run check       # types, lint, format, unused code, tests with coverage, build
npm run check:repo
```

The test suites, including the end-to-end run, are in [Testing](TESTING.md#how-to-run).

**Before each commit (optional).** With [pre-commit](https://pre-commit.com) installed,
`pre-commit install` runs the format, lint, type, unused-code and repository checks, plus the
Vitest tests the staged files affect (`vitest related`), before every commit. Each hook in
`.pre-commit-config.yaml` calls one of the npm scripts above, so the rules stay in one place.
