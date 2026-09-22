export { buildTableUrl, fetchTable, type FetchTableOptions } from "./client";
export { clearCache } from "./cache";
export { decodeFlatIndex, encodeFlatIndex } from "./layout";
export { parseJsonStat2, type JsonStat2Dataset, type JsonStat2Dimension } from "./parser";
export { classifyRegion, partitionRegions, type RegionClassification } from "./region";
export { selectCell, selectSeries } from "./select";
export { decodeSnapshot, type EncodedCell, type SnapshotFile } from "./snapshot";
export type {
  ParsedCell,
  ParsedTable,
  SsbCategory,
  SsbCell,
  SsbDimension,
} from "./types";
