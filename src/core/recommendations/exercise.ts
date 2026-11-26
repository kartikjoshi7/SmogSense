/** Exercise advice: the cleanest daylight window, or indoors when outdoors is unsafe. */
import { DECIMALS, MIN_WORTHWHILE_REDUCTION_PCT } from '../constants.js';
import { exerciseDoseUg, reduction } from '../exposure.js';
import { currentRoom, indoorPm25 } from '../indoor.js';
import { roundTo } from '../numbers.js';
import { outdoorExertionUnsafe } from '../risk.js';
import { candidate, type Candidate, type PlanContext } from './context.js';

function exerciserIds(ctx: PlanContext): string[] {
  const id = ctx.profile.exercise.memberId;
  return id === null ? [] : [id];
}

function exerciseDose(ctx: PlanContext, concentration: number): number {
  return exerciseDoseUg(ctx.profile.exercise, ctx.profile.members, concentration);
}

function exerciseIndoors(ctx: PlanContext): Candidate {
  const { usualHour, durationMin, canMoveIndoors } = ctx.profile.exercise;
  // Doses use the window mean (2 decimals), as the what-if slider does; the quoted fact is whole.
  const outdoorMean = ctx.exerciseWindow?.usualMeanPm25 ?? ctx.ambientPm25;
  const outdoor = roundTo(outdoorMean, DECIMALS.quotedPm25);
  const indoor = indoorPm25(currentRoom(ctx.profile.home, outdoorMean));
  const dose = reduction(exerciseDose(ctx, outdoorMean), exerciseDose(ctx, indoor));
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
          usualPm25: roundTo(usualMeanPm25, DECIMALS.quotedPm25),
          bestPm25: roundTo(window.meanPm25, DECIMALS.quotedPm25),
        },
      },
      [window.startHour],
    ),
  ];
}

/** Move exercise to the cleanest daylight window, or indoors when outdoor exertion is unsafe. */
export function exerciseCandidates(ctx: PlanContext): Candidate[] {
  if (ctx.profile.exercise.activity === 'none') {
    return [];
  }
  if (outdoorExertionUnsafe(ctx.advice, ctx.severity)) {
    return [exerciseIndoors(ctx)];
  }
  return exerciseAtCleanWindow(ctx);
}
