/** City search and GPS lookup, each with its own status. */
import { useState } from 'react';
import { geocodeQuerySchema, type Place } from '../../shared/api.js';
import { api } from '../api/client.js';
import { UI_SETTINGS } from '../settings.js';
import { useAppState } from '../state/app-context.js';
import type { SavedLocation } from '../state/storage.js';
import { useLatestRequest } from './use-latest-request.js';

export type SearchStatus = 'idle' | 'searching' | 'done' | 'failed' | 'locating' | 'denied';

/** Whether the server would accept a query: the same schema checks it on both sides. */
export function isSearchable(query: string): boolean {
  return geocodeQuerySchema.shape.q.safeParse(query).success;
}

/**
 * City search and GPS lookup, with a status for each stage. A new search cancels the one still
 * running, so an older answer never replaces a newer one.
 */
export function useLocationSearch(onLocate: (location: SavedLocation) => void) {
  const { lang } = useAppState();
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const nextSignal = useLatestRequest();

  const search = async (query: string) => {
    if (!isSearchable(query)) {
      return;
    }
    const signal = nextSignal();
    setStatus('searching');
    const result = await api.geocode(query.trim(), lang, signal);
    if (signal.aborted) {
      return;
    }
    setPlaces(result.ok ? result.value.places : []);
    setStatus(result.ok ? 'done' : 'failed');
  };

  const locate = () => {
    // Some browsers and embedded views have no geolocation at all: treat it like a refusal.
    if (!('geolocation' in navigator)) {
      setStatus('denied');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onLocate({ lat: coords.latitude, lon: coords.longitude, label: null });
        setStatus('idle');
      },
      () => {
        setStatus('denied');
      },
      { timeout: UI_SETTINGS.geolocationTimeoutMs, maximumAge: UI_SETTINGS.geolocationMaxAgeMs },
    );
  };

  return { places, status, search, locate };
}
