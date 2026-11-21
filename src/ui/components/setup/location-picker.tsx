import { useId, useState } from 'react';
import type { Place } from '../../../shared/api.js';
import { PLACE_QUERY_CHARS } from '../../../shared/limits.js';
import {
  isSearchable,
  useLocationSearch,
  type SearchStatus,
} from '../../hooks/use-location-search.js';
import { useMessages } from '../../state/app-context.js';
import type { SavedLocation } from '../../state/storage.js';

function placeLabel(place: Place): string {
  return [place.name, place.region, place.country].filter((part) => part !== null).join(', ');
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

/**
 * What the live status line says: progress or a problem first (even when a place is already
 * chosen, as when editing a household), then the chosen place, then nothing.
 */
function statusText(
  t: LocationText,
  state: { value: SavedLocation | null; status: SearchStatus; found: number; invalid: boolean },
): string {
  const progress: Partial<Record<SearchStatus, string>> = {
    searching: t.searching,
    locating: t.locating,
    denied: t.denied,
    failed: t.searchFailed,
  };
  const noMatches = state.status === 'done' && state.found === 0 ? t.noResults : undefined;
  const news = progress[state.status] ?? noMatches;
  if (news !== undefined) {
    return news;
  }
  if (state.value !== null) {
    return t.chosen(state.value.label);
  }
  return state.invalid ? t.required : '';
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
            maxLength={PLACE_QUERY_CHARS.max}
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
            disabled={!isSearchable(query)}
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
