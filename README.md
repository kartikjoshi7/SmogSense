# SmogSense

[![CI](https://github.com/kartikjoshi7/SmogSense/actions/workflows/ci.yml/badge.svg)](https://github.com/kartikjoshi7/SmogSense/actions/workflows/ci.yml)

A GenAI assistant that helps families and communities get through winter smog. It reads the
live air-quality forecast for where you live, builds a plan for your household's day (low-emission
routines, indoor air hacks, sustainable alternatives) and shows the impact of every choice in
numbers. Gemini explains the plan, answers questions and writes community notices in ten
languages, and it may only use the numbers the engine computed.

**Live:** https://smog-sense-sigma.vercel.app · More detail: [Architecture](docs/ARCHITECTURE.md) ·
[Security](docs/SECURITY.md) · [Testing](docs/TESTING.md) · [Accessibility](docs/ACCESSIBILITY.md)

## Chosen vertical

**Urban Air Quality Assistant.** The brief: _"Create a GenAI-powered assistant that helps families
and communities navigate severe winter smog and urban air pollution. The application should
suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives
tailored to their location and lifestyle, while clearly explaining the direct impact of their
choices."_

SmogSense is built for households in North Indian cities, where winter inversions trap smoke for
weeks, and it works anywhere Open-Meteo has a forecast (US AQI outside India).

## Approach and logic

**The engine decides and calculates; Gemini explains and talks.** A pure TypeScript decision
engine (`src/core`, no I/O, 100% test coverage) turns the forecast and the household profile into
a ranked plan with numbers. Gemini only rewrites that plan in plain language, so the numbers can be
trusted and the app keeps working when the AI is unavailable.

How `buildPlan(profile, air)` in `src/core/plan.ts` decides:

1. **Index** (`aqi.ts`): the trailing 24-hour PM2.5 and PM10 means become India's NAQI for Indian
   locations or the US AQI elsewhere, with official breakpoints.
2. **Who is most at risk** (`risk.ts`): infants, seniors and anyone with asthma, COPD, heart
   disease or a pregnancy are "high" sensitivity, children "elevated". The household is as
   sensitive as its most sensitive member, and sensitive members are told to act one band sooner.
3. **How strongly to react** (`severity.ts`): normal, caution, restrict or smog emergency. A highly
   sensitive household enters emergency mode one band early.
4. **Winter inversion** (`inversion.ts`): a low boundary layer means pollution is trapped; the
   engine says when daytime mixing should clear it, or falls back to wind speed and says so.
5. **Candidates** (`recommendations/*`): 26 possible actions in five groups. Each is kept only if it
   fits the household (no carpool advice for someone who takes the metro) and carries its own
   numbers: exposure cut (`exposure.ts`, `windows.ts`), indoor PM2.5 before and after (`indoor.ts`,
   a mass-balance room model) and CO₂ saved per week (`emissions.ts`).
6. **Ranking** (`recommendations/rank.ts`): health benefit × how bad the air is × household
   sensitivity, plus CO₂ avoided, minus effort. In an emergency, protective actions come first.

**Requirement traceability**

| Requirement in the brief      | What SmogSense does                                                                                                                                         | Code                                                   | Tests                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| GenAI-powered assistant       | Gemini writes the plan's explanations, answers questions and writes community notices                                                                       | `src/server/ai/*`                                      | `ai-service.test.ts`, `gemini-client.test.ts` |
| Families                      | Several members with age group and conditions; the plan adapts to the most sensitive one and names who each action is for                                   | `core/risk.ts`, `core/severity.ts`                     | `risk.test.ts`, `plan.test.ts`                |
| Communities                   | Notices for a housing society, school or workplace in 10 languages; actions such as checking on neighbours and reporting open burning                       | `routes/ai.ts`, `recommendations/community.ts`         | `app.test.ts`, `community-dialog.test.tsx`    |
| Severe winter smog            | Smog-emergency mode and an inversion explainer ("trapped until about 11:00")                                                                                | `core/severity.ts`, `core/inversion.ts`                | `severity.test.ts`, `inversion.test.ts`       |
| Urban air pollution           | This hour's PM2.5, PM10, NO₂, O₃, CO and SO₂ and a 24-hour PM2.5 forecast for the chosen place                                                              | `server/air/open-meteo.ts`, `core/plan.ts`             | `open-meteo.test.ts`, `plan.test.ts`          |
| Low-emission daily routines   | Cleanest exercise window, commute protection, a brief airing time and a timeline for the day                                                                | `recommendations/routine.ts`, `core/windows.ts`        | `windows.test.ts`, `plan.test.ts`             |
| Indoor air quality hacks      | Purifier, sealing gaps, closed windows, cooking ventilation, no incense or smoking, with indoor µg/m³ before and after                                      | `core/indoor.ts`, `recommendations/indoor-air.ts`      | `indoor.test.ts`                              |
| Sustainable alternatives      | Metro, bus, carpool, cycling, walking, working from home, cleaner cooking fuel, with kg CO₂ saved per week                                                  | `core/emissions.ts`, `recommendations/alternatives.ts` | `emissions.test.ts`                           |
| Tailored to location          | GPS or city search; NAQI in India, US AQI elsewhere; the NCR-only GRAP check                                                                                | `core/aqi.ts`, `server/air/geocode.ts`                 | `aqi.test.ts`, `geocode.test.ts`              |
| Tailored to lifestyle         | Commute mode, distance and days, exercise habit, home, cooking fuel, incense, smoking, mask                                                                 | `shared/profile.ts`                                    | `profile.test.ts`                             |
| Clearly explaining the impact | Every card shows engine numbers; AI text that quotes any number the plan does not contain is replaced by standard guidance, and every text says which it is | `server/ai/grounding.ts`, `core/explain/*`             | `grounding.test.ts`, `e2e/flow.spec.ts`       |

## How the solution works

1. **Set up (no sign-up).** Choose a place by GPS or city search, add family members (their names
   stay on the device) and describe the commute, exercise and home. The Delhi example family fills
   the form in one click.
2. **Today.** `POST /api/plan` fetches the air-quality and weather forecasts in parallel, rounds
   the location to 0.1°, caches the result and runs the engine. The plan appears at once with
   standard guidance; `POST /api/explain` then swaps in Gemini's wording item by item.
3. **The plan.** An AQI card (number, category in words, icon and colour, and every pollutant
   measured this hour), the hourly PM2.5 chart
   with a table view, the inversion card, the day's timeline, five tabs named after the brief and a
   "what if" slider that recomputes exercise exposure in the browser with the same engine.
4. **Ask and share.** A chat dialog for questions such as "Can the children play outside at 4 pm?"
   and a community notice that can be copied or shared. Both are loaded only when opened.

```
Browser (React 19)                        Vercel function (Hono)
  setup → plan → chat / notice    ──►      /api/geocode  /api/plan            ──► Open-Meteo
  same src/core engine for what-if         /api/explain  /api/chat  /api/community ──► Gemini
  profile in localStorage                  Zod on every boundary, rate limits, caches, fallback
```

**GenAI usage.** Gemini (through `@google/genai`) is used in three places, all in
`src/server/ai/`:

| Use              | Route                 | What the model gets and returns                                                                                                                                                        |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan narrator    | `POST /api/explain`   | The top 8 recommendations with their numbers, the household's member ids, age groups and conditions (never names), the language → JSON headline, summary, and `why` + `steps` per item |
| Ask SmogSense    | `POST /api/chat`      | The plan's facts, up to 6 earlier turns and the question inside `<user_question>` delimiters → JSON answer                                                                             |
| Community notice | `POST /api/community` | The plan's facts without any member ids, the audience and language → JSON notice                                                                                                       |

Every reply must match a JSON schema (sent to the model and checked again with Zod) and pass the
numeric grounding check in `grounding.ts`. Anything that fails, times out or cannot be reached is
replaced by standard guidance from `src/core/explain` (English and Hindi), and the response says
so: each item and the headline carry their own `ai` or `fallback` label, which the UI shows next to
the text.

**Free-tier strategy.** The app is built to run on a free AI Studio key:

- `gemini-3.5-flash-lite` first, then `gemini-3.8-flash` (`GEMINI_MODELS`), with minimal thinking
  and capped output tokens (900 for a plan, 400 for chat and notices).
- One call explains the whole plan, and only its 8 highest-priority items.
- AI answers are cached (30 minutes for plans and notices, 10 for chat); fallbacks are never
  cached, so the next request can reach the model again.
- A model that answers 429 is skipped for 10 minutes; a daily budget (`GEMINI_DAILY_BUDGET`,
  200 by default) stops calls before the quota does; AI routes allow 10 requests a minute per IP.
- The plan itself never waits for the AI: `/api/plan` makes no model call.

**Run it locally** (Node 22+):

```bash
npm ci
cp .env.example .env.local   # add GEMINI_API_KEY; without it the app uses standard guidance
npm run dev                  # UI and API on http://localhost:5173
npm run check                # typecheck, lint, format, knip, tests with coverage, build
npm run test:e2e             # Playwright against the production build
```

## Assumptions

- **Data.** Open-Meteo's CAMS air-quality forecast and weather forecast are good enough for
  household planning. They are model estimates for a grid cell, not readings from a nearby monitor.
- **Index.** The headline index uses the trailing 24-hour mean, as CPCB and the EPA do, so it barely
  moves within a day; clean windows are found from hourly PM2.5 instead.
- **Privacy.** Locations are rounded to 0.1° (about 11 km) before any upstream call or cache.
- **Not medical advice.** Every figure is a planning estimate. The model is instructed not to
  diagnose and to send anyone with symptoms to a doctor, and the footer says the same.
- **Languages.** The interface is in English and Hindi. AI answers can be in ten languages; standard
  guidance exists in English and Hindi, and other languages fall back to English.
- **Coefficients.** Every number the engine uses is a named constant in `src/core/constants.ts`.
  The table below shows each one; `src/core/constants.test.ts` fails if it falls out of date.

| Constant                             | Value                                                                                                                                   | Source or reasoning                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `AQI_SCALES.naqi`                    | PM2.5 band tops 30 / 60 / 90 / 120 / 250 / 380 µg/m³                                                                                    | CPCB National AQI (2014); the Severe band is open-ended, so 380 (and 510 for PM10) is assumed |
| `AQI_SCALES.us_aqi`                  | PM2.5 band tops 9 / 35.4 / 55.4 / 125.4 / 225.4 / 325.4 µg/m³                                                                           | US EPA AQI, February 2024 PM2.5 update                                                        |
| `INDEX_WINDOW_HOURS`                 | 24 h                                                                                                                                    | CPCB and EPA average PM over 24 hours                                                         |
| `INDEX_MIN_VALID_HOURS`              | 16 h                                                                                                                                    | CPCB's 16-of-24-hours completeness rule                                                       |
| `PLAN_HORIZON_HOURS`                 | 24 h                                                                                                                                    | The plan covers the next day                                                                  |
| `INVERSION_TRAPPED_BLH_M`            | 200 m                                                                                                                                   | Estimate: a boundary layer this low traps pollution near the ground                           |
| `INVERSION_CLEARED_BLH_M`            | 500 m                                                                                                                                   | Estimate: daytime mixing has cleared the inversion                                            |
| `INVERSION_STAGNANT_WIND_KMH`        | 5 km/h                                                                                                                                  | Estimate: stagnant air, used when boundary-layer data is missing                              |
| `EXERCISE_BREATHING_M3H`             | walk 1.6, run 3, cycle 2.5, yoga 0.7, sports 3, none 0.3 (m³/h)                                                                         | US EPA Exposure Factors Handbook (2011), ch. 6, rounded                                       |
| `AGE_FACTOR`                         | infant 0.4, child 0.7, teen 0.9, adult 1, senior 0.9                                                                                    | Estimate: breathing volume relative to an adult                                               |
| `MASK_REDUCTION`                     | none 0, cloth 0.2, surgical 0.4, n95 0.8                                                                                                | Conservative estimate: filtration × typical fit                                               |
| `COMMUTE_MODES › exposureMultiplier` | walk 1.2, cycle 1.2, two_wheeler 1.4, auto 1.5, bus 1.2, metro 0.7, car_petrol 0.6, car_diesel 0.6, car_cng 0.6, car_ev 0.6             | Estimate informed by Delhi on-road studies (Goel et al. 2015)                                 |
| `COMMUTE_MODES › co2KgPerKm`         | walk 0, cycle 0, two_wheeler 0.05, auto 0.08, bus 0.03, metro 0.02, car_petrol 0.17, car_diesel 0.16, car_cng 0.13, car_ev 0.08 (kg/km) | Estimate from India GHG Program road-transport factors; per passenger for bus and metro       |
| `COMMUTE_MODES › speedKmh`           | walk 5, cycle 12, two_wheeler 25, auto 20, bus 15, metro 30, car_petrol 22, car_diesel 22, car_cng 22, car_ev 22 (km/h)                 | Estimate: typical urban door-to-door speeds                                                   |
| `CARPOOL_OCCUPANTS`                  | 3 people                                                                                                                                | Estimate                                                                                      |
| `MAX_CYCLE_KM, MAX_WALK_KM`          | 8 km, 2 km                                                                                                                              | Estimate: longest one-way trips suggested for cycling and walking                             |
| `INDOOR_PENETRATION`                 | 0.8                                                                                                                                     | Estimate; typical range 0.6–1.0                                                               |
| `INDOOR_DEPOSITION_PER_H`            | 0.2 per hour                                                                                                                            | Estimate; typical range 0.1–0.4                                                               |
| `AIR_CHANGES_PER_H`                  | leaky 1.5, average 1, sealed 0.5, windows_open 5 (per hour)                                                                             | Estimates for each kind of home                                                               |
| `CEILING_HEIGHT_M`                   | 2.8 m                                                                                                                                   | Estimate, to turn floor area into room volume                                                 |
| `DEFAULT_PURIFIER_CADR_M3H`          | 250 m³/h                                                                                                                                | Estimate: a typical home purifier                                                             |
| `INDOOR_SOURCE_UG_PER_H`             | incense 20000, smoking 25000 (µg/h)                                                                                                     | Order-of-magnitude estimates                                                                  |
| `ACTION_BAND`                        | commuteMask 2, alertSensitive 2, maskEveryone 3, reportOpenBurning 3, checkOnNeighbours 4, grapCheck 4                                  | Band (0–5) at which each action starts to apply                                               |
| `SENSITIVITY_WEIGHT`                 | normal 1, elevated 1.5, high 2                                                                                                          | Ranking design choice                                                                         |
| `CO2_RANK_WEIGHT`                    | 2 points per weekly kg                                                                                                                  | Ranking design choice                                                                         |
| `EFFORT_PENALTY`                     | low 0, medium 5, high 15                                                                                                                | Ranking design choice                                                                         |
| `QUALITATIVE_BENEFIT_PCT`            | low 5, medium 15, high 30                                                                                                               | Ranking weight for benefits that are described, not measured                                  |
| `EMERGENCY_BOOST`                    | 1000 points                                                                                                                             | Keeps protective actions first in an emergency                                                |
| `MIN_WORTHWHILE_REDUCTION_PCT`       | 10%                                                                                                                                     | A smaller gain is not worth moving a routine for                                              |
| `PURIFIER_NIGHT_HOUR`                | 21:00                                                                                                                                   | Bedtime, when the purifier entry appears on the timeline                                      |
| `NCR_BOUNDS`                         | lat 27.9–29.2, lon 76.8–77.9                                                                                                            | Approximate National Capital Region, where GRAP rules apply                                   |

Air-quality and weather data: [Open-Meteo.com](https://open-meteo.com) (CC BY 4.0). Licence: MIT.
