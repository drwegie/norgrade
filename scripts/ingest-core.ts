/**
 * Pure logic extracted from scripts/ingest.ts for testability.
 *
 * Nothing in this module performs I/O (no fetch, no fs, no process.stdout):
 * it only transforms `ParsedTable` values already fetched by the caller.
 * scripts/ingest.ts imports from here and stays the only place that
 * actually talks to the network or the filesystem, per
 * docs/adr/ADR-001-ssb-ingest-boundary.md.
 */

import { partitionRegions } from "../src/lib/ssb/region";
import type { ParsedTable, SsbCell } from "../src/lib/ssb/types";

export interface TableSpec {
  tableId: string;
  /**
   * Every dimension of the table, requested with "*" (all categories).
   * Dimensions must be listed explicitly: a `valueCodes[...]` entry naming a
   * dimension the table does not have is rejected with HTTP 400
   * ("Non-existent variable"), so one shared selector for all tables is not
   * possible. Measured 2026-09-22.
   */
  valueCodes: Record<string, string>;
  /**
   * Region codes expected to classify as `current`, or `null` for tables
   * with no Region dimension at all. Both cases are asserted: a table that
   * gains or loses its Region dimension fails the run just like a changed
   * code set does.
   *
   * The values below were derived from src/lib/ssb/region.ts (which records
   * five unsuffixed fylker: Oslo, Rogaland, Møre og Romsdal, Trøndelag,
   * Nordland) and then confirmed against the live API on 2026-09-22:
   * table 14882's Region dimension has 23 categories, of which exactly
   * "03" (Oslo - Oslove), "11" (Rogaland), "15" (Møre og Romsdal),
   * "18" (Nordland - Nordlánnda) and "50" (Trøndelag - Trööndelage) carry
   * no "(-YYYY)" suffix.
   */
  expectedCurrentRegions: string[] | null;
}

export const TABLES: TableSpec[] = [
  {
    tableId: "11689",
    valueCodes: {
      ContentsCode: "*",
      ForeldrUtd: "*",
      Kjonn: "*",
      Poeng: "*",
      Tid: "*",
    },
    expectedCurrentRegions: null,
  },
  {
    tableId: "13716",
    valueCodes: {
      ContentsCode: "*",
      ForeldrUtd: "*",
      Husinntekt2: "*",
      Kjonn: "*",
      Tid: "*",
    },
    expectedCurrentRegions: null,
  },
  {
    tableId: "13717",
    valueCodes: {
      ContentsCode: "*",
      ForeldrUtd: "*",
      Kjonn: "*",
      Tid: "*",
      Yrkesaktive: "*",
    },
    expectedCurrentRegions: null,
  },
  {
    tableId: "14882",
    valueCodes: {
      ContentsCode: "*",
      FullforingVGO: "*",
      Kjonn: "*",
      Poeng: "*",
      Region: "*",
      Tid: "*",
    },
    expectedCurrentRegions: ["03", "11", "15", "18", "50"],
  },
];

/**
 * On-disk cell encoding: a plain number for a real value, or SSB's own
 * status marker for the three special values ("." not applicable, ".." not
 * available, ":" confidential — the legend documented in
 * src/lib/ssb/types.ts). Storing each cell's coordinates instead would
 * repeat the dimension codes ~35k times on table 14882 for no added
 * information: cells are written in the same flat, row-major order the
 * parser produced them in, which `dimensionOrder` + `dimensions` decode.
 */
export type EncodedCell = number | "." | ".." | ":";

export function encodeCell(cell: SsbCell): EncodedCell {
  switch (cell.kind) {
    case "value":
      return cell.value;
    case "not-applicable":
      return ".";
    case "not-available":
      return "..";
    case "confidential":
      return ":";
  }
}

export interface SpecialValueCounts {
  notApplicable: number;
  notAvailable: number;
  confidential: number;
}

/**
 * Counts all three special-value kinds, always reporting every kind even
 * when it is zero. ":" (confidential) has not been observed in any of these
 * four tables so far, but ingest must not be written as if it could not
 * appear.
 */
export function countSpecialValues(table: ParsedTable): SpecialValueCounts {
  const counts: SpecialValueCounts = { notApplicable: 0, notAvailable: 0, confidential: 0 };
  for (const cell of table.cells) {
    switch (cell.kind) {
      case "not-applicable":
        counts.notApplicable++;
        break;
      case "not-available":
        counts.notAvailable++;
        break;
      case "confidential":
        counts.confidential++;
        break;
      case "value":
        break;
    }
  }
  return counts;
}

/**
 * Compares the regions the classifier called `current` against the
 * enumerated expectation. Returns a list of human-readable problems; empty
 * means the table passed.
 */
export function assertCurrentRegions(table: ParsedTable, expected: string[] | null): string[] {
  const regionDimension = table.dimensions.Region;

  if (expected === null) {
    if (regionDimension) {
      return [
        `table ${table.tableId} unexpectedly has a Region dimension ` +
          `(${regionDimension.categories.length} categories); ` +
          `expectedCurrentRegions must be updated before this data can be trusted`,
      ];
    }
    return [];
  }

  if (!regionDimension) {
    return [`table ${table.tableId} has no Region dimension, but ${expected.length} current regions were expected`];
  }

  const { current } = partitionRegions(regionDimension.categories);
  const actualCodes = new Set(current.map((region) => region.code));
  const expectedCodes = new Set(expected);

  const added = [...actualCodes].filter((code) => !expectedCodes.has(code)).sort();
  const removed = [...expectedCodes].filter((code) => !actualCodes.has(code)).sort();

  if (added.length === 0 && removed.length === 0) {
    return [];
  }

  const labelOf = (code: string) =>
    regionDimension.categories.find((category) => category.code === code)?.label ?? "<not in response>";

  const problems: string[] = [];
  if (added.length > 0) {
    problems.push(
      `table ${table.tableId}: unexpected "current" regions: ` +
        added.map((code) => `${code} (${labelOf(code)})`).join(", "),
    );
  }
  if (removed.length > 0) {
    problems.push(
      `table ${table.tableId}: expected "current" regions missing from the response: ` +
        removed.map((code) => `${code} (${labelOf(code)})`).join(", "),
    );
  }
  return problems;
}

/**
 * Serializes a snapshot deterministically: object keys are emitted in a
 * fixed order (dimensions follow `dimensionOrder`, which is the API's own
 * dimension order and part of the data), and no timestamp or other
 * clock-derived field is written, so re-running ingest on unchanged data
 * yields a byte-identical file.
 */
export function serializeSnapshot(table: ParsedTable): string {
  const dimensions: Record<string, { label: string; categories: Array<{ code: string; label: string }> }> = {};
  for (const dimensionName of table.dimensionOrder) {
    const dimension = table.dimensions[dimensionName];
    dimensions[dimensionName] = {
      label: dimension.label,
      categories: dimension.categories.map(({ code, label }) => ({ code, label })),
    };
  }

  const snapshot = {
    tableId: table.tableId,
    dimensionOrder: table.dimensionOrder,
    dimensions,
    // Flat, row-major (last dimension varies fastest), same order as the
    // json-stat2 `value` array and as ParsedTable.cells.
    cells: table.cells.map(encodeCell),
  };

  return `${JSON.stringify(snapshot, null, 2)}\n`;
}
