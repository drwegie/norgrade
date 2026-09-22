/**
 * Lens 4: finishing upper secondary school, by county (SSB table 14882).
 *
 * Server component, no data of its own: `CompletionLens` imports the
 * snapshot and owns the selected cross-section, which keeps this table's
 * ~35k cells in this route's client chunk and out of every other page.
 * Prerendered to static HTML -- no `useSearchParams` anywhere below this
 * point -- and, per docs/adr/ADR-001-ssb-ingest-boundary.md, it makes no
 * SSB request.
 */

import type { Metadata } from "next";
import { CompletionLens } from "./completion-lens";
import { LensNav } from "../_components/lens-nav";
import { SourceFooter } from "../_components/source-footer";
import styles from "../_components/lens-page.module.css";

export const metadata: Metadata = {
  title: "Finishing upper secondary — norgrade",
  description:
    "Completion of Norwegian upper secondary school within five years, county by county, in the county division SSB reports it in. SSB table 14882.",
};

export default function CompletionPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <LensNav current="/completion" />
        <CompletionLens />
        <SourceFooter
          tables={[
            {
              id: "14882",
              title:
                "Completion of upper secondary education, by region, degree of completion, sex, lower secondary school points and interval",
            },
          ]}
          filteredTo="the counties, interval, outcome and sex shown above, with prior attainment left at the table's own total"
        />
      </main>
    </div>
  );
}
