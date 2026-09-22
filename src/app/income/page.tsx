/**
 * Lens 2: household income (SSB table 13716).
 *
 * Server component, no data of its own: `IncomeLens` imports the snapshot
 * and owns the selected cross-section. Prerendered to static HTML -- no
 * `useSearchParams` anywhere below this point -- and, per
 * docs/adr/ADR-001-ssb-ingest-boundary.md, it makes no SSB request.
 */

import type { Metadata } from "next";
import { IncomeLens } from "./income-lens";
import { LensNav } from "../_components/lens-nav";
import { SourceFooter } from "../_components/source-footer";
import styles from "../_components/lens-page.module.css";

export const metadata: Metadata = {
  title: "Household income — norgrade",
  description:
    "Average Norwegian lower secondary school points by household income quintile, with parents' education held fixed. SSB table 13716.",
};

export default function IncomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <LensNav current="/income" />
        <IncomeLens />
        <SourceFooter
          tables={[
            {
              id: "13716",
              title:
                "Average lower secondary school points, by sex, parents' education, household income and year",
            },
          ]}
          filteredTo="the sex, parental education level, income quintiles and years shown above"
        />
      </main>
    </div>
  );
}
