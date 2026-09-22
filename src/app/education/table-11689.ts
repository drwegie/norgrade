/**
 * Table 11689, decoded once, plus the one piece of arithmetic this app
 * performs on SSB's figures.
 *
 * Two callers share it: `education-lens.tsx`, which charts the table, and
 * the entry page at `/`, which quotes a single headline ratio. Keeping the
 * computation here rather than copying it means the number on the entry
 * page cannot drift from the number on the lens -- it is the same function
 * on the same cells.
 *
 * The entry page is a server component, so its import is resolved at build
 * time and only the resulting numbers reach the HTML; the table's cells are
 * still shipped to the browser by `/education` alone, which is the code
 * splitting ADR-002 asked for.
 */

import { decodeSnapshot } from "@/lib/ssb/snapshot";
import { selectSeries } from "@/lib/ssb/select";

import snapshot11689 from "../../../data/ssb/11689.json";

export const table11689 = decodeSnapshot(snapshot11689);

/** Per cent of pupils, as published; the sibling `Elever` is a head count. */
export const CONTENTS_CODE = "EleverProsent";

/**
 * The lowest and highest of the four real levels of parental education.
 * "00" (all levels) and "99" (Unknown) are not levels and are never an end
 * of the gradient.
 */
export const LOWEST_EDUCATION = "01";
export const HIGHEST_EDUCATION = "03c";

/** The top points bracket, "55 point or more". */
export const TOP_BRACKET = "08";

export const YEARS = table11689.dimensions.Tid.categories.map((category) => category.label);
export const LATEST_YEAR = YEARS[YEARS.length - 1];

export interface LatestGradient {
  lowest: number;
  highest: number;
  ratio: number;
}

/**
 * The headline ratio for one points bracket, for both sexes together, in
 * the latest year. This division of two published shares is the only
 * computation anywhere in the app, and every page that prints it says so.
 * `null` when either end is a special value or the divisor is zero -- a
 * ratio is not invented out of a "." or a "..".
 */
export function latestGradient(bracket: string): LatestGradient | null {
  const bothSexes = selectSeries(table11689, "ForeldrUtd", {
    Kjonn: "0",
    Poeng: bracket,
    ContentsCode: CONTENTS_CODE,
    Tid: LATEST_YEAR,
  });
  const codes = table11689.dimensions.ForeldrUtd.categories.map((category) => category.code);
  const cellFor = (code: string) => bothSexes[codes.indexOf(code)];

  const lowest = cellFor(LOWEST_EDUCATION);
  const highest = cellFor(HIGHEST_EDUCATION);
  if (lowest.kind !== "value" || highest.kind !== "value" || lowest.value === 0) {
    return null;
  }
  return { lowest: lowest.value, highest: highest.value, ratio: highest.value / lowest.value };
}
