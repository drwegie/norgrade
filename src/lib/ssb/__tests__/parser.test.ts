import { describe, expect, it } from "vitest";
import { parseJsonStat2, type JsonStat2Dataset } from "../parser";

import normalFixture from "../__fixtures__/table-11689-normal.json";
import notApplicableFixture from "../__fixtures__/table-14882-svalbard-not-applicable.json";
import notAvailableFixture from "../__fixtures__/table-14882-not-available-synthetic.json";
import confidentialFixture from "../__fixtures__/table-13716-confidential-synthetic.json";

describe("parseJsonStat2", () => {
  it("parses normal numeric cells without a status code", () => {
    const table = parseJsonStat2("11689", normalFixture as unknown as JsonStat2Dataset);

    expect(table.cells).toHaveLength(3);
    expect(table.cells.map((c) => c.cell)).toEqual([
      { kind: "value", value: 67490 },
      { kind: "value", value: 32515 },
      { kind: "value", value: 34975 },
    ]);
    // Both sexes total equals males + females, per the spec's live example.
    const [bothSexes, males, females] = table.cells.map((c) => c.cell);
    expect(bothSexes.kind === "value" && males.kind === "value" && females.kind === "value");
    if (bothSexes.kind === "value" && males.kind === "value" && females.kind === "value") {
      expect(bothSexes.value).toBe(males.value + females.value);
    }
  });

  it("decodes cell coordinates against the correct dimension categories", () => {
    const table = parseJsonStat2("11689", normalFixture as unknown as JsonStat2Dataset);

    expect(table.cells[0].coordinates).toEqual({
      Kjonn: "0",
      Tid: "2024",
      ContentsCode: "Elever",
    });
    expect(table.dimensions.Kjonn.categories).toEqual([
      { code: "0", label: "Both sexes" },
      { code: "1", label: "Males" },
      { code: "2", label: "Females" },
    ]);
  });

  it('parses status "." as not-applicable, not as zero or null', () => {
    const table = parseJsonStat2(
      "14882",
      notApplicableFixture as unknown as JsonStat2Dataset,
    );

    const svalbardCell = table.cells.find((c) => c.coordinates.Region === "21");
    expect(svalbardCell?.cell).toEqual({ kind: "not-applicable" });

    const osloCell = table.cells.find((c) => c.coordinates.Region === "03");
    expect(osloCell?.cell).toEqual({ kind: "value", value: 79.4 });
  });

  it('parses status ".." as not-available', () => {
    const table = parseJsonStat2(
      "14882",
      notAvailableFixture as unknown as JsonStat2Dataset,
    );

    const trondelagCell = table.cells.find((c) => c.coordinates.Region === "50");
    expect(trondelagCell?.cell).toEqual({ kind: "not-available" });
  });

  it('parses status ":" as confidential', () => {
    const table = parseJsonStat2(
      "13716",
      confidentialFixture as unknown as JsonStat2Dataset,
    );

    const topBracketCell = table.cells.find(
      (c) => c.coordinates.Husholdningsinntekt === "10000000+",
    );
    expect(topBracketCell?.cell).toEqual({ kind: "confidential" });
  });

  it("throws on a null value that carries no recognized status code", () => {
    const broken: JsonStat2Dataset = {
      id: ["Tid"],
      size: [1],
      dimension: { Tid: { category: { index: ["2024"] } } },
      value: [null],
    };

    expect(() => parseJsonStat2("x", broken)).toThrow(/no recognized status code/);
  });

  it("throws on an unrecognized status code instead of silently ignoring it", () => {
    const broken: JsonStat2Dataset = {
      id: ["Tid"],
      size: [1],
      dimension: { Tid: { category: { index: ["2024"] } } },
      value: [null],
      status: { "0": "?" },
    };

    expect(() => parseJsonStat2("x", broken)).toThrow(/Unrecognized SSB status code/);
  });

  it("decodes a two-dimensional flat index in row-major order (last dimension fastest)", () => {
    // Region has 3 categories (object-map index, intentionally listed out of
    // order to exercise the sort-by-position branch), Kjonn has 2 categories
    // given as a plain array (the other supported `index` shape). Region is
    // dimension 0 (slow-varying), Kjonn is dimension 1 (fast-varying), so the
    // expected flat layout is: (01,0) (01,1) (02,0) (02,1) (03,0) (03,1).
    const raw: JsonStat2Dataset = {
      id: ["Region", "Kjonn"],
      size: [3, 2],
      dimension: {
        Region: {
          category: { index: { "03": 2, "01": 0, "02": 1 } },
        },
        Kjonn: {
          category: { index: ["0", "1"] },
        },
      },
      value: [10, 11, 20, 21, 30, 31],
    };

    const table = parseJsonStat2("multi-dim", raw);

    expect(table.cells).toHaveLength(6);
    // Spot-check a cell in the middle of the grid, not just the edges.
    expect(table.cells[3]).toEqual({
      coordinates: { Region: "02", Kjonn: "1" },
      cell: { kind: "value", value: 21 },
    });
    expect(table.cells.map((c) => (c.cell as { value: number }).value)).toEqual([
      10, 11, 20, 21, 30, 31,
    ]);
    expect(table.cells.map((c) => c.coordinates)).toEqual([
      { Region: "01", Kjonn: "0" },
      { Region: "01", Kjonn: "1" },
      { Region: "02", Kjonn: "0" },
      { Region: "02", Kjonn: "1" },
      { Region: "03", Kjonn: "0" },
      { Region: "03", Kjonn: "1" },
    ]);
  });

  it("accepts status as a full array parallel to value (the other json-stat2 status shape)", () => {
    const raw: JsonStat2Dataset = {
      id: ["Region"],
      size: [2],
      dimension: { Region: { category: { index: ["01", "02"] } } },
      value: [null, 5],
      status: [".", undefined as unknown as string],
    };

    const table = parseJsonStat2("array-status", raw);

    expect(table.cells[0].cell).toEqual({ kind: "not-applicable" });
    expect(table.cells[1].cell).toEqual({ kind: "value", value: 5 });
  });

  it("accepts status as a single string applying to every cell", () => {
    const raw: JsonStat2Dataset = {
      id: ["Region"],
      size: [2],
      dimension: { Region: { category: { index: ["01", "02"] } } },
      value: [null, null],
      status: ":",
    };

    const table = parseJsonStat2("string-status", raw);

    expect(table.cells.map((c) => c.cell)).toEqual([
      { kind: "confidential" },
      { kind: "confidential" },
    ]);
  });

  // KNOWN DEFECT (see test report): the comment on `categoryCodesInOrder`
  // claims the final fallback (dimension has neither an `index` nor a
  // `label` map, i.e. a single implicit category) uses "the dimension name
  // itself". The function's signature never receives the dimension name
  // (`dimName`), so it cannot actually do that -- it instead falls back to
  // `Object.keys(dim.category)[0]`, which are the *keys of the category
  // object itself* ("index"/"label"), not a data-derived code. With an
  // empty `category: {}` (as SSB would send for a single-category
  // dimension with no index and no label), `Object.keys({})` is `[]`, so
  // the code silently becomes an empty string instead of anything
  // resembling the dimension name. This test pins the *current* (buggy)
  // behavior so a future fix is a deliberate, visible change rather than a
  // silent one -- it is not an endorsement of the empty-string code.
  it("falls back to an empty-string category code (not the dimension name) when a dimension has neither index nor label", () => {
    const raw: JsonStat2Dataset = {
      id: ["Mystery"],
      size: [1],
      dimension: { Mystery: { category: {} } },
      value: [42],
    };

    const table = parseJsonStat2("no-index-no-label", raw);

    expect(table.dimensions.Mystery.categories).toEqual([{ code: "", label: "" }]);
    expect(table.cells[0].coordinates).toEqual({ Mystery: "" });
  });
});
