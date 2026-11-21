import { z } from 'zod';
import { airDataSchema, type AirData, type HourlyReading } from '../../shared/air.js';
import type { Location } from '../../shared/api.js';
import { fetchJson, type FetchFailure, type HttpDeps } from '../http/fetch-json.js';
import { fail, ok, type Result } from '../../core/result.js';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
/** Yesterday (for the trailing 24-hour index) plus a two-day forecast. */
const TIME_RANGE = { past_days: '1', forecast_days: '2', timezone: 'auto' } as const;

const series = z.array(z.number().nullable());

const airQualityResponseSchema = z.object({
  utc_offset_seconds: z.number().int(),
  timezone: z.string(),
  hourly: z.object({
    time: z.array(z.string()),
    pm2_5: series,
    pm10: series,
    nitrogen_dioxide: series,
    ozone: series,
    carbon_monoxide: series,
    sulphur_dioxide: series,
  }),
});
type AirQualityResponse = z.infer<typeof airQualityResponseSchema>;

const forecastResponseSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    boundary_layer_height: series,
    wind_speed_10m: series,
  }),
  daily: z.object({ sunrise: z.array(z.string()), sunset: z.array(z.string()) }),
});
type ForecastResponse = z.infer<typeof forecastResponseSchema>;

/** Why air data could not be produced: an upstream failure, or data that does not cover "now". */
export type AirFailure = FetchFailure | 'stale';

export interface AirDeps extends HttpDeps {
  readonly now: () => Date;
}

function url(base: string, location: Location, params: Record<string, string>): URL {
  const result = new URL(base);
  result.search = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    ...params,
    ...TIME_RANGE,
  }).toString();
  return result;
}

function valueAt(values: readonly (number | null)[], index: number | undefined): number | null {
  return index === undefined ? null : (values[index] ?? null);
}

function mergeHourly(aq: AirQualityResponse, forecast: ForecastResponse): HourlyReading[] {
  const weatherIndex = new Map(forecast.hourly.time.map((time, i) => [time, i]));
  return aq.hourly.time.map((time, i) => {
    const w = weatherIndex.get(time);
    return {
      time,
      hour: Number(time.slice(11, 13)),
      pm25: valueAt(aq.hourly.pm2_5, i),
      pm10: valueAt(aq.hourly.pm10, i),
      no2: valueAt(aq.hourly.nitrogen_dioxide, i),
      o3: valueAt(aq.hourly.ozone, i),
      co: valueAt(aq.hourly.carbon_monoxide, i),
      so2: valueAt(aq.hourly.sulphur_dioxide, i),
      blhM: valueAt(forecast.hourly.boundary_layer_height, w),
      windKmh: valueAt(forecast.hourly.wind_speed_10m, w),
    };
  });
}

/** `YYYY-MM-DDTHH:00` for the current hour at a UTC offset, in Open-Meteo's local-time format. */
function localHourStamp(now: Date, utcOffsetSeconds: number): string {
  return `${new Date(now.getTime() + utcOffsetSeconds * 1000).toISOString().slice(0, 13)}:00`;
}

/**
 * Merge the air-quality and weather responses into one validated `AirData`, with `nowIndex`
 * pointing at the current local hour. Fails as "stale" when the data does not cover now.
 */
function normalizeAirData(
  aq: AirQualityResponse,
  forecast: ForecastResponse,
  location: Location,
  now: Date,
): Result<AirData, AirFailure> {
  const hourly = mergeHourly(aq, forecast);
  const nowIndex = hourly.findIndex((h) => h.time === localHourStamp(now, aq.utc_offset_seconds));
  if (nowIndex === -1) {
    return fail('stale');
  }
  const daylight = forecast.daily.sunrise.flatMap((sunrise, i) => {
    const sunset = forecast.daily.sunset[i];
    return sunset === undefined ? [] : [{ sunrise, sunset }];
  });
  const parsed = airDataSchema.safeParse({
    ...location,
    timezone: aq.timezone,
    hourly,
    daylight,
    nowIndex,
  });
  return parsed.success ? ok(parsed.data) : fail('invalid_response');
}

/** Fetch air quality and weather for a location from Open-Meteo, in parallel. */
export async function fetchAirData(
  location: Location,
  deps: AirDeps,
): Promise<Result<AirData, AirFailure>> {
  const [aq, forecast] = await Promise.all([
    fetchJson(
      url(AIR_QUALITY_URL, location, {
        hourly: 'pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide',
      }),
      airQualityResponseSchema,
      deps,
    ),
    fetchJson(
      url(FORECAST_URL, location, {
        hourly: 'boundary_layer_height,wind_speed_10m',
        daily: 'sunrise,sunset',
      }),
      forecastResponseSchema,
      deps,
    ),
  ]);
  if (!aq.ok) {
    return aq;
  }
  if (!forecast.ok) {
    return forecast;
  }
  return normalizeAirData(aq.value, forecast.value, location, deps.now());
}
