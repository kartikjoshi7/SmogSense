import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { z } from 'zod';

/** Parsed JSON of a recorded Open-Meteo response in `src/server/air/fixtures`. */
function fixture(name: string): unknown {
  const url = new URL(`../air/fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

const airQualityShape = z.looseObject({
  hourly: z.looseObject({ pm2_5: z.array(z.number().nullable()) }),
});
const forecastShape = z.looseObject({
  hourly: z.looseObject({ time: z.array(z.string()) }),
  daily: z.looseObject({ sunset: z.array(z.string()) }),
});

/** A fresh, editable copy of the recorded air-quality response. */
export function airQualityFixture() {
  return airQualityShape.parse(fixture('delhi-air-quality'));
}

/** A fresh, editable copy of the recorded forecast response. */
export function forecastFixture() {
  return forecastShape.parse(fixture('delhi-forecast'));
}

/** A JSON response with the given status. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 06:30 in Delhi on 21 Nov 2026 — inside the recorded fixtures (index 30). */
export const FIXTURE_NOW = new Date('2026-11-21T01:00:00Z');

/** The URL a fetch call was made with, whatever form it was passed in. */
export function requestUrl(input: Parameters<typeof fetch>[0] | undefined): URL {
  if (input === undefined) {
    throw new Error('fetch was not called');
  }
  return input instanceof Request ? new URL(input.url) : new URL(input);
}

/** A fetch that answers Open-Meteo hosts with the recorded Delhi fixtures. */
export function openMeteoFetch() {
  return vi.fn<typeof fetch>((input) => {
    const host = requestUrl(input).host;
    const body: Record<string, string> = {
      'air-quality-api.open-meteo.com': 'delhi-air-quality',
      'api.open-meteo.com': 'delhi-forecast',
      'geocoding-api.open-meteo.com': 'geocode-gurugram',
    };
    const name = body[host];
    return Promise.resolve(
      name === undefined ? jsonResponse({}, 404) : jsonResponse(fixture(name)),
    );
  });
}
