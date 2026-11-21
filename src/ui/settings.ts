/** Browser-side runtime settings: every operational number the UI uses lives here. */
export const UI_SETTINGS = {
  /** How long to wait for a GPS fix before suggesting city search instead. */
  geolocationTimeoutMs: 10_000,
  /** Accept a cached position up to this old; the server rounds it to 0.1° anyway. */
  geolocationMaxAgeMs: 600_000,
} as const;
