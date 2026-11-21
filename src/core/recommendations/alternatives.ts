import type { Level, RecommendationId } from '../../shared/plan.js';
import type { CommuteAlternative } from '../../shared/profile.js';
import { ACTIVE_ALTERNATIVES, SMOKY_FUELS } from '../constants.js';
import { commuteSwaps, type CommuteSwap } from '../emissions.js';
import { outdoorExertionUnsafe } from '../risk.js';
import { candidate, type Candidate, type PlanContext } from './context.js';

const SWAP_ID = {
  metro: 'switch_to_metro',
  bus: 'switch_to_bus',
  carpool: 'carpool',
  cycle: 'switch_to_cycle',
  walk: 'switch_to_walk',
  wfh: 'work_from_home',
} as const satisfies Readonly<Record<CommuteAlternative, RecommendationId>>;

const SWAP_EFFORT: Readonly<Record<CommuteAlternative, Level>> = {
  metro: 'medium',
  bus: 'medium',
  carpool: 'medium',
  cycle: 'high',
  walk: 'medium',
  wfh: 'low',
};

function swapCandidate(ctx: PlanContext, swap: CommuteSwap): Candidate {
  const { mode, oneWayKm, daysPerWeek } = ctx.profile.commute;
  return candidate({
    id: SWAP_ID[swap.alternative],
    category: 'alternative',
    effort: SWAP_EFFORT[swap.alternative],
    memberIds: [],
    impact: {
      co2SavedKgPerWeek: swap.co2SavedKgPerWeek,
      exposureReductionPct: swap.exposureReductionPct,
    },
    facts: { mode, oneWayKm, daysPerWeek },
  });
}

/** Switching away from biomass or kerosene cooking: the largest household-smoke cut available. */
function cleanCookingFuel(ctx: PlanContext): Candidate[] {
  const { cookingFuel } = ctx.profile.home;
  if (!SMOKY_FUELS.includes(cookingFuel)) {
    return [];
  }
  return [
    candidate({
      id: 'clean_cooking_fuel',
      category: 'alternative',
      effort: 'high',
      memberIds: [],
      impact: { level: 'high' },
      facts: { cookingFuel },
    }),
  ];
}

/**
 * Sustainable alternatives: commute swaps the household can make and cleaner cooking fuel.
 * Walking and cycling are left out on days when exertion outdoors is unsafe.
 */
export function alternativeCandidates(ctx: PlanContext): Candidate[] {
  const unsafe = outdoorExertionUnsafe(ctx.advice, ctx.severity);
  const swaps = commuteSwaps(ctx.profile.commute, ctx.ambientPm25)
    .filter((s) => !(unsafe && ACTIVE_ALTERNATIVES.includes(s.alternative)))
    .map((s) => swapCandidate(ctx, s));
  return [...swaps, ...cleanCookingFuel(ctx)];
}
