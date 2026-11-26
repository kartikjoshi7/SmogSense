/** Low-emission routines: exercise, commute protection, airing the home and driving habits. */
import { ACTION_BAND, COMMUTE_MODES, MASK_REDUCTION } from '../constants.js';
import { commutes, dailyCommuteDoseUg } from '../emissions.js';
import { reduction } from '../exposure.js';
import { candidate, type Candidate, type PlanContext } from './context.js';
import { exerciseCandidates } from './exercise.js';

/** On smoggy days, an N95 on the daily commute — with the dose it saves on each round trip. */
function commuteProtection(ctx: PlanContext): Candidate[] {
  const { commute, mask } = ctx.profile;
  if (!commutes(commute) || mask === 'n95' || ctx.index.band < ACTION_BAND.commuteMask) {
    return [];
  }
  const dose = (reductionShare: number): number =>
    dailyCommuteDoseUg(commute.mode, commute.oneWayKm, ctx.commutePm25, reductionShare);
  const saved = reduction(dose(MASK_REDUCTION[mask]), dose(MASK_REDUCTION.n95));
  return [
    candidate(
      {
        id: 'commute_protection',
        category: 'routine',
        effort: 'low',
        memberIds: [],
        impact: {
          exposureReductionPct: saved.percent,
          doseBeforeUg: saved.before,
          doseAfterUg: saved.after,
        },
        facts: {
          mode: commute.mode,
          currentMask: mask,
          oneWayKm: commute.oneWayKm,
          departHour: commute.departHour,
          returnHour: commute.returnHour,
        },
      },
      [commute.departHour, commute.returnHour],
    ),
  ];
}

/** Air the home for a few minutes at the cleanest daylight hour, then close up again. */
function ventilateBriefly(ctx: PlanContext): Candidate[] {
  const cleanest = ctx.ventilation;
  if (cleanest === null) {
    return [];
  }
  return [
    candidate(
      {
        id: 'ventilate_briefly',
        category: 'routine',
        effort: 'low',
        memberIds: [],
        impact: { level: 'low' },
        facts: { hour: cleanest.hour, pm25: Math.round(cleanest.pm25) },
      },
      [cleanest.hour],
    ),
  ];
}

/** Low-emission driving habits for households that drive themselves. */
function drivingHabits(ctx: PlanContext): Candidate[] {
  if (!COMMUTE_MODES[ctx.profile.commute.mode].isPrivateMotor) {
    return [];
  }
  const habit = (id: 'engine_off_at_signals' | 'combine_errands'): Candidate =>
    candidate({
      id,
      category: 'routine',
      effort: 'low',
      memberIds: [],
      impact: { level: 'low' },
      facts: { mode: ctx.profile.commute.mode },
    });
  return [habit('engine_off_at_signals'), habit('combine_errands')];
}

/** Low-emission, low-exposure changes to the daily routine. */
export function routineCandidates(ctx: PlanContext): Candidate[] {
  return [
    ...exerciseCandidates(ctx),
    ...commuteProtection(ctx),
    ...ventilateBriefly(ctx),
    ...drivingHabits(ctx),
  ];
}
