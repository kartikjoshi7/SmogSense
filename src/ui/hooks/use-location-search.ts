/** City search and GPS lookup, each with its own status. */
import { useRef, useState } from 'react';
import { geocodeQuerySchema, type Place } from '../../shared/api.js';
import { api } from '../api/client.js';
import { UI_SETTINGS } from '../settings.js';
import { useAppState } from '../state/app-context.js';
import type { SavedLocation } from '../state/storage.js';

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
  const running = useRef<AbortController | null>(null);

  const search = async (query: string) => {
    if (!isSearchable(query)) {
      return;
    }
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setStatus('searching');
    const result = await api.geocode(query.trim(), lang, controller.signal);
    if (controller.signal.aborted) {
      return;
    }
    setPlaces(result.ok ? result.value.places : []);
    setStatus(result.ok ? 'done' : 'failed');
  };

  const locate = () => {
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
