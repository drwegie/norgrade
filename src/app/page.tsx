/**
 * The entry page.
 *
 * `/` used to be the parents' education lens, so the app had no front door:
 * the reader landed inside one of four questions with the nav floating
 * above its heading, and nothing said what the other three were or where
 * the figures came from. That lens now lives at `/education` and this page
 * introduces the four (docs/adr/ADR-002-exploration-surface.md, amendment
 * of 2026-09-22).
 *
 * It is a server component, and the one figure it quotes is computed here
 * at build time from the same module the education lens uses
 * (`./education/table-11689.ts`), so the number cannot drift from the lens
 * it points at. Only the computed numbers reach the HTML -- the table's
 * cells stay in `/education`'s client chunk -- and the route is prerendered
 * as `○ (Static)`. Per docs/adr/ADR-001-ssb-ingest-boundary.md it makes no
 * SSB request.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LensNav } from "./_components/lens-nav";
import { LENSES } from "./_components/lenses";
import { SourceFooter } from "./_components/source-footer";
import { categoryLabel } from "@/lib/ssb/select";
import {
  HIGHEST_EDUCATION,
  LATEST_YEAR,
  latestGradient,
  LOWEST_EDUCATION,
  table11689,
  TOP_BRACKET,
} from "./education/table-11689";
import lensStyles from "./_components/lens-page.module.css";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "norgrade — the socioeconomic gradient in Norwegian school results",
  description:
    "Four lenses on one question: how much do a Norwegian pupil's school results track their parents' education, their household's income and where they live? Built on SSB's own tables.",
};

/**
 * The date the committed snapshots were last written (the commit that added
 * `data/ssb/`). Ingest writes nothing clock-derived, on purpose, so this is
 * stated here rather than read out of the files.
 */
const SNAPSHOT_DATE = "22 September 2026";

const gradient = latestGradient(TOP_BRACKET);
const bracketLabel = categoryLabel(table11689, "Poeng", TOP_BRACKET);
const highestLabel = categoryLabel(table11689, "ForeldrUtd", HIGHEST_EDUCATION).toLowerCase();
const lowestLabel = categoryLabel(table11689, "ForeldrUtd", LOWEST_EDUCATION).toLowerCase();

export default function Home() {
  return (
    <div className={lensStyles.page}>
      <main className={lensStyles.main}>
        <LensNav current="/" />

        <header className={lensStyles.header}>
          <h1 className={lensStyles.title}>
            How much does a Norwegian pupil&rsquo;s background follow them through school?
          </h1>
          <p className={lensStyles.lede}>
            Norwegian pupils leave lower secondary school with a score, grunnskolepoeng, and some
            years later they have either finished upper secondary school or they have not.
            Statistics Norway (SSB) publishes both broken down by the pupil&rsquo;s background: by
            their parents&rsquo; education, by the household&rsquo;s income, by how many adults at
            home are in work, and by county. This app charts those breakdowns, one table per page.
          </p>
          <p className={lensStyles.lede}>
            It answers one question &mdash; how far apart are pupils from different backgrounds,
            and is the gap closing &mdash; rather than offering a school-by-school browser. The
            same tables are published in SSB&rsquo;s own statbank and can be read there; what is
            here is a chart of four of them, side by side, with the missing and confidential cells
            kept visibly missing.
          </p>
        </header>

        {gradient ? (
          <section className={styles.figure} aria-labelledby="headline-figure">
            <h2 className={styles.figureHeading} id="headline-figure">
              One figure to start with
            </h2>
            <p className={styles.figureNumber}>{gradient.ratio.toFixed(1)}&times;</p>
            <p className={styles.figureBody}>
              In {LATEST_YEAR}, {gradient.highest.toFixed(1)}% of pupils whose parents hold{" "}
              {highestLabel} left lower secondary school with{" "}
              &ldquo;{bracketLabel.toLowerCase()}&rdquo;, against {gradient.lowest.toFixed(1)}% of
              pupils whose parents have {lowestLabel} &mdash; {gradient.ratio.toFixed(1)} times as
              many.
            </p>
            <p className={styles.figureNote}>
              SSB table 11689, both sexes together, {LATEST_YEAR} cohort, points bracket &ldquo;
              {bracketLabel}&rdquo;. The two shares are published by SSB; the ratio is this
              app&rsquo;s own division of them, and it is the only arithmetic performed anywhere
              here. The <Link href="/education">parents&rsquo; education lens</Link> shows the same
              figure for every bracket and every year from{" "}
              {table11689.dimensions.Tid.categories[0].label} on.
            </p>
          </section>
        ) : null}

        <section className={styles.lenses} aria-labelledby="lenses-heading">
          <h2 className={styles.lensesHeading} id="lenses-heading">
            Four lenses
          </h2>
          <ul className={styles.lensList}>
            {LENSES.map((lens) => (
              <li key={lens.href}>
                <Link href={lens.href} className={styles.lensCard}>
                  <span className={styles.lensLabel}>{lens.label}</span>
                  <span className={styles.lensQuestion}>{lens.question}</span>
                  <span className={styles.lensSummary}>{lens.summary}</span>
                  <span className={styles.lensTable}>SSB table {lens.table}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.lensesNote}>
            The sex and the parental education level you pick stay selected as you move between
            lenses, and each page says when a choice was carried in from another one. Table 14882
            has no parents&rsquo; education, so that choice is held rather than applied there.
          </p>
        </section>

        <section className={styles.provenance} aria-labelledby="provenance-heading">
          <h2 className={styles.provenanceHeading} id="provenance-heading">
            Where the figures come from
          </h2>
          <ul>
            <li>
              All four tables come from{" "}
              <a href="https://data.ssb.no/api/pxwebapi/v2/" rel="noopener noreferrer">
                SSB&rsquo;s PxWebApi v2
              </a>
              , and each one can also be read directly in{" "}
              <a href="https://www.ssb.no/statbank" rel="noopener noreferrer">
                SSB&rsquo;s statbank
              </a>
              , where the same numbers are available as tables.
            </li>
            <li>
              The data is fetched once, at build time, and committed to this repository as a
              snapshot; the pages are prerendered from it. Nothing is requested from SSB while you
              read a page, so an SSB outage cannot break this app &mdash; and a later SSB revision
              does not reach it until the snapshot is taken again.
            </li>
            <li>
              The snapshots in use were written on {SNAPSHOT_DATE}. The underlying statistics are
              published annually; the newest cohort in table 11689 is {LATEST_YEAR}.
            </li>
            <li>
              SSB marks cells &ldquo;.&rdquo; (not applicable), &ldquo;..&rdquo; (not available) and
              &ldquo;:&rdquo; (confidential). None of the three is drawn as a zero anywhere in this
              app: the line breaks, or the bar is left out, and SSB&rsquo;s own marker is printed
              instead.
            </li>
          </ul>
        </section>

        <SourceFooter
          tables={[
            {
              id: "11689",
              title: "Lower secondary school points, by sex, parents' education and year",
            },
          ]}
          filteredTo={`the two parental education levels, points bracket "${bracketLabel}", both sexes and the year ${LATEST_YEAR} used in the figure above`}
        />
      </main>
    </div>
  );
}
