import { describe, expect, it } from "vitest";
import { selectCell, selectSeries } from "../select";
import { decodeSnapshot } from "../snapshot";
import type { ParsedTable } from "../types";

import snapshot11689 from "../../../../data/ssb/11689.json";

const table: ParsedTable = decodeSnapshot(snapshot11689);

/** Share of pupils reaching the top points bracket, as the home page reads it. */
function topBracketShare(sex: string, education: string, year: string) {
  return selectCell(table, {
    Kjonn: sex,
    Poeng: "08",
    ForeldrUtd: education,
    ContentsCode: "EleverProsent",
    Tid: year,
  });
}

describe("selectCell", () => {
  it("finds the cell the flat layout puts at a coordinate", () => {
    // Cross-checked against the position counted out by walking the flat
    // array in nested-loop order, which is the row-major convention written
    // out longhand rather than as index arithmetic. A mistake in
    // `encodeFlatIndex` therefore cannot pass this test.
    const coordinates = {
      Kjonn: "11",
      Poeng: "08",
      ForeldrUtd: "03c",
      ContentsCode: "EleverProsent",
      Tid: "2026",
    };
    let counted = 0;
    let walked: (typeof table.cells)[number] | undefined;
    for (const kjonn of table.dimensions.Kjonn.categories) {
      for (const poeng of table.dimensions.Poeng.categories) {
        for (const utd of table.dimensions.ForeldrUtd.categories) {
          for (const contents of table.dimensions.ContentsCode.categories) {
            for (const tid of table.dimensions.Tid.categories) {
              if (
                kjonn.code === coordinates.Kjonn &&
                poeng.code === coordinates.Poeng &&
                utd.code === coordinates.ForeldrUtd &&
                contents.code === coordinates.ContentsCode &&
                tid.code === coordinates.Tid
              ) {
                walked = table.cells[counted];
              }
              counted++;
            }
          }
        }
      }
    }

    expect(selectCell(table, coordinates)).toEqual(walked);
    expect(selectCell(table, coordinates)).toEqual({ kind: "value", value: 17.2 });
  });

  it("returns special values as themselves", () => {
    // Boys whose parents have only basic school: the top bracket is not
    // available for 2026 in the committed snapshot.
    expect(topBracketShare("10", "01", "2026")).toEqual({ kind: "not-available" });
    expect(topBracketShare("10", "01", "2025")).toEqual({ kind: "value", value: 0.3 });
  });

  it("rejects an incomplete coordinate rather than aggregating", () => {
    expect(() => selectCell(table, { Kjonn: "0" })).toThrow(/no category given for dimension "Poeng"/);
  });

  it("rejects an unknown category code", () => {
    expect(() =>
      selectCell(table, {
        Kjonn: "0",
        Poeng: "08",
        ForeldrUtd: "nope",
        ContentsCode: "EleverProsent",
        Tid: "2026",
      }),
    ).toThrow(/dimension "ForeldrUtd" has no category "nope"/);
  });
});

describe("selectSeries", () => {
  it("returns one cell per category of the varying dimension, in table order", () => {
    const series = selectSeries(table, "Tid", {
      Kjonn: "11",
      Poeng: "08",
      ForeldrUtd: "03c",
      ContentsCode: "EleverProsent",
    });

    expect(series).toHaveLength(table.dimensions.Tid.categories.length);
    expect(series[0]).toEqual({ kind: "value", value: 11.5 }); // 2015
    expect(series[series.length - 1]).toEqual({ kind: "value", value: 17.2 }); // 2026
  });

  it("keeps gaps in place instead of dropping them", () => {
    const series = selectSeries(table, "Tid", {
      Kjonn: "10",
      Poeng: "08",
      ForeldrUtd: "01",
      ContentsCode: "EleverProsent",
    });

    expect(series).toHaveLength(table.dimensions.Tid.categories.length);
    expect(series[series.length - 1]).toEqual({ kind: "not-available" });
  });

  it("rejects an unknown dimension", () => {
    expect(() => selectSeries(table, "Region", {})).toThrow(/has no dimension "Region"/);
  });
});
