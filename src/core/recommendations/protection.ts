/** Personal protection: masks, care for sensitive members and local emergency rules. */
import { ACTION_BAND, MASK_REDUCTION, NCR_BOUNDS } from '../constants.js';
import { reduction } from '../exposure.js';
import { candidate, type Candidate, type PlanContext } from './context.js';

/** Upgrade to a fitted N95 for any time outdoors, with how much more PM2.5 it stops. */
function n95Outdoors(ctx: PlanContext): Candidate[] {
  const { mask } = ctx.profile;
  const sensitiveAtRisk =
    ctx.sensitiveIds.length > 0 && ctx.index.band >= ACTION_BAND.alertSensitive;
  if (mask === 'n95' || (ctx.index.band < ACTION_BAND.maskEveryone && !sensitiveAtRisk)) {
    return [];
  }
  const leakNow = Math.round((1 - MASK_REDUCTION[mask]) * 100);
  const leakN95 = Math.round((1 - MASK_REDUCTION.n95) * 100);
  const change = reduction(leakNow, leakN95);
  return [
    candidate({
      id: 'n95_outdoors',
      category: 'protection',
      effort: 'low',
      memberIds: [],
      impact: { exposureReductionPct: change.percent },
      facts: { currentMask: mask, inhaledShareNowPct: leakNow, inhaledShareN95Pct: leakN95 },
    }),
  ];
}

/**
 * Personal precautions for the sensitive members: children, seniors, and anyone with a heart or
 * lung condition or a pregnancy.
 */
function sensitiveMembers(ctx: PlanContext): Candidate[] {
  if (ctx.sensitiveIds.length === 0 || ctx.index.band < ACTION_BAND.alertSensitive) {
    return [];
  }
  return [
    candidate({
      id: 'sensitive_members',
      category: 'protection',
      effort: 'low',
      memberIds: [...ctx.sensitiveIds],
      impact: { level: 'high' },
      facts: { outdoorAdvice: ctx.advice, indexValue: ctx.index.value },
    }),
  ];
}

function inNcr(lat: number, lon: number): boolean {
  return (
    lat >= NCR_BOUNDS.latMin &&
    lat <= NCR_BOUNDS.latMax &&
    lon >= NCR_BOUNDS.lonMin &&
    lon <= NCR_BOUNDS.lonMax
  );
}

/**
 * In Delhi NCR on very poor days, check the current GRAP stage (rules change, so none are
 * hard-coded).
 */
function ncrGrapCheck(ctx: PlanContext): Candidate[] {
  if (ctx.index.band < ACTION_BAND.grapCheck || !inNcr(ctx.air.lat, ctx.air.lon)) {
    return [];
  }
  return [
    candidate({
      id: 'ncr_grap_check',
      category: 'protection',
      effort: 'low',
      memberIds: [],
      impact: { level: 'medium' },
      facts: { indexValue: ctx.index.value },
    }),
  ];
}

/** Personal protection: masks, alerts for sensitive members and local emergency rules. */
export function protectionCandidates(ctx: PlanContext): Candidate[] {
  return [...n95Outdoors(ctx), ...sensitiveMembers(ctx), ...ncrGrapCheck(ctx)];
}
