# SmogSense

[![CI](https://github.com/kartikjoshi7/SmogSense/actions/workflows/ci.yml/badge.svg)](https://github.com/kartikjoshi7/SmogSense/actions/workflows/ci.yml)

A GenAI assistant that helps families and communities get through winter smog. It reads the
live air-quality forecast for where you live, builds a plan for your household's day (low-emission
routines, indoor air hacks, sustainable alternatives) and shows the impact of every choice in
numbers. Gemini explains the plan in English or Hindi, answers questions and writes community
notices in ten languages, and it may only use the numbers the engine computed.

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
   engine says when daytime mixing should clear it, falls back to wind speed and says so, and
   says it cannot tell when there is no weather data.
5. **Candidates** (`recommendations/*`): 26 possible actions in five groups. Each is kept only if it
   fits the household (no carpool advice for someone who takes the metro) and carries its own
   numbers: exposure cut (`exposure.ts`, `windows.ts`), indoor PM2.5 before and after (`indoor.ts`,
   a mass-balance room model) and CO₂ saved per week (`emissions.ts`).
6. **Ranking** (`recommendations/rank.ts`): health benefit × how bad the air is × household
   sensitivity, plus CO₂ avoided, minus effort. In an emergency, protective actions come first.

**Requirement traceability**

| Requirement in the brief      | What SmogSense does                                                                                                                                                                                                 | Code                                                   | Tests                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| GenAI-powered assistant       | Gemini writes the plan's explanations, answers questions and writes community notices                                                                                                                               | `src/server/ai/*`                                      | `ai-service.test.ts`, `gemini-client.test.ts` |
| Families                      | Several members with age group and conditions; the plan adapts to the most sensitive one and names who each action is for                                                                                           | `core/risk.ts`, `core/severity.ts`                     | `risk.test.ts`, `plan.test.ts`                |
| Communities                   | Notices for a housing society, school or workplace in 10 languages; actions such as checking on neighbours and reporting open burning                                                                               | `routes/ai.ts`, `recommendations/community.ts`         | `app.test.ts`, `community-dialog.test.tsx`    |
| Severe winter smog            | Smog-emergency mode and an inversion explainer ("trapped until about 11:00")                                                                                                                                        | `core/severity.ts`, `core/inversion.ts`                | `severity.test.ts`, `inversion.test.ts`       |
| Urban air pollution           | This hour's PM2.5, PM10, NO₂, O₃, CO and SO₂ and a 24-hour PM2.5 forecast for the chosen place                                                                                                                      | `server/air/open-meteo.ts`, `core/plan.ts`             | `open-meteo.test.ts`, `plan.test.ts`          |
| Low-emission daily routines   | Cleanest exercise window, commute protection, a brief airing time and a timeline for the day                                                                                                                        | `recommendations/routine.ts`, `core/windows.ts`        | `windows.test.ts`, `plan.test.ts`             |
| Indoor air quality hacks      | Purifier, sealing gaps, closed windows, cooking ventilation, no incense or smoking, with indoor µg/m³ before and after                                                                                              | `core/indoor.ts`, `recommendations/indoor-air.ts`      | `indoor.test.ts`                              |
| Sustainable alternatives      | Metro, bus, carpool, cycling, walking, working from home, cleaner cooking fuel, with kg CO₂ saved per week                                                                                                          | `core/emissions.ts`, `recommendations/alternatives.ts` | `emissions.test.ts`                           |
| Tailored to location          | GPS or city search; NAQI in India, US AQI elsewhere; the NCR-only GRAP check                                                                                                                                        | `core/aqi.ts`, `server/air/geocode.ts`                 | `aqi.test.ts`, `geocode.test.ts`              |
| Tailored to lifestyle         | Commute mode, distance and days, exercise habit, home, cooking fuel, incense, smoking, mask                                                                                                                         | `shared/profile.ts`                                    | `profile.test.ts`                             |
| Clearly explaining the impact | Every measurable card shows the engine's numbers and the rest a benefit level; AI text with a number the grounding check cannot match to the plan is replaced by standard guidance, and every text says which it is | `server/ai/grounding.ts`, `core/explain/*`             | `grounding.test.ts`, `e2e/flow.spec.ts`       |

## How the solution works

1. **Set up (no sign-up).** Choose a place by GPS or city search, add family members (their names
   stay on the device) and describe the commute, exercise and home. The Delhi example family fills
   the form in one click.
2. **Today.** `POST /api/plan` gets the place's air-quality and weather forecast from Open-Meteo
   and runs the engine; no AI is involved, so the plan appears at once with standard guidance.
   `POST /api/explain` then swaps in Gemini's wording item by item. The request flow, caches and
   error handling are in [Architecture](docs/ARCHITECTURE.md).
3. **The plan.** An AQI card (number, category in words, icon and colour, and every pollutant
   measured this hour), the hourly PM2.5 chart
   with a table view, the inversion card, the day's timeline, five tabs named after the brief and a
   "what if" slider that recomputes exercise exposure in the browser with the same engine.
4. **Ask and share.** A chat dialog for questions such as "Can the children play outside at 4 pm?"
   and a community notice that can be copied or shared, each in any of ten languages. Both are
   loaded only when opened.

**GenAI usage.** Gemini (through `@google/genai`) is used in three places, all in
`src/server/ai/`:

| Use              | Route                 | What the model gets and returns                                                                                                                                                                 |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan narrator    | `POST /api/explain`   | The top 8 recommendations with their numbers, the household's member ids and age groups (never names or health conditions), the language → JSON headline, summary, and `why` + `steps` per item |
| Ask SmogSense    | `POST /api/chat`      | The same facts, the answer language, up to 6 earlier turns and the question inside `<user_question>` delimiters → JSON answer                                                                   |
| Community notice | `POST /api/community` | The day's facts as they apply to everyone nearby (nothing about the household), the audience and language → JSON notice                                                                         |

Every reply must match a JSON schema and pass the numeric grounding check
([Security › AI safety](docs/SECURITY.md#ai-safety)). Anything that fails, times out or cannot be
reached is replaced by standard guidance from `src/core/explain`, and each piece of text carries
an `ai` or `fallback` label that the UI shows next to it.

**Free-tier strategy.** The app is built to run on a free AI Studio key:

- `gemini-3.5-flash-lite` first, then `gemini-3.8-flash` (`GEMINI_MODELS`), with minimal thinking
  and capped output tokens (900 for a plan, 400 for chat and notices).
- One call explains the whole plan, and the explain and chat prompts carry only its 8
  highest-priority items.
- AI answers are cached ([Architecture](docs/ARCHITECTURE.md#request-flow) has the times);
  a response with no AI text is never cached, so the next request can reach the model again.
- A model that answers 429 is skipped for 10 minutes, and a daily budget (`GEMINI_DAILY_BUDGET`,
  200 by default) stops calls before the quota does. Rate limits are in [Security](docs/SECURITY.md).
- The plan itself never waits for the AI: `/api/plan` makes no model call.

**Run it locally** (Node 22+):

```bash
npm ci
cp .env.example .env.local   # add GEMINI_API_KEY; without it the app uses standard guidance
npm run dev                  # UI and API on http://localhost:5173
```

The quality gates and test suites are described in [Testing](docs/TESTING.md).

## Assumptions

- **Data.** Open-Meteo's CAMS air-quality forecast and weather forecast are good enough for
  household planning. They are model estimates for a grid cell, not readings from a nearby monitor.
- **Index.** The headline index uses the trailing 24-hour mean, as CPCB and the EPA do, so it barely
  moves within a day; clean windows are found from hourly PM2.5 instead.
- **Privacy.** Locations are rounded before any upstream call or cache, and health conditions
  never reach the AI ([Security › Privacy](docs/SECURITY.md#privacy)).
- **Not modelled yet.** Home heating (coal or wood braziers, kerosene and gas heaters) is not asked
  about or advised on, and commute doses use the 24-hour mean rather than the hours of travel.
- **Not medical advice.** Every figure is a planning estimate. The model is instructed not to
  diagnose and to send anyone with symptoms to a doctor, and the footer says the same.
- **Languages.** The interface and the plan's explanations are in English and Hindi. Chat answers
  and community notices can be in ten languages; their standard guidance exists in English and
  Hindi, and the other languages fall back to English.
- **Coefficients.** Every coefficient and threshold the engine uses is a named constant in
  `src/core/constants.ts`, with its source; [Architecture › Assumptions behind the
  numbers](docs/ARCHITECTURE.md#assumptions-behind-the-numbers) lists each one.

Air-quality and weather data: [Open-Meteo.com](https://open-meteo.com) (CC BY 4.0). Licence: MIT.
