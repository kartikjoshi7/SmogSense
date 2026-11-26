/** The decision engine's entry point: one household's ranked plan for the next 24 hours. */
import type { AirData, HourlyReading, Pollutants } from '../shared/air.js';
import type { IndexReading, Plan, TimelineEntry } from '../shared/plan.js';
import type { Profile } from '../shared/profile.js';
import { computeIndex } from './aqi.js';
import { commutePm25 } from './emissions.js';
import { analyzeInversion } from './inversion.js';
import { alternativeCandidates } from './recommendations/alternatives.js';
import { communityCandidates } from './recommendations/community.js';
import type { Candidate, PlanContext } from './recommendations/context.js';
import { indoorAirCandidates } from './recommendations/indoor-air.js';
import { protectionCandidates } from './recommendations/protection.js';
import { compareIds, rank } from './recommendations/rank.js';
import { routineCandidates } from './recommendations/routine.js';
import { ok, type Result } from './result.js';
import { sensitiveMemberIds, householdSensitivity, outdoorAdvice } from './risk.js';
import { severityMode } from './severity.js';
import { bestActivityWindow, cleanestDaylightHour, planHorizon } from './windows.js';

const NO_READING: Pollutants = { pm25: null, pm10: null, no2: null, o3: null, co: null, so2: null };

/**
 * Every pollutant's concentration at one hour of the data, or all null when that hour is missing.
 */
function pollutantsAt(hourly: readonly HourlyReading[], index: number): Pollutants {
  const reading = hourly[index];
  if (reading === undefined) {
    return NO_READING;
  }
  const { pm25, pm10, no2, o3, co, so2 } = reading;
  return { pm25, pm10, no2, o3, co, so2 };
}

function buildContext(profile: Profile, air: AirData, index: IndexReading): PlanContext {
  const sensitivity = householdSensitivity(profile.members);
  const { exercise } = profile;
  return {
    profile,
    air,
    index,
    sensitivity,
    advice: outdoorAdvice(index.band, sensitivity),
    severity: severityMode(index.band, sensitivity),
    sensitiveIds: sensitiveMemberIds(profile.members),
    ambientPm25: index.pm25Mean24h,
    commutePm25: commutePm25(profile.commute, air, index.pm25Mean24h),
    exerciseWindow:
      exercise.activity === 'none'
        ? null
        : bestActivityWindow(air.hourly, {
            fromIndex: air.nowIndex,
            daylight: air.daylight,
            durationMin: exercise.durationMin,
            usualHour: exercise.usualHour,
          }),
    cleanestHour: cleanestDaylightHour(air.hourly, air.nowIndex, air.daylight),
  };
}

/**
 * Timeline entries in the order their hours next come up in the forecast (tonight before
 * tomorrow morning); hours beyond the forecast go last.
 */
function timeline(
  candidates: readonly Candidate[],
  horizon: readonly HourlyReading[],
): TimelineEntry[] {
  const position = (hour: number): number => {
    const found = horizon.findIndex((h) => h.hour === hour);
    return found === -1 ? Number.POSITIVE_INFINITY : found;
  };
  return candidates
    .flatMap((c) => c.hours.map((hour) => ({ hour, recommendationId: c.recommendation.id })))
    .sort(
      (a, b) =>
        position(a.hour) - position(b.hour) || compareIds(a.recommendationId, b.recommendationId),
    );
}

/**
 * The household's plan for the next 24 hours: the local index, how strongly to react, and
 * ranked recommendations across routines, indoor air, alternatives, protection and community.
 */
export function buildPlan(profile: Profile, air: AirData): Result<Plan, 'insufficient_data'> {
  const index = computeIndex(air);
  if (!index.ok) {
    return index;
  }
  const ctx = buildContext(profile, air, index.value);
  const candidates = [
    ...routineCandidates(ctx),
    ...indoorAirCandidates(ctx),
    ...alternativeCandidates(ctx),
    ...protectionCandidates(ctx),
    ...communityCandidates(ctx),
  ];
  const horizon = planHorizon(air.hourly, air.nowIndex);
  return ok({
    index: ctx.index,
    current: pollutantsAt(air.hourly, air.nowIndex),
    severity: ctx.severity,
    householdSensitivity: ctx.sensitivity,
    outdoorAdvice: ctx.advice,
    inversion: analyzeInversion(air.hourly, air.nowIndex),
    cleanestHour: ctx.cleanestHour,
    forecast: horizon.map(({ time, hour, pm25 }) => ({ time, hour, pm25 })),
    recommendations: rank(
      candidates.map((c) => c.recommendation),
      { band: ctx.index.band, sensitivity: ctx.sensitivity, severity: ctx.severity },
    ),
    timeline: timeline(candidates, horizon),
  });
}
