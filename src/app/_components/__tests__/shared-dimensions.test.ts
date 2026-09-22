/**
 * The shared-selection feature rests on a claim about the *data*: that the
 * category codes a lens carries to another lens mean the same thing in both
 * tables. That claim is measured here against the committed snapshots
 * rather than assumed, because the failure mode of assuming it is silent --
 * a wrong but plausible cell would be charted, not an error.
 *
 * Two facts these tests pin down, both measured on 2026-09-22:
 *
 * - `Kjonn` is `0/11/10` in 11689, 13716 and 13717 but `0/2/1` in 14882, so
 *   carrying a sex to /completion needs the translation in
 *   `shared-dimensions.ts`.
 * - `ForeldrUtd` is identical across 11689, 13716 and 13717 and **absent**
 *   from 14882, so a parental education level is never applied there.
 */

import { describe, expect, it } from "vitest";
import {
  SEX_CODE_IN_14882,
  SHARED_EDUCATION_CODES,
  SHARED_SEX_CODE_FROM_14882,
  SHARED_SEX_CODES,
} from "../shared-dimensions";
// Relative rather than the `@/` alias: vitest.config.mts declares no path
// aliases, and the other suites in this repo import the same way.
import { decodeSnapshot } from "../../../lib/ssb/snapshot";
import type { ParsedTable } from "../../../lib/ssb/types";

import snapshot11689 from "../../../../data/ssb/11689.json";
import snapshot13716 from "../../../../data/ssb/13716.json";
import snapshot13717 from "../../../../data/ssb/13717.json";
import snapshot14882 from "../../../../data/ssb/14882.json";

const tables: Record<string, ParsedTable> = {
  "11689": decodeSnapshot(snapshot11689),
  "13716": decodeSnapshot(snapshot13716),
  "13717": decodeSnapshot(snapshot13717),
  "14882": decodeSnapshot(snapshot14882),
};

const SEX_SHARING_TABLES = ["11689", "13716", "13717"] as const;

function codesOf(table: ParsedTable, dimension: string): string[] | undefined {
  return table.dimensions[dimension]?.categories.map((category) => category.code);
}

function labelOf(table: ParsedTable, dimension: string, code: string): string | undefined {
  return table.dimensions[dimension]?.categories.find((c) => c.code === code)?.label;
}

describe("Kjonn across the four tables", () => {
  it.each(SEX_SHARING_TABLES)("table %s uses the canonical codes", (id) => {
    expect(codesOf(tables[id], "Kjonn")).toEqual([...SHARED_SEX_CODES]);
  });

  it("table 14882 numbers the sexes differently", () => {
    // The reason a translation exists at all. If SSB ever aligns them, this
    // fails and the mapping can be deleted rather than lingering as a lie.
    expect(codesOf(tables["14882"], "Kjonn")).not.toEqual([...SHARED_SEX_CODES]);
    expect(codesOf(tables["14882"], "Kjonn")).toEqual(["0", "2", "1"]);
  });

  it("maps every canonical code onto a category 14882 actually has", () => {
    for (const code of SHARED_SEX_CODES) {
      const mapped = SEX_CODE_IN_14882[code];
      expect(labelOf(tables["14882"], "Kjonn", mapped)).toBeDefined();
      expect(SHARED_SEX_CODE_FROM_14882[mapped]).toBe(code);
    }
  });

  it("maps categories that stand for the same group", () => {
    // SSB words them differently ("Girls"/"Females"), so the check is on
    // the position of the category in each table's own ordering plus the
    // "Both sexes" total, not on the label text.
    expect(labelOf(tables["11689"], "Kjonn", "0")).toBe(labelOf(tables["14882"], "Kjonn", "0"));
    for (const code of SHARED_SEX_CODES) {
      const here = codesOf(tables["11689"], "Kjonn")!.indexOf(code);
      const there = codesOf(tables["14882"], "Kjonn")!.indexOf(SEX_CODE_IN_14882[code]);
      expect(there).toBe(here);
    }
  });
});

describe("ForeldrUtd across the four tables", () => {
  it.each(SEX_SHARING_TABLES)("table %s offers every shared level", (id) => {
    const codes = codesOf(tables[id], "ForeldrUtd");
    expect(codes).toBeDefined();
    for (const code of SHARED_EDUCATION_CODES) {
      expect(codes).toContain(code);
    }
  });

  it("uses identical codes and labels in 11689, 13716 and 13717", () => {
    const reference = tables["11689"].dimensions.ForeldrUtd.categories;
    for (const id of SEX_SHARING_TABLES) {
      expect(tables[id].dimensions.ForeldrUtd.categories).toEqual(reference);
    }
  });

  it("is absent from 14882, so it is never carried there", () => {
    expect(tables["14882"].dimensions.ForeldrUtd).toBeUndefined();
    expect(tables["14882"].dimensionOrder).not.toContain("ForeldrUtd");
  });
});
