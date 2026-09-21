export { buildTableUrl, fetchTable, type FetchTableOptions } from "./client";
export { clearCache } from "./cache";
export { parseJsonStat2, type JsonStat2Dataset, type JsonStat2Dimension } from "./parser";
export { classifyRegion, partitionRegions, type RegionClassification } from "./region";
export type {
  ParsedCell,
  ParsedTable,
  SsbCategory,
  SsbCell,
  SsbDimension,
} from "./types";
