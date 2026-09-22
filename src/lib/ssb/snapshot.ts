/**
 * Reverse of `serializeSnapshot` (scripts/ingest-core.ts): turns a committed
 * `data/ssb/<tableId>.json` file back into a `ParsedTable`.
 *
 * This is the only way request-path code obtains SSB data. Per
 * docs/adr/ADR-001-ssb-ingest-boundary.md nothing here touches the network:
 * the snapshot is a plain value the caller has already loaded (imported as a
 * JSON module, so it is bundled at build time).
 *
 * The snapshot stores one entry per cell in flat row-major order and no
 * coordinates, which is also how `ParsedTable` holds them: a cell's
 * coordinates are its position under the layout convention in
 * src/lib/ssb/layout.ts, which `selectCell` inverts. What this decoder must
 * therefore guarantee is that the cell *count* agrees with the dimensions,
 * since a short or long `cells` array silently shifts every coordinate.
 * Status markers are decoded back into the
 * `SsbCell` union rather than into `null`/`0`, which is the entire point of
 * keeping them on disk (see src/lib/ssb/types.ts).
 *
 * Input is validated because it is parsed JSON: a truncated or hand-edited
 * snapshot must fail the build loudly instead of silently producing a table
 * with shifted coordinates.
 */

import type { ParsedTable, SsbCell, SsbDimension } from "./types";

/** On-disk cell encoding, mirroring `EncodedCell` in scripts/ingest-core.ts. */
export type EncodedCell = number | "." | ".." | ":";

/** Shape of a `data/ssb/<tableId>.json` file. */
export interface SnapshotFile {
  tableId: string;
  dimensionOrder: string[];
  dimensions: Record<string, { label: string; categories: Array<{ code: string; label: string }> }>;
  cells: EncodedCell[];
}

function decodeCell(encoded: unknown, flatIndex: number): SsbCell {
  switch (encoded) {
    case ".":
      return { kind: "not-applicable" };
    case "..":
      return { kind: "not-available" };
    case ":":
      return { kind: "confidential" };
  }
  if (typeof encoded === "number" && Number.isFinite(encoded)) {
    return { kind: "value", value: encoded };
  }
  throw new Error(
    `Snapshot cell ${flatIndex} is neither a finite number nor a known SSB status marker: ${JSON.stringify(encoded)}`,
  );
}

function assertSnapshotShape(raw: unknown): asserts raw is SnapshotFile {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Snapshot is not an object");
  }
  const snapshot = raw as Partial<SnapshotFile>;
  if (typeof snapshot.tableId !== "string") {
    throw new Error("Snapshot is missing a string `tableId`");
  }
  if (!Array.isArray(snapshot.dimensionOrder)) {
    throw new Error(`Snapshot ${snapshot.tableId} is missing a \`dimensionOrder\` array`);
  }
  if (typeof snapshot.dimensions !== "object" || snapshot.dimensions === null) {
    throw new Error(`Snapshot ${snapshot.tableId} is missing a \`dimensions\` object`);
  }
  if (!Array.isArray(snapshot.cells)) {
    throw new Error(`Snapshot ${snapshot.tableId} is missing a \`cells\` array`);
  }
}

/** Decodes a committed snapshot file into the same `ParsedTable` ingest serialized. */
export function decodeSnapshot(raw: unknown): ParsedTable {
  assertSnapshotShape(raw);

  const { tableId, dimensionOrder } = raw;
  const dimensions: Record<string, SsbDimension> = {};
  const size: number[] = [];

  for (const dimensionName of dimensionOrder) {
    const dimension = raw.dimensions[dimensionName];
    if (!dimension || !Array.isArray(dimension.categories)) {
      throw new Error(
        `Snapshot ${tableId} lists dimension "${dimensionName}" in dimensionOrder but has no categories for it`,
      );
    }
    dimensions[dimensionName] = {
      label: dimension.label,
      categories: dimension.categories.map(({ code, label }) => ({ code, label })),
    };
    size.push(dimension.categories.length);
  }

  const expectedCells = size.reduce((a, b) => a * b, 1);
  if (raw.cells.length !== expectedCells) {
    throw new Error(
      `Snapshot ${tableId} has ${raw.cells.length} cells but its dimensions describe ${expectedCells} ` +
        `(${dimensionOrder.map((name, i) => `${name}=${size[i]}`).join(" x ")})`,
    );
  }

  const cells: SsbCell[] = new Array(expectedCells);
  for (let flatIndex = 0; flatIndex < expectedCells; flatIndex++) {
    cells[flatIndex] = decodeCell(raw.cells[flatIndex], flatIndex);
  }

  return { tableId, dimensionOrder, dimensions, cells };
}
