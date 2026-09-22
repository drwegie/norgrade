"use client";

/**
 * Lens 4: who finishes upper secondary school within five years, by county
 * (SSB 14882).
 *
 * The snapshot is imported here, inside the client boundary, so that table
 * 14882's ~35k cells land in this route's client chunk and nowhere else
 * (docs/adr/ADR-002-exploration-surface.md). It is the biggest of the four
 * and the reason the "one page with all the data" option was rejected.
 *
 * Sex is taken from the shared selection so it survives arriving from
 * another lens -- but this table does not number the sexes the way the
 * other three do (`0/2/1` against `0/11/10`, measured; see
 * ../_components/shared-dimensions.ts), so the code is translated rather
 * than passed through. Parents' education is not a dimension of 14882 at
 * all, so a level chosen elsewhere is held for the other lenses and never
 * applied here; the notes below say so.
 *
 * The region set is built by `completionRegions`, not by
 * `partitionRegions().current`: this table is reported in the pre-2020
 * fylke division, and the one handover inside it (Sør-/Nord-Trøndelag ->
 * Trøndelag) is stated on the page rather than mixed silently. See
 * src/lib/ssb/completion-regions.ts.
 */

import { useState } from "react";
import { CarriedSelection } from "../_components/carried-selection";
import { ControlGroup } from "../_components/control-group";
import { LENS_LABELS } from "../_components/lenses";
import { RegionBars } from "../_components/region-bars";
import { useSharedSelection } from "../_components/selection-context";
import {
  SEX_CODE_IN_14882,
  SHARED_SEX_CODE_FROM_14882,
  SHARED_SEX_CODES,
  EDUCATION_SHORT_LABELS,
} from "../_components/shared-dimensions";
import { tableOptions } from "../_components/table-options";
import {
  completionRegions,
  TRONDELAG_MERGER,
  type RegionBar,
} from "@/lib/ssb/completion-regions";
import { categoryLabel } from "@/lib/ssb/select";
import { decodeSnapshot } from "@/lib/ssb/snapshot";
import styles from "../_components/lens-page.module.css";

import snapshot14882 from "../../../data/ssb/14882.json";

const table = decodeSnapshot(snapshot14882);

const LENS = LENS_LABELS.completion;

/** Per cent of the cohort, as published; the sibling `Personer` is a head count. */
const CONTENTS_CODE = "Prosent";
/**
 * Prior attainment is held at the table's own "All marks" total: the three
 * controls below are already the interval, the outcome and the sex, and a
 * fourth would make the page a query builder rather than a question.
 */
const POINTS_CODE = "01-09";

/**
 * The six real outcomes. The table's "5 Total" is left out: as a percentage
 * it is 100 for every region.
 */
const OUTCOME_CODES = ["1a", "2a", "4b", "003a", "8b", "9"] as const;
/**
 * SSB's labels for these are full sentences. The chips carry a shortened
 * form and SSB's own wording as their tooltip, and the selected outcome is
 * spelled out in full under the controls.
 */
const OUTCOME_SHORT_LABELS: Record<string, string> = {
  "1a": "Completed on time",
  "2a": "Completed, took longer",
  "4b": "Completed basic competence",
  "003a": "Still studying",
  "8b": "Failed final exam",
  "9": "Dropped out",
};

/** This table's own sex codes, in the order the other lenses list them. */
const SEX_CODES = SHARED_SEX_CODES.map((code) => SEX_CODE_IN_14882[code]);

const INTERVALS = table.dimensions.Tid.categories.map((category) => category.code);
const DEFAULT_INTERVAL = INTERVALS[INTERVALS.length - 1];

const INTERVAL_OPTIONS = tableOptions(table, "Tid", INTERVALS);
const OUTCOME_OPTIONS = tableOptions(table, "FullforingVGO", OUTCOME_CODES, OUTCOME_SHORT_LABELS);
const SEX_OPTIONS = tableOptions(table, "Kjonn", SEX_CODES);

const HANDOVER_CODES = [...TRONDELAG_MERGER.predecessors, TRONDELAG_MERGER.successor];

/** Largest first, with cells that carry no value last, in SSB's own order. */
function byValueDescending(a: RegionBar, b: RegionBar): number {
  if (a.cell.kind !== "value") return b.cell.kind === "value" ? 1 : 0;
  if (b.cell.kind !== "value") return -1;
  return b.cell.value - a.cell.value;
}

