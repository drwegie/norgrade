/**
 * Round-trip tests for the snapshot format.
 *
 * `serializeSnapshot` (scripts/ingest-core.ts) and `decodeSnapshot` are the
 * two halves of the on-disk format, written on opposite sides of the ADR-001
 * boundary: ingest writes, the request path reads. The property that matters
 * is that the read side reconstructs exactly what the write side had --
 * including the three special values and, critically, the cell *order*,
 * since a cell's coordinates are nothing but its position in that order
 * (src/lib/ssb/layout.ts).
 */
import { describe, expect, it } from "vitest";
import { serializeSnapshot } from "../../../../scripts/ingest-core";
import { decodeSnapshot } from "../snapshot";
import { parseJsonStat2, type JsonStat2Dataset } from "../parser";
import { selectCell } from "../select";
import type { ParsedTable } from "../types";

import normalFixture from "../__fixtures__/table-11689-normal.json";
import notApplicableFixture from "../__fixtures__/table-14882-svalbard-not-applicable.json";

import snapshot11689 from "../../../../data/ssb/11689.json";

/** Serializes a table and decodes it back, as ingest and the app would. */
function roundTrip(table: ParsedTable): ParsedTable {
  return decodeSnapshot(JSON.parse(serializeSnapshot(table)));
}

/**
 * A three-dimensional table covering all four cell kinds. Built by hand
 * rather than from a fixture so that the special values sit at known
 * coordinates, which is what makes a coordinate shift detectable.
 * Asymmetric on purpose (2 x 2 x 3): a transposed layout would survive a
 * square one.
 */
function buildMixedTable(): ParsedTable {
  const dimensionOrder = ["Kjonn", "ForeldrUtd", "Tid"];
  const dimensions: ParsedTable["dimensions"] = {
    Kjonn: { label: "sex", categories: [{ code: "11", label: "Girls" }, { code: "10", label: "Boys" }] },
    ForeldrUtd: {
      label: "parent's level of education",
      categories: [
        { code: "01", label: "Basic school or no completed education" },
        { code: "03c", label: "Tertiary education, more than 4 years" },
      ],
    },
    Tid: {
      label: "year",
      categories: [
        { code: "2024", label: "2024" },
        { code: "2025", label: "2025" },
        { code: "2026", label: "2026" },
      ],
    },
  };

  const cells: ParsedTable["cells"] = [
    { kind: "value", value: 1.5 },
    { kind: "not-applicable" },
    { kind: "not-available" },
    { kind: "confidential" },
    { kind: "value", value: 0 },
    { kind: "value", value: 17.2 },
    { kind: "value", value: -3.25 },
    { kind: "not-available" },
    { kind: "value", value: 11 },
    { kind: "value", value: 12 },
    { kind: "confidential" },
    { kind: "value", value: 14 },
  ];

  return { tableId: "mixed", dimensionOrder, dimensions, cells };
}

describe("decodeSnapshot", () => {
  it("round-trips a table containing all four cell kinds", () => {
    const table = buildMixedTable();

    expect(roundTrip(table)).toEqual(table);
  });

  it("round-trips a table parsed from a real json-stat2 fixture", () => {
    const table = parseJsonStat2("11689", normalFixture as unknown as JsonStat2Dataset);

    expect(roundTrip(table)).toEqual(table);
  });

  it("keeps a not-applicable cell distinguishable from the value 0", () => {
    const table = parseJsonStat2(
      "14882",
      notApplicableFixture as unknown as JsonStat2Dataset,
    );
    const decoded = roundTrip(table);

    const svalbard = selectCell(decoded, {
      Region: "21",
      Tid: "2023",
      ContentsCode: "FullfortAndel",
    });
    expect(svalbard).toEqual({ kind: "not-applicable" });
    expect(svalbard).not.toEqual({ kind: "value", value: 0 });
  });

  it("decodes the committed snapshot of table 11689", () => {
    const table = decodeSnapshot(snapshot11689);

    expect(table.tableId).toBe("11689");
    expect(table.dimensionOrder).toEqual(["Kjonn", "Poeng", "ForeldrUtd", "ContentsCode", "Tid"]);
    expect(table.cells).toHaveLength(
      table.dimensionOrder.reduce((n, d) => n * table.dimensions[d].categories.length, 1),
    );
    // Row-major means the first cell is the first category of every dimension.
    expect(
      selectCell(table, {
        Kjonn: "0",
        Poeng: "01-09",
        ForeldrUtd: "00",
        ContentsCode: "Elever",
        Tid: "2015",
      }),
    ).toEqual(table.cells[0]);
  });

  it("rejects a snapshot whose cell count contradicts its dimensions", () => {
    const table = buildMixedTable();
    const snapshot = JSON.parse(serializeSnapshot(table));
    snapshot.cells.pop();

    expect(() => decodeSnapshot(snapshot)).toThrow(/11 cells but its dimensions describe 12/);
  });

  it("rejects an unknown cell encoding instead of coercing it", () => {
    const table = buildMixedTable();
    const snapshot = JSON.parse(serializeSnapshot(table));
    snapshot.cells[0] = "-";

    expect(() => decodeSnapshot(snapshot)).toThrow(/known SSB status marker/);
  });

  it("rejects a dimension listed in dimensionOrder but absent from dimensions", () => {
    const table = buildMixedTable();
    const snapshot = JSON.parse(serializeSnapshot(table));
    delete snapshot.dimensions.Tid;

    expect(() => decodeSnapshot(snapshot)).toThrow(/no categories for it/);
  });
});
