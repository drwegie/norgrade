/**
 * The region display set for table 14882 (upper secondary completion).
 *
 * Table 14882 is reported in the **pre-2020 fylke division**: of the 17
 * regions that carry data in all six of the table's seven-year intervals,
 * 15 have a "(-2019)" or "(-2017)" suffix and so are classified
 * `historical` by src/lib/ssb/region.ts. Selecting `partitionRegions()
 * .current` would leave five regions and a Trøndelag that is empty in four
 * of the six intervals, so the display set here is `current` + `historical`
 * together, in SSB's own category order. (Measured over every cell of the
 * committed snapshot on 2026-09-22.)
 *
 * That leaves one genuine boundary handover *inside* the table, which this
 * module makes explicit rather than mixing silently:
 *
 *   Sør-Trøndelag (16) and Nord-Trøndelag (17) report the first four
 *   intervals (2014-2020 .. 2017-2023) and are "." (not applicable) in the
 *   last two; the merged Trøndelag (50) is the exact mirror image.
 *
 * The two eras are never added together -- adding two published percentages
 * is not a published figure, and this app does not recompute SSB's numbers.
 * Instead a region is dropped from the display set for the intervals in
 * which it is not applicable, and `handover` reports which side of the
 * merger the selected interval falls on so the page can say so in words.
 *
 * "." is the only kind treated as "this region does not report here": ".."
 * (not available) and ":" (confidential) are cells that *should* exist, so
 * they stay in the set and are drawn as SSB's own marker.
 */

import { classifyRegion } from "./region";
import { selectCell } from "./select";
import type { ParsedTable, SsbCell } from "./types";

/**
 * Sør-Trøndelag and Nord-Trøndelag merged into Trøndelag on 2018-01-01.
 * Hardcoded domain knowledge, like the non-geographic codes in region.ts:
 * nothing in the API response links a predecessor code to its successor.
 */
export const TRONDELAG_MERGER = {
  predecessors: ["16", "17"],
  successor: "50",
} as const;

/** One region's cell, ready to be drawn as a bar. */
export interface RegionBar {
  code: string;
  /** SSB's own label, including any "(-YYYY)" boundary suffix. */
  label: string;
  cell: SsbCell;
}

/**
 * Which side of the Trøndelag merger the selected slice falls on:
 * `"predecessors"` = the two old counties report, `"successor"` = the merged
 * county reports, `"both"`/`"none"` = neither of the two expected shapes,
 * which would mean the table changed and the page should say nothing
 * definite.
 */
export type TrondelagHandover = "predecessors" | "successor" | "both" | "none";

export interface CompletionRegions {
  /** Geographic regions that report this slice, in SSB's category order. */
  bars: RegionBar[];
  /** Geographic regions dropped because this slice is "." for them. */
  notApplicable: RegionBar[];
  handover: TrondelagHandover;
}

/**
 * Builds the region bars for one slice of table 14882. `at` must fix every
 * dimension except `Region` (`selectCell` refuses a partial coordinate).
 */
export function completionRegions(
  table: ParsedTable,
  at: Record<string, string>,
): CompletionRegions {
  const bars: RegionBar[] = [];
  const notApplicable: RegionBar[] = [];

  for (const { code, label } of table.dimensions.Region.categories) {
    const classified = classifyRegion(code, label);
    // Drops the "I alt" aggregate, Svalbard and Abroad: neither of the last
    // two is a fylke, and the total is not a region to compare against.
    if (classified.kind !== "current" && classified.kind !== "historical") {
      continue;
    }
    const cell = selectCell(table, { ...at, Region: code });
    (cell.kind === "not-applicable" ? notApplicable : bars).push({ code, label, cell });
  }

  const present = new Set(bars.map((bar) => bar.code));
  const hasPredecessors = TRONDELAG_MERGER.predecessors.some((code) => present.has(code));
  const hasSuccessor = present.has(TRONDELAG_MERGER.successor);
  const handover: TrondelagHandover =
    hasPredecessors && hasSuccessor
      ? "both"
      : hasPredecessors
        ? "predecessors"
        : hasSuccessor
          ? "successor"
          : "none";

  return { bars, notApplicable, handover };
}
