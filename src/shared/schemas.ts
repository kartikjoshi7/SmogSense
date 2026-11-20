import { z } from 'zod';

/** AQI category names used throughout the app. */
export const aqiCategorySchema = z.enum([
  'good',
  'moderate',
  'unhealthy-sensitive',
  'unhealthy',
  'very-unhealthy',
  'hazardous',
]);

export type AqiCategory = z.infer<typeof aqiCategorySchema>;
