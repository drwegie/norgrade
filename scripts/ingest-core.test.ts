/**
 * Tests for the pure logic in scripts/ingest-core.ts.
 *
 * scripts/ingest.ts itself is deliberately not imported here: it runs
 * `main()` as a top-level side effect on import (it talks to the network
 * and the filesystem), which is exactly why the pure parts were split out
 * into ingest-core.ts. These tests build `ParsedTable` values directly
 * (mirroring the shape src/lib/ssb/parser.ts produces) instead of going
 * through json-stat2 fixtures, since assertCurrentRegions/countSpecialValues
 * /serializeSnapshot all operate on the already-parsed table, not on the
 * raw API response.
 */
import { describe, expect, it } from "vitest";
import {
  assertCurrentRegions,
  countSpecialValues,
  encodeCell,
  serializeSnapshot,
  TABLES,
} from "./ingest-core";
import type { ParsedTable, SsbCategory } from "../src/lib/ssb/types";

function region(code: string, label: string): SsbCategory {
  return { code, label };
}

/** Builds a minimal ParsedTable with an optional Region dimension. */
function buildTable(options: {
  tableId?: string;
  regionCategories?: SsbCategory[];
  cells?: ParsedTable["cells"];
}): ParsedTable {
  const { tableId = "test", regionCategories, cells = [] } = options;

  const dimensionOrder = regionCategories ? ["Region"] : [];
  const dimensions: ParsedTable["dimensions"] = regionCategories
    ? { Region: { label: "region", categories: regionCategories } }
    : {};

  return { tableId, dimensionOrder, dimensions, cells };
}

describe("assertCurrentRegions", () => {
  const REAL_14882_REGIONS: SsbCategory[] = [
    region("01-99", "I alt"),
    region("01", "Østfold (-2019)"),
    region("03", "Oslo"),
    region("11", "Rogaland"),
    region("15", "Møre og Romsdal"),
    region("18", "Nordland"),
    region("50", "Trøndelag"),
    region("21", "Svalbard"),
  ];
  const EXPECTED_14882 = ["03", "11", "15", "18", "50"];

  it("returns no problems when the actual current-code set exactly matches the expectation", () => {
    const table = buildTable({ tableId: "14882", regionCategories: REAL_14882_REGIONS });

    expect(assertCurrentRegions(table, EXPECTED_14882)).toEqual([]);
  });

  it("reports an unknown current code with its code and label when one appears that isn't expected", () => {
    // Simulate SSB unsuffixing a code that used to be historical, or adding
    // a brand-new unsuffixed fylke code -- both look like a new "current" code.
    const regions = [...REAL_14882_REGIONS, region("99", "Nyfylke")];
    const table = buildTable({ tableId: "14882", regionCategories: regions });

    const problems = assertCurrentRegions(table, EXPECTED_14882);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/unexpected "current" regions/);
    expect(problems[0]).toContain("99 (Nyfylke)");
    // Must not also claim something is missing when nothing is missing.
    expect(problems[0]).not.toMatch(/missing/);
  });

  it("reports an expected code as missing when it disappears from the response entirely", () => {
    const regions = REAL_14882_REGIONS.filter((r) => r.code !== "50");
    const table = buildTable({ tableId: "14882", regionCategories: regions });

    const problems = assertCurrentRegions(table, EXPECTED_14882);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/expected "current" regions missing from the response/);
    // The code is gone from the response, so its label can't be looked up there.
    expect(problems[0]).toContain("50 (<not in response>)");
  });

  it("reports both an unexpected addition and a missing removal in the same run", () => {
    const regions = [
      ...REAL_14882_REGIONS.filter((r) => r.code !== "50"),
      region("99", "Nyfylke"),
    ];
    const table = buildTable({ tableId: "14882", regionCategories: regions });

    const problems = assertCurrentRegions(table, EXPECTED_14882);

    expect(problems).toHaveLength(2);
    const [addedProblem, removedProblem] = problems;
    expect(addedProblem).toMatch(/unexpected "current" regions/);
    expect(addedProblem).toContain("99 (Nyfylke)");
    expect(removedProblem).toMatch(/missing from the response/);
    expect(removedProblem).toContain("50 (<not in response>)");
  });

  it("passes for a table declared to have no Region dimension (expectedCurrentRegions: null) when none is present", () => {
    const table = buildTable({ tableId: "11689" });

    expect(assertCurrentRegions(table, null)).toEqual([]);
  });

  it("fails when a Region dimension unexpectedly shows up on a table declared to have none", () => {
    const table = buildTable({ tableId: "11689", regionCategories: REAL_14882_REGIONS });

    const problems = assertCurrentRegions(table, null);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("table 11689 unexpectedly has a Region dimension");
    expect(problems[0]).toContain(`(${REAL_14882_REGIONS.length} categories)`);
  });

  it("fails when a Region dimension is expected but absent", () => {
    const table = buildTable({ tableId: "14882" });

    const problems = assertCurrentRegions(table, EXPECTED_14882);

    expect(problems).toEqual([
      "table 14882 has no Region dimension, but 5 current regions were expected",
    ]);
  });

  it("declares no Region expectation for tables 11689, 13716 and 13717 (the ones with no Region dimension)", () => {
    const noRegionTables = TABLES.filter((t) => t.tableId !== "14882");
    expect(noRegionTables.map((t) => t.tableId).sort()).toEqual(["11689", "13716", "13717"]);
    for (const spec of noRegionTables) {
      expect(spec.expectedCurrentRegions).toBeNull();
    }
  });
});