export function CompletionLens() {
  const { sex: sharedSex, sexChosenOn, chooseSex, education, educationChosenOn } =
    useSharedSelection();
  const [period, setPeriod] = useState<string>(DEFAULT_INTERVAL);
  const [outcome, setOutcome] = useState<string>(OUTCOME_CODES[0]);
  const sex = SEX_CODE_IN_14882[sharedSex];

  const { bars, notApplicable, handover } = completionRegions(table, {
    FullforingVGO: outcome,
    Kjonn: sex,
    Poeng: POINTS_CODE,
    ContentsCode: CONTENTS_CODE,
    Tid: period,
  });
  const rows = [...bars].sort(byValueDescending);

  const intervalLabel = categoryLabel(table, "Tid", period);
  const outcomeLabel = categoryLabel(table, "FullforingVGO", outcome);
  const sexLabel = categoryLabel(table, "Kjonn", sex);

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Where does the cohort end up five years later?</h1>
        <p className={styles.lede}>
          Share of each county&rsquo;s cohort reaching a given outcome in upper secondary school
          within five years (six for vocational tracks), for SSB&rsquo;s seven-year intervals{" "}
          {categoryLabel(table, "Tid", INTERVALS[0])} to{" "}
          {categoryLabel(table, "Tid", INTERVALS[INTERVALS.length - 1])}. The spread between the
          highest and lowest county is the same gradient again, drawn across geography instead of
          across parents.
        </p>
      </header>

      <CarriedSelection
        currentLens={LENS}
        items={[
          {
            from: sexChosenOn,
            description: (
              <>
                pupils, <strong>{categoryLabel(table, "Kjonn", sex)}</strong> &mdash; SSB&rsquo;s
                wording for that group in this table
              </>
            ),
          },
          {
            from: educationChosenOn,
            description: (
              <>
                parents&rsquo; education, <strong>
                  {EDUCATION_SHORT_LABELS[education] ?? education}
                </strong>{" "}
                &mdash; table 14882 does not break the cohort down by it, so the choice is held for
                the other lenses rather than applied here
              </>
            ),
          },
        ]}
      />

      <div className={styles.controls}>
        <h2 className={styles.controlsHeading}>Choose a cross-section</h2>
        <ControlGroup
          name="interval"
          legend="Seven-year interval"
          options={INTERVAL_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
        <ControlGroup
          name="outcome"
          legend="Outcome after five years"
          options={OUTCOME_OPTIONS}
          value={outcome}
          onChange={setOutcome}
        />
        <ControlGroup
          name="sex"
          legend="Pupils"
          options={SEX_OPTIONS}
          value={sex}
          onChange={(code) => chooseSex(SHARED_SEX_CODE_FROM_14882[code], LENS)}
        />
      </div>

      <p className={styles.slice}>
        Showing: <strong>{sexLabel}</strong>, {intervalLabel}, outcome as SSB words it &mdash;
        &ldquo;{outcomeLabel}&rdquo;.
      </p>

      <RegionBars
        title={`${outcomeLabel}, ${intervalLabel} (${sexLabel.toLowerCase()})`}
        description={
          `Horizontal bar chart, one bar per county, largest first. Per cent of the ${intervalLabel} ` +
          `cohort (${sexLabel.toLowerCase()}) whose outcome after five years was "${outcomeLabel}". ` +
          `${rows.length} counties are shown, in the county division SSB reports this table in.`
        }
        rows={rows}
        unit="%"
        highlightCodes={HANDOVER_CODES}
      />

      <section className={styles.notes}>
        <h2 className={styles.notesHeading}>Reading this chart</h2>
        <ul>
          <li>
            <strong>These are the pre-2020 counties.</strong> SSB reports this table in the county
            division in force before the 2020 mergers, which is why most labels carry SSB&rsquo;s
            own &ldquo;(-2019)&rdquo; or &ldquo;(-2017)&rdquo; suffix. They are not today&rsquo;s
            counties and are not redrawn here as if they were.
          </li>
          <li>
            <strong>Trøndelag changes hands mid-table</strong> (highlighted in orange).{" "}
            {handover === "predecessors" ? (
              <>
                For {intervalLabel}, SSB reports{" "}
                {TRONDELAG_MERGER.predecessors
                  .map((code) => categoryLabel(table, "Region", code))
                  .join(" and ")}{" "}
                separately, and has no figure for the merged{" "}
                {categoryLabel(table, "Region", TRONDELAG_MERGER.successor)}, so no bar is drawn for
                it. The two are shown as they are published and are never added together &mdash;
                adding two published percentages would not be a published figure.
              </>
            ) : handover === "successor" ? (
              <>
                {TRONDELAG_MERGER.predecessors
                  .map((code) => categoryLabel(table, "Region", code))
                  .join(" and ")}{" "}
                merged into {categoryLabel(table, "Region", TRONDELAG_MERGER.successor)} in 2018.
                For {intervalLabel} SSB reports the merged county only, so the two predecessors have
                no bar. Comparing this bar with the two above it in an earlier interval is comparing
                different areas.
              </>
            ) : (
              <>
                For {intervalLabel} the table reports neither the expected pre-merger pair nor the
                merged county alone, which is not a shape this page anticipated &mdash; read the
                bars as published and treat the Trøndelag rows with care.
              </>
            )}
          </li>
          <li>
            Counties whose cell for this slice is SSB&rsquo;s &ldquo;.&rdquo; (category not
            applicable) are left out rather than drawn as a zero-length bar
            {notApplicable.length > 0 ? (
              <>
                {" "}
                &mdash; {notApplicable.length} here:{" "}
                {notApplicable.map((row) => row.label).join(", ")}
              </>
            ) : null}
            . &ldquo;..&rdquo; (not available) and &ldquo;:&rdquo; (confidential) stay in the chart
            and are printed as SSB&rsquo;s own marker where the bar would have ended.
          </li>
          <li>
            This table has no parents&rsquo; education, so a level chosen on the other lenses
            cannot be applied here. It is held rather than discarded: going back to one of those
            lenses finds it still selected.
          </li>
          <li>
            Svalbard and &ldquo;Abroad&rdquo; are not counties and the national total is not a
            county, so none of the three is a bar here.
          </li>
          <li>
            Prior attainment is held at the table&rsquo;s own &ldquo;
            {categoryLabel(table, "Poeng", POINTS_CODE)}&rdquo; total, and each interval is seven
            years wide because a five-year completion window needs five years of follow-up.
          </li>
        </ul>
      </section>
    </>
  );
}
