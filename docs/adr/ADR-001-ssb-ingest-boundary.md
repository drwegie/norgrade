# ADR-001: Fetch SSB data at ingest time, never from the request path

- Status: Accepted
- Date: 2026-09-22

## Context

The app visualises the socioeconomic gradient in Norwegian school outcomes
using Statistics Norway (SSB) PxWebApi v2 tables `11689`, `13716`, `13717`
and `14882`.

Measured facts (verified against the API and SSB's own documentation on
2026-09-22):

- The API is free and needs no authentication, but is limited to
  **30 requests per minute, per IP address**, and 800,000 data cells per
  extract. On Vercel the outbound IP can be shared with other tenants, so
  their traffic counts against the same budget.
- The underlying data is **published annually**. Table `14882` was last
  updated 2026-07-20.
- Retrieving the entire dataset costs **four requests**.
- No user input is ever an API argument; the dimension combinations are
  finite and can be enumerated ahead of time.
- Next.js 16 does not solve this for us: `fetch` is not cached by default,
  and `use cache` stores entries in-memory with the same per-instance limits.

A process-local TTL cache was written first. It does not bound the per-IP
rate: under serverless each instance holds its own map, so N instances can
make N times the requests. The failure mode is worse than a simple
multiplier, because hit rate is inversely correlated with the load that
makes the limit dangerous -- a traffic spike starts cold instances that all
miss at once, exactly when we are closest to 30/min. At that point the
client would throw on a 429 and the page would 500, with no stale fallback.

## Decision

**All SSB HTTP traffic happens at ingest time (build step or script).
Request-path code never calls `fetchTable`. The runtime SSB request count is
a constant zero.**

- Ingest writes results into the persistence layer; the app reads only from
  that layer. This matches the already-agreed split of "writes via
  `service_role`, reads via `anon` under RLS". If cloud persistence is not
  approved, ingest commits a JSON snapshot instead -- the decision survives
  either branch, because it depends only on not calling SSB at request time.
- `src/lib/ssb/cache.ts` is scoped to deduplicating queries **within one
  ingest run**. It is documented as such and is not described as a
  rate-limit mechanism.
- Ingest asserts that the set of regions classified as `current` equals an
  explicitly enumerated expected set, and fails loudly on unknown codes.

### Rejected: keep runtime fetching and harden the cache

Normalising the cache key and joining in-flight requests are both real
improvements, but neither changes the per-instance nature of the cache. This
option leaves the runtime request count unbounded and the app dependent on
SSB being up while serving traffic.

### Rejected: add a distributed cache (Vercel KV / Upstash)

This mitigates a problem that should not exist rather than removing it. It
adds an account (needing separate approval), a free-tier constraint and a new
failure mode, in exchange for making an unnecessary runtime dependency
safer. "We do not call the API at runtime because the data is annual" is a
simpler and more defensible position than "we call it at runtime but cache
it in Redis".

## Consequences

**Good**

- Exposure to the rate limit disappears structurally rather than being
  reduced.
- An SSB outage has zero user impact: the shipped artefact already contains
  the data.
- Data updates become a reviewable diff.

**Bad**

- Updates do not propagate automatically. Refreshing the data is an
  explicit, roughly annual ingest-plus-deploy step, and a failed ingest has
  to be re-run by hand.
- The snapshot taken at ingest time is canonical. If SSB revises an earlier
  year, the app keeps showing the old figures until the next ingest.

**Accepted limitation**

- Users cannot request arbitrary dimension combinations; only the ones
  enumerated at ingest time are available. If that stops being acceptable,
  this ADR needs revisiting.

## Related

- Region handling and the historical/current boundary split:
  `src/lib/ssb/region.ts`. The classifier infers "current" from the absence
  of a `(-YYYY)` suffix, which is a negative inference and the reason for
  the ingest-time assertion above.
- Data licence (CC BY 4.0) and attribution: see README.
