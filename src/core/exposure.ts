export interface DoseInput {
  /** Ambient PM2.5, µg/m³. */
  readonly concentration: number;
  readonly hours: number;
  /** Inhalation rate, m³/h. */
  readonly breathingM3h: number;
  /** In-transit or indoor concentration relative to ambient (1 = ambient). */
  readonly exposureMultiplier?: number;
  /** Breathing volume relative to an adult (1 = adult). */
  readonly ageFactor?: number;
  /** Share removed by a mask, 0–1. */
  readonly maskReduction?: number;
}

export interface Reduction {
  readonly before: number;
  readonly after: number;
  /** Percentage drop from before to after; negative when exposure rises. */
  readonly percent: number;
}

/**
 * PM2.5 inhaled, in µg: concentration × exposure multiplier × breathing rate × age factor ×
 * hours × (1 − mask reduction), rounded to 0.1 µg.
 */
export function inhaledDoseUg(input: DoseInput): number {
  const {
    concentration,
    hours,
    breathingM3h,
    exposureMultiplier = 1,
    ageFactor = 1,
    maskReduction = 0,
  } = input;
  const dose =
    concentration * exposureMultiplier * breathingM3h * ageFactor * hours * (1 - maskReduction);
  return Math.round(dose * 10) / 10;
}

/** Before, after and the percentage drop between them (0 when there was nothing to reduce). */
export function reduction(before: number, after: number): Reduction {
  const percent = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
  return { before, after, percent };
}
