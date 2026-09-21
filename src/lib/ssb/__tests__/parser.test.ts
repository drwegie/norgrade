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
});
