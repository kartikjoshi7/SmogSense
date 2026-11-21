import { buildPlan } from '../core/plan.js';
import type { Location } from '../shared/api.js';
import type { Plan } from '../shared/plan.js';
import type { Profile } from '../shared/profile.js';
import type { AirService } from './air/air-service.js';
import type { PlanFailure } from './http/errors.js';
import type { Result } from './result.js';

/** Fetch (cached) air data for the location and run the decision engine on it. */
export async function loadPlan(
  air: AirService,
  profile: Profile,
  location: Location,
): Promise<Result<Plan, PlanFailure>> {
  const data = await air.getAir(location);
  return data.ok ? buildPlan(profile, data.value) : data;
}
