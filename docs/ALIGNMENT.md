# Problem statement alignment

The brief and the people SmogSense is built for are in the README's
[chosen vertical](../README.md#chosen-vertical); this page shows where each part of the brief is
met, in the code and in the tests.

## Requirement traceability

| Requirement in the brief | What SmogSense does | Code | Tests |
| --- | --- | --- | --- |
| GenAI-powered assistant | Gemini writes the plan's explanations, answers questions and writes community notices | `src/server/ai/*` | `ai-service.test.ts`, `gemini-client.test.ts` |
| Families | Several members with age group and conditions; the plan adapts to the most sensitive one and names who each action is for | `core/risk.ts`, `core/severity.ts` | `risk.test.ts`, `plan.test.ts` |
| Communities | Notices for a housing society, school or workplace in 10 languages; actions such as checking on neighbours and reporting open burning | `routes/ai.ts`, `recommendations/community.ts` | `app.test.ts`, `community-dialog.test.tsx` |
| Severe winter smog | Smog-emergency mode and an inversion explainer ("trapped until about 11:00") | `core/severity.ts`, `core/inversion.ts` | `severity.test.ts`, `inversion.test.ts` |
| Urban air pollution | This hour's PM2.5, PM10, NO₂, O₃, CO and SO₂ and a 24-hour PM2.5 forecast for the chosen place | `server/air/open-meteo.ts`, `core/plan.ts` | `open-meteo.test.ts`, `plan.test.ts` |
| Low-emission daily routines | Cleanest exercise window, commute protection, a brief airing time and a timeline for the day | `recommendations/routine.ts`, `core/windows.ts` | `windows.test.ts`, `plan.test.ts` |
| Indoor air quality hacks | Purifier, sealing gaps, closed windows, cooking ventilation, no incense or smoking, smoke-free heating in place of a coal fire or kerosene heater; the measurable ones with indoor µg/m³ before and after | `core/indoor.ts`, `recommendations/indoor-air.ts` | `indoor.test.ts` |
| Sustainable alternatives | Metro, bus, carpool, cycling, walking, working from home, cleaner cooking fuel; the commute swaps with kg CO₂ saved per week; on smoggy days a walker or cyclist is offered the metro or bus as protection, with the CO₂ it adds | `core/emissions.ts`, `recommendations/alternatives.ts` | `emissions.test.ts` |
| Tailored to location | GPS or city search; NAQI in India, US AQI elsewhere; the NCR-only GRAP check | `core/aqi.ts`, `server/air/geocode.ts` | `aqi.test.ts`, `geocode.test.ts` |
| Tailored to lifestyle | Commute mode, distance and days, exercise habit, home, cooking fuel, incense, smoking, winter heating, mask | `shared/profile.ts` | `profile.test.ts` |
| Clearly explaining the impact | Every measurable card shows the engine's numbers and the rest a benefit level; AI text with a number the grounding check cannot match to the plan is replaced by standard guidance, and every text says which it is | `server/ai/grounding.ts`, `core/explain/*` | `grounding.test.ts`, `e2e/flow.spec.ts` |

## What the judges look for

| Expectation | How SmogSense meets it |
| --- | --- |
| Logical decision making from context | A pure engine turns the forecast and the household into a ranked plan: index, most-sensitive member, severity, inversion, candidates and ranking ([README](../README.md#approach-and-logic)) |
| Practical, real-world usability | Live data for any place (GPS or search), a one-click example family, a plan that works without the AI, English and Hindi, read-aloud, phones, shareable notices |
| Clearly explaining impact | Every measurable recommendation shows its own numbers (exposure cut, indoor PM2.5 before and after, CO₂ saved), and the AI may only quote them |
| Clean, maintainable code | [Code quality](CODE_QUALITY.md) |

The scenarios the engine is tested against (severe, very poor and moderate days, a household with
no sensitive members, a homebound senior, a US location and gaps in the data) are listed in
[Testing](TESTING.md#what-is-tested). What is not modelled yet is in the
[README's assumptions](../README.md#assumptions).
