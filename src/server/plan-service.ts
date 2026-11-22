import { buildPlan } from '../core/plan.js';
import type { Result } from '../core/result.js';
import type { Location } from '../shared/api.js';
import type { Plan } from '../shared/plan.js';
import type { Profile } from '../shared/profile.js';
import type { AirService } from './air/air-service.js';
import type { AirFailure } from './air/open-meteo.js';

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
