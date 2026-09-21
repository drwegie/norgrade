/**
 * Process-local cache for parsed SSB responses.
 *
 * SSB's PxWebApi v2 limits requests to 30/minute *per IP address*. On
 * Vercel, serverless functions can share an outbound IP with other
 * tenants, so our own usage plus theirs could exhaust the limit even
 * with light traffic. This app's underlying data (school grades,
 * completion rates) is also only published annually, so aggressively
 * caching is both safe and necessary.
 *
 * This is intentionally a simple in-memory TTL cache, not a distributed
 * one: it's scoped to a single warm server process/lambda instance. That
 * is enough to deduplicate repeated requests within a burst (e.g. several
 * chart panels on one page fetching overlapping tables) and to survive
 * across requests as long as the instance stays warm. A persistent cache
 * (e.g. Supabase, file, or Vercel KV) is out of scope for this increment.
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
