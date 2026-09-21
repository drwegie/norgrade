import { getCached, setCached } from "./cache";
import { parseJsonStat2, type JsonStat2Dataset } from "./parser";
import type { ParsedTable } from "./types";

const BASE_URL = "https://data.ssb.no/api/pxwebapi/v2/tables";

export interface FetchTableOptions {
  tableId: string;
  /**
   * Dimension name -> value code selector, e.g. `{ Tid: "2024", Kjonn: "*" }`.
   * Non-eliminable dimensions (currently `Tid` and `ContentsCode` on every
   * table used here) MUST be given explicitly; eliminable dimensions
   * (`Kjonn`, `Poeng`, `ForeldrUtd`, `Region`, ...) default to the
   * aggregated total if omitted, per SSB PxWebApi v2 semantics.
   */
  valueCodes: Record<string, string>;
  lang?: "en" | "no" | "nb" | "nn";
  /** Override the cache TTL for this request (milliseconds). */
  cacheTtlMs?: number;
  signal?: AbortSignal;
}

export function buildTableUrl({ tableId, valueCodes, lang = "en" }: FetchTableOptions): string {
  const params = new URLSearchParams();
  params.set("lang", lang);
  // Sort dimension names so that logically identical queries produce a
  // byte-identical URL regardless of object insertion order. The URL is the
  // cache key, so an unsorted key would silently miss the cache.
  for (const dimension of Object.keys(valueCodes).sort()) {
    params.set(`valueCodes[${dimension}]`, valueCodes[dimension]);
  }
  params.set("outputFormat", "json-stat2");
  return `${BASE_URL}/${tableId}/data?${params.toString()}`;
}

/**
 * Fetches and parses one SSB table, going through the process-local cache
 * first. Throws on non-2xx responses instead of returning partial data.
 */
export async function fetchTable(options: FetchTableOptions): Promise<ParsedTable> {
  const url = buildTableUrl(options);

  const cached = getCached<ParsedTable>(url);
  if (cached) {
    return cached;
  }

  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(
      `SSB PxWebApi request failed: ${response.status} ${response.statusText} (${url})`,
    );
  }

  const raw = (await response.json()) as JsonStat2Dataset;
  const parsed = parseJsonStat2(options.tableId, raw);

  setCached(url, parsed, options.cacheTtlMs);
  return parsed;
}
