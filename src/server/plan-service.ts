/** Loads a household's plan: cached air data for the place, then the decision engine. */
import { buildPlan } from '../core/plan.js';
import type { Result } from '../core/result.js';
import type { Location } from '../shared/api.js';
import type { Plan } from '../shared/plan.js';
import type { Profile } from '../shared/profile.js';
import type { AirService } from './air/air-service.js';
import type { AirFailure } from './air/open-meteo.js';
import { digestOf } from './hash.js';

/** Every way loading a plan can fail before any AI is involved. */
export type PlanFailure = AirFailure | 'insufficient_data';

/** Fetch (cached) air data for the location and run the decision engine on it. */
export async function loadPlan(
  air: AirService,
  profile: Profile,
  location: Location,
): Promise<Result<Plan, PlanFailure>> {
  const data = await air.getAir(location);
  return data.ok ? buildPlan(profile, data.value) : data;
}

/**
 * The key of one plan. The plan and its explanation come from separate requests, and the air data
 * can change in between, so each reply carries the key of the plan it belongs to.
 */
export function planKey(plan: Plan): string {
  return digestOf('plan', plan);
}
