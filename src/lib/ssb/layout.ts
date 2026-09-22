/**
 * The one place that owns the flat cell layout used everywhere in this repo.
 *
 * json-stat2 lays `value` out row-major over the dimensions listed in `id`
 * (the last dimension varies fastest), `ParsedTable.cells` keeps that same
 * order, and `serializeSnapshot` in scripts/ingest-core.ts writes it to disk
 * unchanged. Parser, snapshot decoder and cell lookup therefore all need the
 * same index arithmetic; keeping it in one module means a change to the
 * convention cannot be applied to some of them and not the others.
 */

/** Decodes a flat, row-major index into one category index per dimension. */
export function decodeFlatIndex(flatIndex: number, size: number[]): number[] {
  const indices = new Array<number>(size.length);
  let remainder = flatIndex;
  for (let d = size.length - 1; d >= 0; d--) {
    const dimSize = size[d];
    indices[d] = remainder % dimSize;
    remainder = Math.floor(remainder / dimSize);
  }
  return indices;
}

/** Inverse of `decodeFlatIndex`: per-dimension category indices to a flat index. */
export function encodeFlatIndex(indices: number[], size: number[]): number {
  let flatIndex = 0;
  for (let d = 0; d < size.length; d++) {
    flatIndex = flatIndex * size[d] + indices[d];
  }
  return flatIndex;
}
