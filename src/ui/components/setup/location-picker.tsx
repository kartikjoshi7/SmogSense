import { useId, useState } from 'react';
import type { Place } from '../../../shared/api.js';
import { api } from '../../api/client.js';
import { useMessages } from '../../state/app-context.js';
import type { SavedLocation } from '../../state/storage.js';

type SearchStatus = 'idle' | 'searching' | 'done' | 'failed' | 'locating' | 'denied';

function placeLabel(place: Place): string {
  return [place.name, place.region, place.country].filter((part) => part !== null).join(', ');
}

/** City search and GPS lookup, with a status for each stage. */
function useLocationSearch(onChange: (location: SavedLocation) => void, myLocationLabel: string) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');

  const search = async (query: string) => {
    setStatus('searching');
    const result = await api.geocode(query.trim());
    setPlaces(result.ok ? result.data.places : []);
    setStatus(result.ok ? 'done' : 'failed');
  };

  const locate = () => {
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ lat: coords.latitude, lon: coords.longitude, label: myLocationLabel });
        setStatus('idle');
      },
      () => {
        setStatus('denied');
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  };

  return { places, status, search, locate };
}

function PlaceResults({
  places,
  chooseLabel,
  onPick,
}: {
  readonly places: readonly Place[];
  readonly chooseLabel: (place: string) => string;
  readonly onPick: (location: SavedLocation) => void;
}) {
  return (
    <ul className="grid gap-2">
      {places.map((place) => (
        <li key={`${place.lat},${place.lon}`}>
          <button
            type="button"
            className="btn-secondary w-full text-left"
            onClick={() => {
              onPick({ lat: place.lat, lon: place.lon, label: placeLabel(place) });
            }}
          >
            {chooseLabel(placeLabel(place))}
          </button>
        </li>
      ))}
    </ul>
  );
}

type LocationText = ReturnType<typeof useMessages>['setup']['location'];

/** What the live status line says: the chosen place, progress, a problem, or nothing. */
function statusText(
  t: LocationText,
  state: { value: SavedLocation | null; status: SearchStatus; found: number; invalid: boolean },
): string {
  if (state.value !== null) {
    return t.chosen(state.value.label);
  }
  const progress: Partial<Record<SearchStatus, string>> = {
    searching: t.searching,
    locating: t.locating,
    denied: t.denied,
    failed: t.noResults,
  };
  const noMatches = state.status === 'done' && state.found === 0 ? t.noResults : undefined;
  return progress[state.status] ?? noMatches ?? (state.invalid ? t.required : '');
}

/** Choose a location by GPS or by searching for a city; the choice is announced politely. */
export function LocationPicker({
  value,
  onChange,
  invalid,
}: {
  readonly value: SavedLocation | null;
  readonly onChange: (location: SavedLocation) => void;
  readonly invalid: boolean;
}) {
  const t = useMessages().setup.location;
  const inputId = useId();
  const [query, setQuery] = useState('');
  const { places, status, search, locate } = useLocationSearch(onChange, t.myLocation);
  const announcement = statusText(t, { value, status, found: places.length, invalid });

  return (
    <fieldset className="card grid gap-3">
      <legend className="text-lg font-semibold">{t.legend}</legend>
      <button type="button" className="btn-secondary justify-self-start" onClick={locate}>
        {t.useMine}
      </button>
      <div className="field">
        <label htmlFor={inputId}>{t.search}</label>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="search"
            className="flex-1"
            value={query}
            maxLength={60}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void search(query);
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={query.trim().length < 2}
            onClick={() => void search(query)}
          >
            {t.searchButton}
          </button>
        </div>
      </div>
      <PlaceResults places={places} chooseLabel={t.choose} onPick={onChange} />
      <p role="status" className={invalid && value === null ? 'field-error' : 'muted'}>
        {announcement}
      </p>
    </fieldset>
  );
}
