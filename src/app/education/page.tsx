/**
 * Lens 1: the socioeconomic gradient in lower secondary results, by
 * parents' education, from SSB table 11689.
 *
 * This lens used to be the app's `/` -- it was both the entry point and a
 * lens, which is why the nav floated above its H1. `/` is now an entry page
 * of its own and this lens lives at its own segment like the other three
 * (docs/adr/ADR-002-exploration-surface.md, amendment of 2026-09-22).
 *
 * The page itself is a server component and holds no data: the snapshot is
 * imported by `EducationLens`, which owns the selected cross-section. The
 * route is still prerendered to static HTML -- no lens reads
 * `useSearchParams`, so nothing is deferred to the browser and `next build`
 * reports this route as `○ (Static)`. Per
 * docs/adr/ADR-001-ssb-ingest-boundary.md the number of SSB requests made
 * while serving it is zero.
 */

import type { Metadata } from "next";
import { EducationLens } from "./education-lens";
import { LensNav } from "../_components/lens-nav";
import { SourceFooter } from "../_components/source-footer";
import styles from "../_components/lens-page.module.css";

export const metadata: Metadata = {
  title: "Parents' education — norgrade",
  description:
    "How much do a Norwegian pupil's lower secondary results track their parents' education? SSB table 11689, every year and every points bracket.",
};

export default function EducationPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <LensNav current="/education" />
        <EducationLens />
        <SourceFooter
          tables={[
            {
              id: "11689",
              title: "Lower secondary school points, by sex, parents' education and year",
            },
          ]}
          filteredTo="the sexes, points bracket, parental education levels and years shown above"
        />
      </main>
    </div>
  );
}
