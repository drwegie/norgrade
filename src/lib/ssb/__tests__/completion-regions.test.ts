/**
 * Tests for the region display set of table 14882.
 *
 * These run against the committed snapshot, not a fixture: the facts under
 * test are facts about that snapshot (which regions report which intervals,
 * and where the Trøndelag handover falls), and a hand-written fixture could
 * only restate what the test already assumes. The synthetic cases below
 * cover the shapes the real table does not contain.
 */
import { describe, expect, it } from "vitest";
import { completionRegions, TRONDELAG_MERGER } from "../completion-regions";
import { partitionRegions } from "../region";
import { decodeSnapshot } from "../snapshot";
import type { ParsedTable } from "../types";

import snapshot14882 from "../../../../data/ssb/14882.json";

const table: ParsedTable = decodeSnapshot(snapshot14882);

const INTERVALS = table.dimensions.Tid.categories.map((category) => category.code);
/** The slice the completion lens opens on. */
const BASE = {
  FullforingVGO: "1a",
  Kjonn: "0",
  Poeng: "01-09",
  ContentsCode: "Prosent",
};

function at(interval: string) {
  return completionRegions(table, { ...BASE, Tid: interval });
}

describe("completionRegions on the committed 14882 snapshot", () => {
  it("drops the national total, Svalbard and Abroad, which are not counties", () => {
    const codes = new Set(at(INTERVALS[0]).bars.map((bar) => bar.code));

    expect(codes.has("01-99")).toBe(false);
    expect(codes.has("21")).toBe(false);
    expect(codes.has("25")).toBe(false);
  });

  it("keeps the historical (pre-2020) counties, which `partitionRegions().current` would discard", () => {
    const { bars } = at(INTERVALS[INTERVALS.length - 1]);
    const { current } = partitionRegions(table.dimensions.Region.categories);
    const currentCodes = new Set(current.map((region) => region.code));

    // Five current-boundary codes against 18 counties actually drawn: this
    // is the measurement that makes the `current` filter the wrong one.
    expect(currentCodes).toEqual(new Set(["03", "11", "15", "18", "50"]));
    expect(bars).toHaveLength(18);
    expect(bars.filter((bar) => !currentCodes.has(bar.code)).length).toBe(13);
    expect(bars.some((bar) => bar.label.includes("(-2019)"))).toBe(true);
  });

  it("draws every county it lists: no bar is a not-applicable cell", () => {
    for (const interval of INTERVALS) {
      expect(at(interval).bars.every((bar) => bar.cell.kind !== "not-applicable")).toBe(true);
    }
  });

  it("reports the two old Trøndelag counties, and not the merged one, for the first four intervals", () => {
    for (const interval of INTERVALS.slice(0, 4)) {
      const { bars, notApplicable, handover } = at(interval);
      const codes = bars.map((bar) => bar.code);

      expect(handover).toBe("predecessors");
      expect(codes).toContain("16");
      expect(codes).toContain("17");
      expect(codes).not.toContain(TRONDELAG_MERGER.successor);
      expect(notApplicable.map((row) => row.code)).toContain(TRONDELAG_MERGER.successor);
    }
  });

  it("reports the merged Trøndelag, and not its predecessors, for the last two intervals", () => {
    for (const interval of INTERVALS.slice(4)) {
      const { bars, notApplicable, handover } = at(interval);
      const codes = bars.map((bar) => bar.code);

      expect(handover).toBe("successor");
      expect(codes).toContain(TRONDELAG_MERGER.successor);
      expect(codes).not.toContain("16");
      expect(codes).not.toContain("17");
      expect(notApplicable.map((row) => row.code).sort()).toEqual(["16", "17"]);
    }
  });

  it("never lists a predecessor and the successor in the same slice", () => {
    for (const interval of INTERVALS) {
      const codes = new Set(at(interval).bars.map((bar) => bar.code));
      const predecessors = TRONDELAG_MERGER.predecessors.filter((code) => codes.has(code));

      expect(predecessors.length === 0 || !codes.has(TRONDELAG_MERGER.successor)).toBe(true);
    }
  });

  it("puts exactly one extra county on the pre-merger side (two old counties for one merged)", () => {
    expect(at(INTERVALS[0]).bars).toHaveLength(at(INTERVALS[5]).bars.length + 1);
  });

  it("holds for every outcome and sex, not just the default slice", () => {
    for (const outcome of ["1a", "2a", "4b", "003a", "8b", "9"]) {
      for (const sex of ["0", "1", "2"]) {
        const early = completionRegions(table, {
          ...BASE,
          FullforingVGO: outcome,
          Kjonn: sex,
          Tid: INTERVALS[0],
        });
        const late = completionRegions(table, {
          ...BASE,
          FullforingVGO: outcome,
          Kjonn: sex,
          Tid: INTERVALS[5],
        });

        expect(early.handover).toBe("predecessors");
        expect(late.handover).toBe("successor");
      }
    }
  });
});

