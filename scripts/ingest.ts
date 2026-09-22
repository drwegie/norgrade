/**
 * Ingest: the only place in this repo that talks to SSB over HTTP.
 *
 * Per docs/adr/ADR-001-ssb-ingest-boundary.md, request-path code never calls
 * `fetchTable`; all four tables are fetched here and written to JSON
 * snapshots under `data/ssb/`. Cloud persistence has not been approved, so
 * this takes the ADR's "commit a JSON snapshot instead" branch.
 *
 * Properties this script is responsible for:
 *
 * - **Sequential fetching.** Four requests against a 30 req/min per-IP
 *   limit does not need concurrency, and issuing them one at a time keeps
 *   the ingest's own burst well inside the budget.
 * - **An explicit timeout per request.** Node's `fetch` has no default
 *   timeout, so a hung connection would hang the ingest indefinitely.
 * - **The `current` region assertion** demanded by ADR-001 and by the
 *   WEAKNESS note in src/lib/ssb/region.ts: that classifier infers "current"
 *   from the *absence* of a "(-YYYY)" suffix, a negative inference, so the
 *   set it produces is compared against an enumerated expectation here and
 *   the run fails loudly on any drift. Checked per table, because the
 *   Region dimension is not the same (and not even present) on every table.
 * - **Deterministic output**, so that re-running ingest on unchanged data
 *   produces no diff and a real data revision produces a reviewable one.
 *   Nothing derived from the wall clock is written.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchTable } from "../src/lib/ssb/client";
import { partitionRegions } from "../src/lib/ssb/region";
import {
  TABLES,
  assertCurrentRegions,
  countSpecialValues,
  serializeSnapshot,
} from "./ingest-core";

const OUTPUT_DIR = path.join(process.cwd(), "data", "ssb");

/** Node's `fetch` has no default timeout; without this a stalled TCP connection hangs ingest forever. */
const REQUEST_TIMEOUT_MS = 60_000;

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const problems: string[] = [];

  // Sequential on purpose -- see the header comment.
  for (const spec of TABLES) {
    process.stdout.write(`\n[${spec.tableId}] fetching...\n`);

    const table = await fetchTable({
      tableId: spec.tableId,
      valueCodes: spec.valueCodes,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const regionProblems = assertCurrentRegions(table, spec.expectedCurrentRegions);
    problems.push(...regionProblems);

    if (spec.expectedCurrentRegions === null) {
      process.stdout.write(`[${spec.tableId}] regions: n/a (table has no Region dimension) OK\n`);
    } else if (regionProblems.length === 0) {
      const { current, historical, nonGeographic, aggregate } = partitionRegions(
        table.dimensions.Region.categories,
      );
      process.stdout.write(
        `[${spec.tableId}] regions: current=${current.length} ` +
          `[${current.map((r) => r.code).join(", ")}] matches expected set OK ` +
          `(historical=${historical.length}, non-geographic=${nonGeographic.length}, ` +
          `aggregate=${aggregate.length})\n`,
      );
    } else {
      for (const problem of regionProblems) {
        process.stderr.write(`[${spec.tableId}] REGION ASSERTION FAILED: ${problem}\n`);
      }
    }

    const counts = countSpecialValues(table);
    process.stdout.write(
      `[${spec.tableId}] cells=${table.cells.length} ` +
        `special values: "."(not applicable)=${counts.notApplicable}, ` +
        `".."(not available)=${counts.notAvailable}, ` +
        `":"(confidential)=${counts.confidential}\n`,
    );

    const outputPath = path.join(OUTPUT_DIR, `${spec.tableId}.json`);
    const serialized = serializeSnapshot(table);
    await writeFile(outputPath, serialized, "utf8");
    process.stdout.write(
      `[${spec.tableId}] wrote ${path.relative(process.cwd(), outputPath)} ` +
        `(${Buffer.byteLength(serialized, "utf8")} bytes)\n`,
    );
  }

  if (problems.length > 0) {
    process.stderr.write(
      `\ningest FAILED: ${problems.length} region assertion problem(s). ` +
        `The snapshots above were still written, but must not be committed until ` +
        `src/lib/ssb/region.ts and the expected sets in this script are reconciled ` +
        `with what SSB now returns.\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`\ningest OK: ${TABLES.length} tables written to ${path.relative(process.cwd(), OUTPUT_DIR)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`\ningest FAILED: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
