/**
 * Domain coefficients for the SmogSense engine — the only place numbers live, one file per topic
 * in `constants/`.
 * Values marked "estimate" are rounded simplifications for planning guidance, not
 * measurements; docs/ARCHITECTURE.md › Assumptions behind the numbers lists each one with its
 * source.
 */
export * from './constants/air.js';
export * from './constants/exposure.js';
export * from './constants/indoor.js';
export * from './constants/actions.js';
