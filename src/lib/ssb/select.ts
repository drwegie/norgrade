/**
 * Coordinate lookup on a `ParsedTable`.
 *
 * `ParsedTable.cells` is flat and row-major, so a cell can be addressed by
 * arithmetic (src/lib/ssb/layout.ts) instead of by scanning all cells --
 * table 14882 has ~35k of them and a chart asks for many series.
 *
 * Every selector demands a category code for *every* dimension of the
 * table. A partially specified coordinate would have to pick one of the
 * matching cells or aggregate them, and SSB's tables already contain their
 * own totals as explicit categories ("All marks", "Both sexes", "All
 * educational levels"); inventing a second, implicit aggregation here would
 * be a recomputation of the published figures, which this app does not do.
 */

import { encodeFlatIndex } from "./layout";
import type { ParsedTable, SsbCell } from "./types";

function categoryIndices(table: ParsedTable, coordinates: Record<string, string>): {
  indices: number[];
  size: number[];
} {
  const indices: number[] = [];
  const size: number[] = [];

  for (const dimensionName of table.dimensionOrder) {
    const dimension = table.dimensions[dimensionName];
    const code = coordinates[dimensionName];
    if (code === undefined) {
      throw new Error(
        `Table ${table.tableId}: no category given for dimension "${dimensionName}" ` +
          `(all of ${table.dimensionOrder.join(", ")} must be specified)`,
      );
    }
    const categoryIndex = dimension.categories.findIndex((category) => category.code === code);
    if (categoryIndex < 0) {
      throw new Error(
        `Table ${table.tableId}: dimension "${dimensionName}" has no category "${code}"`,
      );
    }
    indices.push(categoryIndex);
    size.push(dimension.categories.length);
  }

  return { indices, size };
}

/**
 * SSB's own label for one category. Throws on an unknown code instead of
 * falling back to the code itself, so a category SSB renames or retires
 * fails the build rather than putting a raw code on screen.
 */
export function categoryLabel(table: ParsedTable, dimension: string, code: string): string {
  const category = table.dimensions[dimension]?.categories.find((c) => c.code === code);
  if (!category) {
    throw new Error(`Table ${table.tableId}: dimension "${dimension}" has no category "${code}"`);
  }
  return category.label;
}

/** Returns the single cell at a fully specified coordinate. */
export function selectCell(table: ParsedTable, coordinates: Record<string, string>): SsbCell {
  const { indices, size } = categoryIndices(table, coordinates);
  return table.cells[encodeFlatIndex(indices, size)];
}

/**
 * Returns one cell per category of `along`, in the table's own category
 * order. `at` fixes every other dimension; a code given for `along` itself
 * is ignored.
 */
export function selectSeries(
  table: ParsedTable,
  along: string,
  at: Record<string, string>,
): SsbCell[] {
  const dimension = table.dimensions[along];
  if (!dimension) {
    throw new Error(`Table ${table.tableId} has no dimension "${along}"`);
  }
  return dimension.categories.map((category) =>
    selectCell(table, { ...at, [along]: category.code }),
  );
}