/** Minimal Region x Tid table, row-major over [Region, Tid]. */
function syntheticTable(cells: ParsedTable["cells"]): ParsedTable {
  return {
    tableId: "synthetic",
    dimensionOrder: ["Region", "Tid"],
    dimensions: {
      Region: {
        label: "region",
        categories: [
          { code: "01-99", label: "Total" },
          { code: "03", label: "Oslo" },
          { code: "16", label: "Sør-Trøndelag (-2017)" },
          { code: "17", label: "Nord-Trøndelag (-2017)" },
          { code: "50", label: "Trøndelag" },
          { code: "21", label: "Svalbard" },
        ],
      },
      Tid: { label: "interval", categories: [{ code: "2014-2020", label: "2014-2020" }] },
    },
    cells,
  };
}

describe("completionRegions on shapes the real table does not contain", () => {
  it('keeps ".." and ":" as bars, since those are cells that should exist', () => {
    const { bars, notApplicable } = completionRegions(
      syntheticTable([
        { kind: "value", value: 70 }, // 01-99, dropped as an aggregate
        { kind: "not-available" }, // 03
        { kind: "confidential" }, // 16
        { kind: "not-applicable" }, // 17
        { kind: "value", value: 66 }, // 50
        { kind: "value", value: 100 }, // 21, dropped as non-geographic
      ]),
      { Tid: "2014-2020" },
    );

    expect(bars.map((bar) => bar.code)).toEqual(["03", "16", "50"]);
    expect(bars.map((bar) => bar.cell.kind)).toEqual(["not-available", "confidential", "value"]);
    expect(notApplicable.map((row) => row.code)).toEqual(["17"]);
  });

  it('reports "both" when a predecessor and the successor report the same slice', () => {
    const { handover } = completionRegions(
      syntheticTable([
        { kind: "value", value: 70 },
        { kind: "value", value: 71 },
        { kind: "value", value: 63 },
        { kind: "value", value: 61 },
        { kind: "value", value: 66 },
        { kind: "not-applicable" },
      ]),
      { Tid: "2014-2020" },
    );

    expect(handover).toBe("both");
  });

  it('reports "none" when neither side reports the slice', () => {
    const { handover } = completionRegions(
      syntheticTable([
        { kind: "value", value: 70 },
        { kind: "value", value: 71 },
        { kind: "not-applicable" },
        { kind: "not-applicable" },
        { kind: "not-applicable" },
        { kind: "not-applicable" },
      ]),
      { Tid: "2014-2020" },
    );

    expect(handover).toBe("none");
  });

  it("keeps SSB's own category order rather than reordering the counties", () => {
    const { bars } = completionRegions(
      syntheticTable([
        { kind: "value", value: 70 },
        { kind: "value", value: 71 },
        { kind: "value", value: 63 },
        { kind: "value", value: 61 },
        { kind: "not-applicable" },
        { kind: "value", value: 100 },
      ]),
      { Tid: "2014-2020" },
    );

    expect(bars.map((bar) => bar.code)).toEqual(["03", "16", "17"]);
  });
});
