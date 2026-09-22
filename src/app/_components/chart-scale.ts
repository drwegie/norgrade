/**
 * Y-axis scaling, shared by the line chart and the region bar chart so the
 * two never disagree about what a "round" axis is.
 *
 * Takes `SsbCell`s rather than numbers because that is what the rest of the
 * app carries (src/lib/ssb/types.ts): a special value has no position on
 * the scale and must not be allowed to contribute a 0 to it either.
 */

import type { SsbCell } from "@/lib/ssb/types";

const TICK_COUNT = 4;

/** Gridline spacings considered "round" when picking the scale. */
const TICK_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10];

export { TICK_COUNT };

/**
 * Smallest upper bound at or above the largest plotted value that divides
 * into `TICK_COUNT` round gridlines, so the axis reads "0, 6, 12, 18, 24"
 * rather than "0, 6.25, 12.5, ...".
 *
 * The axis always starts at 0. A truncated axis would exaggerate the very
 * gradient this app exists to report, so differences are shown at their
 * true proportion even when that makes them look small.
 */
export function niceMax(cells: Iterable<SsbCell>): number {
  let max = 0;
  for (const cell of cells) {
    if (cell.kind === "value" && cell.value > max) max = cell.value;
  }
  if (max <= 0) return 1;
  const rough = max / TICK_COUNT;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = (TICK_STEPS.find((candidate) => candidate * magnitude >= rough) ?? 10) * magnitude;
  return step * TICK_COUNT;
}

/** The marker SSB itself prints for a special value, plus its meaning. */
export function specialValueMarker(cell: SsbCell): { symbol: string; meaning: string } | null {
  switch (cell.kind) {
    case "value":
      return null;
    case "not-applicable":
      return { symbol: ".", meaning: "category not applicable" };
    case "not-available":
      return { symbol: "..", meaning: "data not available" };
    case "confidential":
      return { symbol: ":", meaning: "confidential" };
  }
}
