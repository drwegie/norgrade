import type { ParsedCell, ParsedTable, SsbCell, SsbDimension } from "./types";

/**
 * Minimal typing for the subset of json-stat2 that SSB's PxWebApi v2
 * actually emits (`outputFormat=json-stat2`). We do not model the full
 * json-stat2 spec (e.g. bundles of multiple datasets), only the single
 * "dataset" shape SSB returns for one table.
 */
export interface JsonStat2Dataset {
  version?: string;
  class?: "dataset";
  label?: string;
  source?: string;
  updated?: string;
  /** Dimension names in the order used to lay out `value`/`status`. */
  id: string[];
  /** Number of categories per dimension, same order as `id`. */
  size: number[];
  dimension: Record<string, JsonStat2Dimension>;
  /** Flat, row-major array (last dimension varies fastest). `null` = special value. */
  value: Array<number | null>;
  /**
   * Special-value markers for cells in `value`. SSB returns this as a
   * sparse object keyed by stringified flat index (only entries that need
   * one are present), but per the json-stat2 spec it may also be a full
   * array parallel to `value`, or a single string applying to every cell.
   */
  status?: Record<string, string> | string[] | string;
}

export interface JsonStat2Dimension {
  label?: string;
  category: {
    /** Either an ordered array of codes, or a code -> position map. */
    index?: string[] | Record<string, number>;
    label?: Record<string, string>;
  };
}

const STATUS_NOT_APPLICABLE = ".";
const STATUS_NOT_AVAILABLE = "..";
const STATUS_CONFIDENTIAL = ":";

/** Decodes a flat, row-major (last dimension fastest) index into per-dimension indices. */
function decodeFlatIndex(flatIndex: number, size: number[]): number[] {
  const indices = new Array<number>(size.length);
  let remainder = flatIndex;
  for (let d = size.length - 1; d >= 0; d--) {
    const dimSize = size[d];
    indices[d] = remainder % dimSize;
    remainder = Math.floor(remainder / dimSize);
  }
  return indices;
}

/** Returns the category codes for a dimension, ordered by their category index. */
function categoryCodesInOrder(dim: JsonStat2Dimension): string[] {
  const { index } = dim.category;
  if (Array.isArray(index)) {
    return index;
  }
  if (index && typeof index === "object") {
    return Object.entries(index)
      .sort(([, a], [, b]) => a - b)
      .map(([code]) => code);
  }
  // Dimension has a single implicit category (no `index` needed when there's
  // only one). Fall back to the one label key, or the dimension name itself.
  const labelKeys = dim.category.label ? Object.keys(dim.category.label) : [];
  return labelKeys.length > 0 ? labelKeys : [Object.keys(dim.category)[0] ?? ""];
}

/** Looks up the status code for one flat index, handling all three status shapes. */
function statusForIndex(
  status: JsonStat2Dataset["status"],
  flatIndex: number,
): string | undefined {
  if (status === undefined) return undefined;
  if (typeof status === "string") return status;
  if (Array.isArray(status)) return status[flatIndex];
  return status[String(flatIndex)];
}

function toSsbCell(rawValue: number | null, statusCode: string | undefined): SsbCell {
  switch (statusCode) {
    case STATUS_NOT_APPLICABLE:
      return { kind: "not-applicable" };
    case STATUS_NOT_AVAILABLE:
      return { kind: "not-available" };
    case STATUS_CONFIDENTIAL:
      return { kind: "confidential" };
    case undefined:
      break;
    default:
      throw new Error(`Unrecognized SSB status code: "${statusCode}"`);
  }
  if (rawValue === null) {
    throw new Error("SSB cell value is null but carries no recognized status code");
  }
  return { kind: "value", value: rawValue };
}

/** Parses a raw json-stat2 dataset from SSB's PxWebApi v2 into a typed, decoded table. */
export function parseJsonStat2(tableId: string, raw: JsonStat2Dataset): ParsedTable {
  const dimensionOrder = raw.id;
  const dimensionCodes: Record<string, string[]> = {};
  const dimensions: Record<string, SsbDimension> = {};

  for (const dimName of dimensionOrder) {
    const dim = raw.dimension[dimName];
    if (!dim) {
      throw new Error(`Missing dimension metadata for "${dimName}"`);
    }
    const codes = categoryCodesInOrder(dim);
    dimensionCodes[dimName] = codes;
    dimensions[dimName] = {
      label: dim.label ?? dimName,
      categories: codes.map((code) => ({
        code,
        label: dim.category.label?.[code] ?? code,
      })),
    };
  }

  const totalCells = raw.size.reduce((a, b) => a * b, 1);
  const cells: ParsedCell[] = new Array(totalCells);

  for (let flatIndex = 0; flatIndex < totalCells; flatIndex++) {
    const perDimIndices = decodeFlatIndex(flatIndex, raw.size);
    const coordinates: Record<string, string> = {};
    perDimIndices.forEach((categoryIndex, dimPosition) => {
      const dimName = dimensionOrder[dimPosition];
      coordinates[dimName] = dimensionCodes[dimName][categoryIndex];
    });

    const cell = toSsbCell(raw.value[flatIndex], statusForIndex(raw.status, flatIndex));
    cells[flatIndex] = { coordinates, cell };
  }

  return { tableId, dimensionOrder, dimensions, cells };
}