describe("countSpecialValues", () => {
  it("counts all three special-value kinds, including the never-observed-in-production confidential one", () => {
    // Synthetic: ":" (confidential) has not been seen in any live response
    // for these four tables, so this case must be exercised with fixture
    // data rather than skipped.
    const table = buildTable({
      cells: [
        { kind: "value", value: 42 },
        { kind: "not-applicable" },
        { kind: "not-applicable" },
        { kind: "not-available" },
        { kind: "confidential" },
        { kind: "confidential" },
        { kind: "confidential" },
      ],
    });

    expect(countSpecialValues(table)).toEqual({
      notApplicable: 2,
      notAvailable: 1,
      confidential: 3,
    });
  });

  it("reports every kind as zero, not omitted, when a table has no special values at all", () => {
    const table = buildTable({
      cells: [
        { kind: "value", value: 1 },
        { kind: "value", value: 2 },
      ],
    });

    expect(countSpecialValues(table)).toEqual({
      notApplicable: 0,
      notAvailable: 0,
      confidential: 0,
    });
  });

  it("reports every kind as zero for an empty cell list", () => {
    const table = buildTable({ cells: [] });

    expect(countSpecialValues(table)).toEqual({
      notApplicable: 0,
      notAvailable: 0,
      confidential: 0,
    });
  });
});

describe("encodeCell", () => {
  it("encodes a value cell as a plain number", () => {
    expect(encodeCell({ kind: "value", value: 79.4 })).toBe(79.4);
  });

  it('encodes not-applicable as "."', () => {
    expect(encodeCell({ kind: "not-applicable" })).toBe(".");
  });

  it('encodes not-available as ".."', () => {
    expect(encodeCell({ kind: "not-available" })).toBe("..");
  });

  it('encodes confidential as ":"', () => {
    expect(encodeCell({ kind: "confidential" })).toBe(":");
  });
});

describe("serializeSnapshot", () => {
  function sampleTable(): ParsedTable {
    return {
      tableId: "14882",
      dimensionOrder: ["Region", "Tid"],
      dimensions: {
        Region: {
          label: "region",
          categories: [region("03", "Oslo"), region("50", "Trøndelag")],
        },
        Tid: {
          label: "year",
          categories: [region("2023", "2023"), region("2024", "2024")],
        },
      },
      cells: [
        // Row-major over [Region, Tid]: 03/2023, 03/2024, 50/2023, 50/2024.
        { kind: "value", value: 79.4 },
        { kind: "not-applicable" },
        { kind: "not-available" },
        { kind: "confidential" },
      ],
    };
  }

  it("produces byte-identical output for logically identical input built independently", () => {
    // Two separately-constructed tables with the same data but different
    // object literal insertion order for `dimensions`, to make sure the
    // output doesn't depend on incidental insertion order.
    const a = sampleTable();
    const b: ParsedTable = {
      tableId: "14882",
      dimensionOrder: ["Region", "Tid"],
      dimensions: {
        // Tid listed first here, Region first in sampleTable().
        Tid: { label: "year", categories: [region("2023", "2023"), region("2024", "2024")] },
        Region: {
          label: "region",
          categories: [region("03", "Oslo"), region("50", "Trøndelag")],
        },
      },
      cells: sampleTable().cells,
    };

    expect(serializeSnapshot(a)).toBe(serializeSnapshot(b));
  });

  it("re-running on the exact same input yields the exact same bytes", () => {
    expect(serializeSnapshot(sampleTable())).toBe(serializeSnapshot(sampleTable()));
  });

  it("emits dimension keys in dimensionOrder, not in the object's own key order", () => {
    const table = sampleTable();
    // Confirm the underlying object's own insertion order is NOT
    // dimensionOrder, so this test actually exercises the ordering logic
    // (dimensionOrder is ["Region", "Tid"]; object literal above also
    // happens to insert Region first, so rebuild with Tid first to be sure).
    const reordered: ParsedTable = {
      ...table,
      dimensions: { Tid: table.dimensions.Tid, Region: table.dimensions.Region },
    };

    const serialized = serializeSnapshot(reordered);
    const parsed = JSON.parse(serialized) as { dimensionOrder: string[]; dimensions: object };

    expect(parsed.dimensionOrder).toEqual(["Region", "Tid"]);
    expect(Object.keys(parsed.dimensions)).toEqual(["Region", "Tid"]);
  });

  it("encodes cells in the same flat order as table.cells, using the special-value markers", () => {
    const serialized = serializeSnapshot(sampleTable());
    const parsed = JSON.parse(serialized) as { cells: Array<number | string> };

    expect(parsed.cells).toEqual([79.4, ".", "..", ":"]);
  });

  it("ends with a trailing newline and is otherwise valid JSON", () => {
    const serialized = serializeSnapshot(sampleTable());

    expect(serialized.endsWith("\n")).toBe(true);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it("omits any dimension not present in the table's own dimensions map, even if listed in dimensionOrder", () => {
    // Defensive: dimensionOrder driving the loop (not Object.keys) means a
    // stale/mismatched dimensionOrder entry would throw rather than silently
    // producing `undefined`. This documents that failure mode explicitly.
    const table: ParsedTable = {
      tableId: "broken",
      dimensionOrder: ["Region", "Ghost"],
      dimensions: {
        Region: { label: "region", categories: [region("03", "Oslo")] },
      },
      cells: [],
    };

    expect(() => serializeSnapshot(table)).toThrow();
  });
});
