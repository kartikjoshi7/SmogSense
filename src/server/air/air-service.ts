import type { AirData } from '../../shared/air.js';
import type { Location, Place } from '../../shared/api.js';
import { TtlCache } from '../cache.js';
import { SETTINGS } from '../config.js';
import type { FetchFailure } from '../http/fetch-json.js';
import { roundTo } from '../../core/numbers.js';
import type { Result } from '../../core/result.js';
import type { UiLanguage } from '../../shared/languages.js';
import { searchPlaces } from './geocode.js';
import { fetchAirData, type AirFailure } from './open-meteo.js';

/** Air data and place search, cached so repeated requests do not hit Open-Meteo. */
export interface AirService {
  getAir(location: Location): Promise<Result<AirData, AirFailure>>;
  searchPlaces(query: string, lang: UiLanguage): Promise<Result<Place[], FetchFailure>>;
}

export interface AirServiceDeps {
  readonly fetch: typeof fetch;
  readonly now: () => Date;
}

/** Round to 0.1° (about 11 km): enough for city-scale air data, and less precise than GPS. */
function roundLocation(location: Location): Location {
  return {
    lat: roundTo(location.lat, SETTINGS.coordinateDecimals),
    lon: roundTo(location.lon, SETTINGS.coordinateDecimals),
  };
}

/** Only successful lookups are cached; a failure is tried again on the next request. */
const succeeded = (result: { readonly ok: boolean }): boolean => result.ok;

/** Create the air service with its caches; dependencies are injected for testing. */
export function createAirService(deps: AirServiceDeps): AirService {
  const clock = (): number => deps.now().getTime();
  const http = {
    fetch: deps.fetch,
    timeoutMs: SETTINGS.upstreamTimeoutMs,
    retries: SETTINGS.upstreamRetries,
  };
  const airCache = new TtlCache<Result<AirData, AirFailure>>({
    maxEntries: SETTINGS.cacheMaxEntries,
    ttlMs: SETTINGS.airCacheTtlMs,
    now: clock,
  });
  const placeCache = new TtlCache<Result<Place[], FetchFailure>>({
    maxEntries: SETTINGS.cacheMaxEntries,
    ttlMs: SETTINGS.geocodeCacheTtlMs,
    now: clock,
  });

  return {
    getAir(location) {
      const rounded = roundLocation(location);
      const hour = deps.now().toISOString().slice(0, 13);
      return airCache.getOrLoad(
        [rounded.lat, rounded.lon, hour].join(':'),
        () => fetchAirData(rounded, { ...http, now: deps.now }),
        succeeded,
      );
    },
    searchPlaces(query, lang) {
      return placeCache.getOrLoad(
        [lang, query.toLowerCase()].join(':'),
        () => searchPlaces(query, lang, http),
        succeeded,
      );
    },
  };
}
