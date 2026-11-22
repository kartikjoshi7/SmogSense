import type {
  Level,
  RecommendationCategory,
  RecommendationId,
} from '../../shared/recommendation.js';
import type { CommuteAlternative } from '../../shared/profile.js';
import { ACTION_BAND, ACTIVE_ALTERNATIVES, SMOKY_FUELS } from '../constants.js';
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

/**
 * A swap that saves CO₂ is a sustainable alternative. One that only cuts the commute dose (walking
 * to the metro, say) is protection, offered only on days smoggy enough to protect the commute.
 */
function swapCategory(ctx: PlanContext, swap: CommuteSwap): RecommendationCategory | null {
  if (swap.co2SavedKgPerWeek > 0) {
    return 'alternative';
  }
  return ctx.index.band >= ACTION_BAND.commuteMask ? 'protection' : null;
}

function swapCandidate(
  ctx: PlanContext,
  swap: CommuteSwap,
  category: RecommendationCategory,
): Candidate {
  const { mode, oneWayKm, daysPerWeek } = ctx.profile.commute;
  return candidate({
    id: SWAP_ID[swap.alternative],
    category,
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
 * Sustainable alternatives: commute swaps the household can make and cleaner cooking fuel, plus,
 * on smoggy days, swaps that only cut the commute dose. Walking and cycling are left out on days
 * when exertion outdoors is unsafe.
 */
export function alternativeCandidates(ctx: PlanContext): Candidate[] {
  const unsafe = outdoorExertionUnsafe(ctx.advice, ctx.severity);
  const swaps = commuteSwaps(ctx.profile.commute, ctx.ambientPm25)
    .filter((s) => !(unsafe && ACTIVE_ALTERNATIVES.includes(s.alternative)))
    .flatMap((s) => {
      const category = swapCategory(ctx, s);
      return category === null ? [] : [swapCandidate(ctx, s, category)];
    });
  return [...swaps, ...cleanCookingFuel(ctx)];
}
