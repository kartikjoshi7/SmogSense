import type { OutdoorAdvice } from '../../shared/plan.js';
import {
  ACTION_BAND,
  AGE_FACTOR,
  COMMUTE_MODES,
  EXERCISE_BREATHING_M3H,
  MASK_REDUCTION,
  MIN_WORTHWHILE_REDUCTION_PCT,
} from '../constants.js';
import { dailyCommuteDoseUg } from '../emissions.js';
import { inhaledDoseUg, reduction } from '../exposure.js';
import { currentRoom, indoorPm25 } from '../indoor.js';
import { candidate, type Candidate, type PlanContext } from './context.js';

const MOVE_INDOORS: ReadonlySet<OutdoorAdvice> = new Set(['avoid', 'stay_indoors']);

function exerciserIds(ctx: PlanContext): string[] {
  const id = ctx.profile.exercise.memberId;
  return id === null ? [] : [id];
}

/** PM2.5 inhaled during one exercise session at a given concentration, for whoever exercises. */
function exerciseDose(ctx: PlanContext, concentration: number): number {
  const { activity, durationMin, memberId } = ctx.profile.exercise;
  const member = ctx.profile.members.find((m) => m.id === memberId);
  return inhaledDoseUg({
    concentration,
    hours: durationMin / 60,
    breathingM3h: EXERCISE_BREATHING_M3H[activity],
    ageFactor: member === undefined ? 1 : AGE_FACTOR[member.ageGroup],
  });
}

function exerciseIndoors(ctx: PlanContext): Candidate {
  const { usualHour, durationMin, canMoveIndoors } = ctx.profile.exercise;
  const outdoor = Math.round(ctx.exerciseWindow?.usualMeanPm25 ?? ctx.ambientPm25);
  const indoor = indoorPm25(currentRoom(ctx.profile.home, outdoor));
  const dose = reduction(exerciseDose(ctx, outdoor), exerciseDose(ctx, indoor));
  return candidate(
    {
      id: 'exercise_indoors',
      category: 'routine',
      effort: canMoveIndoors ? 'low' : 'medium',
      memberIds: exerciserIds(ctx),
      impact: {
        exposureReductionPct: dose.percent,
        doseBeforeUg: dose.before,
        doseAfterUg: dose.after,
      },
      facts: { usualHour, durationMin, outdoorPm25: outdoor, indoorPm25: indoor },
    },
    [usualHour],
  );
}

function exerciseAtCleanWindow(ctx: PlanContext): Candidate[] {
  const window = ctx.exerciseWindow;
  if (window === null) {
    return [];
  }
  const { usualMeanPm25, reductionPct } = window;
  if (
    usualMeanPm25 === null ||
    reductionPct === null ||
    reductionPct < MIN_WORTHWHILE_REDUCTION_PCT
  ) {
    return [];
  }
  const dose = reduction(exerciseDose(ctx, usualMeanPm25), exerciseDose(ctx, window.meanPm25));
  const { usualHour, durationMin } = ctx.profile.exercise;
  return [
    candidate(
      {
        id: 'exercise_window',
        category: 'routine',
        effort: 'low',
        memberIds: exerciserIds(ctx),
        impact: {
          exposureReductionPct: dose.percent,
          doseBeforeUg: dose.before,
          doseAfterUg: dose.after,
        },
        facts: {
          usualHour,
          bestHour: window.startHour,
          durationMin,
          usualPm25: Math.round(usualMeanPm25),
          bestPm25: Math.round(window.meanPm25),
        },
      },
      [window.startHour],
    ),
  ];
}

/** Move exercise to the cleanest daylight window, or indoors when outdoor exertion is unsafe. */
function exercise(ctx: PlanContext): Candidate[] {
  if (ctx.profile.exercise.activity === 'none') {
    return [];
  }
  if (MOVE_INDOORS.has(ctx.advice) || ctx.severity === 'emergency') {
    return [exerciseIndoors(ctx)];
  }
  return exerciseAtCleanWindow(ctx);
}

/** On smoggy days, an N95 on the daily commute — with the dose it saves on each round trip. */
function commuteProtection(ctx: PlanContext): Candidate[] {
  const { commute, mask } = ctx.profile;
  const commutes = commute.mode !== 'none' && commute.daysPerWeek > 0 && commute.oneWayKm > 0;
  if (!commutes || mask === 'n95' || ctx.index.band < ACTION_BAND.commuteMask) {
    return [];
  }
  const dose = (reductionShare: number): number =>
    dailyCommuteDoseUg(commute.mode, commute.oneWayKm, ctx.ambientPm25, reductionShare);
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
    ...exercise(ctx),
    ...commuteProtection(ctx),
    ...ventilateBriefly(ctx),
    ...drivingHabits(ctx),
  ];
}
