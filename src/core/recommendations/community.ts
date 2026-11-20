import { ACTION_BAND } from '../constants.js';
import { candidate, type Candidate, type PlanContext } from './context.js';

/** Actions for neighbours, schools and housing societies, not only the household. */
export function communityCandidates(ctx: PlanContext): Candidate[] {
  const { band, value } = ctx.index;
  const result: Candidate[] = [];
  if (band >= ACTION_BAND.checkOnNeighbours) {
    result.push(
      candidate({
        id: 'check_on_neighbours',
        category: 'community',
        effort: 'low',
        memberIds: [],
        impact: { level: 'medium' },
        facts: { indexValue: value },
      }),
    );
  }
  if (band >= ACTION_BAND.reportOpenBurning) {
    result.push(
      candidate({
        id: 'report_open_burning',
        category: 'community',
        effort: 'low',
        memberIds: [],
        impact: { level: 'medium' },
        facts: {},
      }),
    );
  }
  result.push(
    candidate({
      id: 'share_notice',
      category: 'community',
      effort: 'low',
      memberIds: [],
      impact: { level: 'low' },
      facts: { indexValue: value },
    }),
  );
  return result;
}
