import type { Level, RecommendationOf } from '../../shared/plan.js';
import { PURIFIER_NIGHT_HOUR, SMOKY_FUELS } from '../constants.js';
import { reduction } from '../exposure.js';
import { indoorHacks, type IndoorHack, type IndoorHackId } from '../indoor.js';
import { candidate, type Candidate, type PlanContext } from './context.js';

const HACK_EFFORT: Readonly<Record<IndoorHackId, Level>> = {
  run_purifier: 'low',
  seal_gaps: 'medium',
  keep_windows_shut: 'low',
  stop_incense: 'low',
  no_indoor_smoking: 'high',
  safer_heating: 'medium',
};

function hackCandidate(ctx: PlanContext, hack: IndoorHack): Candidate {
  const { home } = ctx.profile;
  const change = reduction(hack.before, hack.after);
  const common: Pick<
    RecommendationOf<IndoorHackId>,
    'category' | 'effort' | 'memberIds' | 'impact'
  > = {
    category: 'indoor',
    effort: HACK_EFFORT[hack.id],
    memberIds: [],
    impact: {
      exposureReductionPct: change.percent,
      indoorBeforeUgM3: change.before,
      indoorAfterUgM3: change.after,
    },
  };
  const facts = { outdoorPm25: Math.round(ctx.ambientPm25), roomAreaM2: home.roomAreaM2 };
  if (hack.id === 'safer_heating') {
    return candidate({ ...common, id: hack.id, facts: { ...facts, heating: hack.heating } });
  }
  if (hack.id !== 'run_purifier') {
    return candidate({ ...common, id: hack.id, facts });
  }
  return candidate(
    {
      ...common,
      id: hack.id,
      // Buying a purifier is a bigger step than switching on one the family already has.
      effort: home.purifierCount === 0 ? 'high' : common.effort,
      facts: { ...facts, purifiersOwned: home.purifierCount },
    },
    [PURIFIER_NIGHT_HOUR],
  );
}

/** Cooking smoke advice: always worth it on biomass or kerosene, or without an exhaust. */
function cookingVentilation(ctx: PlanContext): Candidate[] {
  const { cookingFuel, hasExhaustOrChimney } = ctx.profile.home;
  const smoky = SMOKY_FUELS.includes(cookingFuel);
  if (!smoky && hasExhaustOrChimney) {
    return [];
  }
  return [
    candidate({
      id: 'cooking_ventilation',
      category: 'indoor',
      effort: 'low',
      memberIds: [],
      impact: { level: smoky ? 'high' : 'medium' },
      facts: { cookingFuel, hasExhaust: hasExhaustOrChimney },
    }),
  ];
}

const wetMopping: Candidate = candidate({
  id: 'wet_mopping',
  category: 'indoor',
  effort: 'low',
  memberIds: [],
  impact: { level: 'low' },
  facts: {},
});

/** Indoor air hacks with before/after estimates for the family's main room. */
export function indoorAirCandidates(ctx: PlanContext): Candidate[] {
  const hacks = indoorHacks(ctx.profile.home, ctx.ambientPm25).map((h) => hackCandidate(ctx, h));
  return [...hacks, ...cookingVentilation(ctx), wetMopping];
}
