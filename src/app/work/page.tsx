/**
 * Lens 3: parents in work (SSB table 13717).
 *
 * Server component, no data of its own: `WorkLens` imports the snapshot and
 * owns the selected cross-section. Prerendered to static HTML -- no
 * `useSearchParams` anywhere below this point -- and, per
 * docs/adr/ADR-001-ssb-ingest-boundary.md, it makes no SSB request.
 */

import type { Metadata } from "next";
import { WorkLens } from "./work-lens";
import { LensNav } from "../_components/lens-nav";
import { SourceFooter } from "../_components/source-footer";
import styles from "../_components/lens-page.module.css";

export const metadata: Metadata = {
  title: "Parents in work — norgrade",
  description:
    "Average Norwegian lower secondary school points by the number of economically active adults in the household. SSB table 13717.",
};

export default function WorkPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <LensNav current="/work" />
        <WorkLens />
        <SourceFooter
          tables={[
            {
              id: "13717",
              title:
                "Average lower secondary school points, by sex, parents' education, economically active persons in the household and year",
            },
          ]}
          filteredTo="the sex, parental education level, household work categories and years shown above"
        />
      </main>
    </div>
  );
}
