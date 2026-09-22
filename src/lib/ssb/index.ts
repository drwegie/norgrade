export { buildTableUrl, fetchTable, type FetchTableOptions } from "./client";
export { clearCache } from "./cache";
export {
  completionRegions,
  TRONDELAG_MERGER,
  type CompletionRegions,
  type RegionBar,
  type TrondelagHandover,
} from "./completion-regions";
export { decodeFlatIndex, encodeFlatIndex } from "./layout";
export { parseJsonStat2, type JsonStat2Dataset, type JsonStat2Dimension } from "./parser";
export { classifyRegion, partitionRegions, type RegionClassification } from "./region";
export { categoryLabel, selectCell, selectSeries } from "./select";
export { decodeSnapshot, type EncodedCell, type SnapshotFile } from "./snapshot";
export type {
  ParsedTable,
  SsbCategory,
  SsbCell,
  SsbDimension,
} from "./types";
