/** The one in-memory cache: entries expire after a time-to-live, least recently used go first. */
export interface CacheOptions {
  readonly maxEntries: number;
  readonly ttlMs: number;
  /** Current time in milliseconds; injected so expiry can be tested. */
  readonly now: () => number;
}

/**
 * A small in-memory cache with a time-to-live per entry and least-recently-used eviction.
 * It lives as long as the server instance, so a cold start simply begins empty.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { readonly value: V; readonly expiresAt: number }>();
  private readonly loading = new Map<string, Promise<V>>();

  constructor(private readonly options: CacheOptions) {}

  /** The cached value, or undefined when missing or expired. Reading marks it recently used. */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    if (entry.expiresAt <= this.options.now()) {
      return undefined;
    }
    this.entries.set(key, entry);
    return entry.value;
  }

  /**
   * The cached value for a key, or a freshly loaded one. A loaded value is stored only when
   * `keep` accepts it, so a failure is never cached and the next call tries again. Callers that
   * ask for the same key while it loads share that one load.
   */
  async getOrLoad(key: string, load: () => Promise<V>, keep: (value: V) => boolean): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) {
      return hit;
    }
    const running = this.loading.get(key);
    if (running !== undefined) {
      return running;
    }
    const loaded = load()
      .then((value) => {
        if (keep(value)) {
          this.set(key, value);
        }
        return value;
      })
      .finally(() => {
        this.loading.delete(key);
      });
    this.loading.set(key, loaded);
    return loaded;
  }

  /** Store a value, evicting the least recently used entry when full. */
  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.options.now() + this.options.ttlMs });
    const oldest = this.entries.keys().next();
    if (this.entries.size > this.options.maxEntries && oldest.done !== true) {
      this.entries.delete(oldest.value);
    }
  }
}
