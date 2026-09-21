/**
 * Classification of SSB's "Region" (fylke) dimension.
 *
 * Norway's county (fylke) boundaries changed twice in the period covered by
 * these tables (2018/2019 regionreformen and the 2024 Trøndelag/Viken
 * de-mergers). SSB keeps every historical code in the API and marks
 * superseded ones with a "(-YYYY)" suffix directly in the category label
 * (e.g. "Østfold (-2019)"). Two codes are not geographic fylker at all:
 * Svalbard (21) has no municipal/fylke government, and Utlandet (25) means
 * "abroad". There is also one aggregate "01-99 I alt" (national total).
 *
 * If current-boundary and historical-boundary regions are drawn on the same
 * choropleth map, the result is nonsensical (e.g. old "Østfold" overlapping
 * current "Viken"/"Østfold" differently). We therefore classify every
 * region into a distinct kind so calling code is forced to pick one
 * boundary era instead of accidentally mixing them.
 */

export type RegionClassification =
  | { kind: "current"; code: string; label: string }
  | { kind: "historical"; code: string; label: string; supersededYear: number }
  | { kind: "non-geographic"; code: string; label: string }
  | { kind: "aggregate"; code: string; label: string };

// Not derivable from the label text alone ("Svalbard" reads like a normal
// place name), so these two codes are hardcoded domain knowledge.
const NON_GEOGRAPHIC_CODES = new Set(["21", "25"]);

// The "I alt" (total) pseudo-region SSB adds to every Region dimension.
const AGGREGATE_CODES = new Set(["01-99"]);

// Matches the "(-YYYY)" suffix SSB appends to labels of superseded fylker,
// e.g. "Østfold (-2019)" or "Sør-Trøndelag (-2017)".
const HISTORICAL_SUFFIX = /\(-(\d{4})\)\s*$/;

export function classifyRegion(code: string, label: string): RegionClassification {
  if (AGGREGATE_CODES.has(code)) {
    return { kind: "aggregate", code, label };
  }
  if (NON_GEOGRAPHIC_CODES.has(code)) {
    return { kind: "non-geographic", code, label };
  }
  const historicalMatch = label.match(HISTORICAL_SUFFIX);
  if (historicalMatch) {
    return { kind: "historical", code, label, supersededYear: Number(historicalMatch[1]) };
  }
  return { kind: "current", code, label };
}

/**
 * Splits a list of region categories into their four kinds. Consumers that
 * draw a map should read from exactly one of `current` / `historical` and
 * never combine them, which this shape encourages by construction.
 */
export function partitionRegions(
  categories: Array<{ code: string; label: string }>,
): {
  current: Extract<RegionClassification, { kind: "current" }>[];
  historical: Extract<RegionClassification, { kind: "historical" }>[];
  nonGeographic: Extract<RegionClassification, { kind: "non-geographic" }>[];
  aggregate: Extract<RegionClassification, { kind: "aggregate" }>[];
} {
  const current: Extract<RegionClassification, { kind: "current" }>[] = [];
  const historical: Extract<RegionClassification, { kind: "historical" }>[] = [];
  const nonGeographic: Extract<RegionClassification, { kind: "non-geographic" }>[] = [];
  const aggregate: Extract<RegionClassification, { kind: "aggregate" }>[] = [];

  for (const { code, label } of categories) {
    const classified = classifyRegion(code, label);
    switch (classified.kind) {
      case "current":
        current.push(classified);
        break;
      case "historical":
        historical.push(classified);
        break;
      case "non-geographic":
        nonGeographic.push(classified);
        break;
      case "aggregate":
        aggregate.push(classified);
        break;
    }
  }

  return { current, historical, nonGeographic, aggregate };
}
