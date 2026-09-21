/**
 * Process-local cache for parsed SSB responses.
 *
 * This cache does NOT bound SSB's rate limit, and must not be described as
 * if it did. SSB's PxWebApi v2 allows 30 requests/minute *per IP address*,
 * but this cache is scoped to a single warm server process / lambda
 * instance. Under serverless, each instance holds its own Map, so N
 * instances can issue up to N times the outbound requests. Worse, the hit
 * rate is inversely correlated with the load that makes the rate limit
 * dangerous: when traffic spikes and new instances spin up cold, every one
 * of them misses -- precisely when we are closest to the limit.
 *
 * What actually bounds the request rate is the ingest boundary: SSB is only
 * called from ingest (build/script time), never from the request path, so
 * the runtime request count is a constant zero. See
 * docs/adr/ADR-001-ssb-ingest-boundary.md.
 *
 * The role of this module is therefore narrow: deduplicating repeated
 * queries *within a single ingest run*. It is not a rate-limit control and
 * not a durable cache.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Test-only helper to reset cache state between test cases. */
export function clearCache(): void {
  store.clear();
}
