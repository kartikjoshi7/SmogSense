import { z } from 'zod';
import { ok, type Result } from '../../core/result.js';
import type { Place } from '../../shared/api.js';
import type { UiLanguage } from '../../shared/languages.js';
import { SETTINGS } from '../config.js';
import { fetchJson, type FetchFailure, type HttpDeps } from '../http/fetch-json.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const geocodingResponseSchema = z.object({
  /** Absent when nothing matches. */
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
});

/** Search Open-Meteo's place names for a city or town, labelled in the interface language. */
export async function searchPlaces(
  query: string,
  lang: UiLanguage,
  deps: HttpDeps,
): Promise<Result<Place[], FetchFailure>> {
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({
    name: query,
    count: String(SETTINGS.geocodeResults),
    language: lang,
    format: 'json',
  }).toString();
  const response = await fetchJson(url, geocodingResponseSchema, deps);
  if (!response.ok) {
    return response;
  }
  const places = (response.value.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1 ?? null,
    country: r.country ?? null,
    lat: r.latitude,
    lon: r.longitude,
  }));
  return ok(places);
}
