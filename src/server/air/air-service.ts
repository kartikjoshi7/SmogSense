import type { AirData } from '../../shared/air.js';
import type { Location, Place } from '../../shared/api.js';
import { TtlCache } from '../cache.js';
import { SETTINGS } from '../config.js';
import type { FetchFailure } from '../http/fetch-json.js';
import { ok, type Result } from '../result.js';
import { searchPlaces } from './geocode.js';
import { fetchAirData, type AirFailure } from './open-meteo.js';

/** Air data and place search, cached so repeated requests do not hit Open-Meteo. */
export interface AirService {
  getAir(location: Location): Promise<Result<AirData, AirFailure>>;
  searchPlaces(query: string): Promise<Result<Place[], FetchFailure>>;
}

export interface AirServiceDeps {
  readonly fetch: typeof fetch;
  readonly now: () => Date;
}

/** Round to 0.1° (about 11 km): enough for city-scale air data, and less precise than GPS. */
export function roundLocation(location: Location): Location {
  const factor = 10 ** SETTINGS.coordinateDecimals;
  return {
    lat: Math.round(location.lat * factor) / factor,
    lon: Math.round(location.lon * factor) / factor,
  };
}

/** Run `load` on a cache miss and keep only successful results. */
async function cached<T, E>(
  cache: TtlCache<T>,
  key: string,
  load: () => Promise<Result<T, E>>,
): Promise<Result<T, E>> {
  const hit = cache.get(key);
  if (hit !== undefined) {
    return ok(hit);
  }
  const result = await load();
  if (result.ok) {
    cache.set(key, result.value);
  }
  return result;
}

/** Create the air service with its caches; dependencies are injected for testing. */
export function createAirService(deps: AirServiceDeps): AirService {
  const clock = (): number => deps.now().getTime();
  const http = {
    fetch: deps.fetch,
    timeoutMs: SETTINGS.upstreamTimeoutMs,
    retries: SETTINGS.upstreamRetries,
  };
  const airCache = new TtlCache<AirData>({
    maxEntries: SETTINGS.cacheMaxEntries,
    ttlMs: SETTINGS.airCacheTtlMs,
    now: clock,
  });
  const placeCache = new TtlCache<Place[]>({
    maxEntries: SETTINGS.cacheMaxEntries,
    ttlMs: SETTINGS.geocodeCacheTtlMs,
    now: clock,
  });

  return {
    getAir(location) {
      const rounded = roundLocation(location);
      const hour = deps.now().toISOString().slice(0, 13);
      return cached(airCache, [rounded.lat, rounded.lon, hour].join(':'), () =>
        fetchAirData(rounded, { ...http, now: deps.now }),
      );
    },
    searchPlaces(query) {
      return cached(placeCache, query.toLowerCase(), () => searchPlaces(query, http));
    },
  };
}
