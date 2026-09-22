/**
 * Shared types for the SSB PxWebApi v2 ETL layer.
 *
 * SSB's json-stat2 output represents missing/special cells with a `status`
 * code instead of putting anything meaningful in `value` (which is `null`
 * for those cells). The official legend (data.ssb.no API docs) defines
 * three distinct codes:
 *
 *   "."   Category not applicable
 *   ".."  Data not available
 *   ":"   Confidential (suppressed to prevent identifying individuals/firms)
 *
 * These three cases are NOT interchangeable for an app about socioeconomic
 * gradients: a confidential cell hides a real (rounded) number for privacy
 * reasons, while "not applicable"/"not available" usually just mean the
 * cross-section doesn't exist or wasn't surveyed. Collapsing all three to
 * `null` (and rendering that as "0" or an empty bar) would misrepresent the
 * data, so we keep them as a discriminated union all the way through the
 * stack instead of normalizing early.
 */
export type SsbCell =
  | { kind: "value"; value: number }
  | { kind: "not-applicable" } // status "."
  | { kind: "not-available" } // status ".."
  | { kind: "confidential" }; // status ":"

/** A single category within one dimension (e.g. Region code "03" / "Oslo"). */
export interface SsbCategory {
  code: string;
  label: string;
}

/** Metadata for one dimension of a parsed table (e.g. "Region", "Tid"). */
export interface SsbDimension {
  label: string;
  categories: SsbCategory[];
}

/**
 * Fully decoded table: dimension metadata plus every cell.
 *
 * `cells` is flat and row-major over `dimensionOrder` (the last dimension
 * varies fastest), exactly as json-stat2 lays out its `value` array and as
 * the snapshot stores it on disk. A cell's coordinates are therefore *not*
 * stored per cell: they are implied by its position and computed on demand
 * by the index arithmetic in src/lib/ssb/layout.ts, which is what
 * `selectCell` uses. Materialising a `Record<string, string>` per cell would
 * repeat the dimension codes ~35k times on table 14882 for no added
 * information, and measurably so: decoding that snapshot costs 0.47ms /
 * 2.1MB of heap without them against 6.36ms / 6.6MB with (measured
 * 2026-09-22).
 */
export interface ParsedTable {
  tableId: string;
  /** Dimension order as returned by the API (matches the json-stat2 `id` array). */
  dimensionOrder: string[];
  dimensions: Record<string, SsbDimension>;
  cells: SsbCell[];
}
