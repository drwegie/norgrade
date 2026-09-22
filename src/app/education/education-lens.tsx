"use client";

/**
 * Lens 1: the gradient in lower secondary results, by parents' education.
 *
 * This Client Component imports the committed snapshot of SSB table 11689
 * (via `table-11689.ts`) as a JSON module **itself**, rather than receiving
 * the decoded table as a prop from the page. Data handed across the
 * server/client boundary is serialized into the RSC flight payload and
 * inlined into the HTML, so it would be paid for twice; imported here, it
 * is one entry in this route's client chunk instead
 * (docs/adr/ADR-002-exploration-surface.md).
 *
 * Which sex is shown is not private to this lens: it lives in the shared
 * selection (src/app/_components/selection-context.tsx) so that it survives
 * a move to another lens. Parents' education is *not* shared from here --
 * on this lens it is not a slice but the thing being drawn, one line per
 * level -- so a level chosen elsewhere is held, not applied, and the page
 * says so rather than appearing to ignore it.
 *
 * Nothing here touches the network -- ADR-001 holds: the number of SSB
 * requests made while serving this page is zero, at build time and after
 * hydration alike.
 */

import { useState } from "react";
import { CarriedSelection } from "../_components/carried-selection";
import { ControlGroup } from "../_components/control-group";
import { GradientChart, type ChartSeries } from "../_components/gradient-chart";
import { niceMax } from "../_components/chart-scale";
import { LENS_LABELS } from "../_components/lenses";
import { useSharedSelection } from "../_components/selection-context";
import {
  EDUCATION_SHORT_LABELS,
  type SharedSexCode,
} from "../_components/shared-dimensions";
import { tableOptions } from "../_components/table-options";
import { categoryLabel, selectSeries } from "@/lib/ssb/select";
import {
  CONTENTS_CODE,
  HIGHEST_EDUCATION,
  LATEST_YEAR,
  latestGradient,
  LOWEST_EDUCATION,
  table11689 as table,
  TOP_BRACKET,
  YEARS,
} from "./table-11689";
import styles from "../_components/lens-page.module.css";

const LENS = LENS_LABELS.education;

/**
 * Table 11689 publishes the *distribution* of pupils across points
 * brackets, not a mean, so every measure shown here is one published
 * bracket rather than an average computed in the app. The table's own
 * "01-09 All marks" total is not offered: as a percentage it is 100 for
 * every group and says nothing.
 */
const BRACKET_CODES = ["01a", "02", "03", "04", "05", "06", "07", "08", "09"] as const;
const DEFAULT_BRACKET = TOP_BRACKET;

/**
 * The four real levels of parental education, from lowest to highest. The
 * table's other two categories are left out because neither is a level:
 * "00" is the all-levels total and "99" is the residual "Unknown".
 */
const EDUCATION_LEVELS: Array<{ code: string; color: string }> = [
  { code: LOWEST_EDUCATION, color: "#d7263d" },
  { code: "02b", color: "#e08c1a" },
  { code: "03b", color: "#2e9e8f" },
  { code: HIGHEST_EDUCATION, color: "#5c7aea" },
];

/**
 * "11+10" keeps the two-panel girls/boys comparison the page opened with as
 * the default view; the other three options are single panels. Only the
 * single panels correspond to a shared sex -- "Girls and boys" is two
 * categories at once and so is deliberately not carried to the other
 * lenses, which show one panel.
 */
const BOTH_PANELS = "11+10";
const VIEW_OPTIONS = [
  { value: BOTH_PANELS, label: "Girls and boys" },
  { value: "0", label: "Both sexes together" },
  { value: "11", label: "Girls only" },
  { value: "10", label: "Boys only" },
] as const;

const BRACKET_OPTIONS = tableOptions(table, "Poeng", BRACKET_CODES, {
  "09": "Missing points",
});

function seriesForSex(sex: string, bracket: string): ChartSeries[] {
  return EDUCATION_LEVELS.map(({ code, color }) => ({
    key: code,
    label: categoryLabel(table, "ForeldrUtd", code),
    color,
    points: selectSeries(table, "Tid", {
      Kjonn: sex,
      Poeng: bracket,
      ForeldrUtd: code,
      ContentsCode: CONTENTS_CODE,
    }),
  }));
}

export function EducationLens() {
  const { sex, sexChosenOn, chooseSex, education, educationChosenOn } = useSharedSelection();
  /**
   * The view is seeded from the shared selection, so arriving from another
   * lens keeps the sex that was chosen there; a reader who has chosen
   * nothing yet still gets the two-panel comparison. Seeding at mount is
   * enough because nothing else changes the shared sex while this lens is
   * on screen.
   */
  const [view, setView] = useState<string>(() => (sexChosenOn === null ? BOTH_PANELS : sex));
  const [bracket, setBracket] = useState<string>(DEFAULT_BRACKET);

  function handleView(next: string) {
    setView(next);
    if (next !== BOTH_PANELS) {
      chooseSex(next as SharedSexCode, LENS);
    }
  }

  const bracketLabel = categoryLabel(table, "Poeng", bracket);
  const panels = view
    .split("+")
    .map((panelSex) => ({
      sex: panelSex,
      label: categoryLabel(table, "Kjonn", panelSex),
      series: seriesForSex(panelSex, bracket),
    }));

  // One y scale for all panels: two charts of the same measure that are
  // meant to be compared by eye must not be scaled independently.
  const sharedYMax = niceMax(panels.flatMap((panel) => panel.series).flatMap((s) => s.points));
  const gradient = latestGradient(bracket);

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>How far do a pupil&rsquo;s parents get them?</h1>
        <p className={styles.lede}>
          Share of Norwegian pupils finishing lower secondary school in a chosen bracket of
          grunnskolepoeng, by their <strong>parents&rsquo; highest completed education</strong>,{" "}
          {YEARS[0]}&ndash;{LATEST_YEAR}. Pick the bracket and who is counted; the gradient is there
          in every one of them.
        </p>
        {gradient ? (
          <p className={styles.lede}>
            In {LATEST_YEAR}, {gradient.highest.toFixed(1)}% of pupils whose parents hold{" "}
            {categoryLabel(table, "ForeldrUtd", HIGHEST_EDUCATION).toLowerCase()} were in the{" "}
            &ldquo;{bracketLabel.toLowerCase()}&rdquo; bracket, against {gradient.lowest.toFixed(1)}%
            of pupils whose parents have{" "}
            {categoryLabel(table, "ForeldrUtd", LOWEST_EDUCATION).toLowerCase()} &mdash; a ratio of{" "}
            {gradient.ratio.toFixed(1)}&times;. Both figures are published by SSB; the ratio is this
            page&rsquo;s own division of the two.
          </p>
        ) : null}
      </header>

      <CarriedSelection
        currentLens={LENS}
        items={[
          {
            from: sexChosenOn,
            description: (
              <>
                pupils, <strong>{categoryLabel(table, "Kjonn", sex)}</strong>
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
                &mdash; this chart draws every level, so the choice is not applied here but is
                still held for the income and work lenses
              </>
            ),
          },
        ]}
      />

      <div className={styles.controls}>
        <h2 className={styles.controlsHeading}>Choose a cross-section</h2>
        <ControlGroup
          name="bracket"
          legend="Grunnskolepoeng bracket"
          options={BRACKET_OPTIONS}
          value={bracket}
          onChange={setBracket}
        />
        <ControlGroup
          name="view"
          legend="Who is counted"
          options={VIEW_OPTIONS}
          value={view}
          onChange={handleView}
        />
      </div>

      <div className={panels.length > 1 ? styles.charts : undefined}>
        {panels.map((panel) => (
          <GradientChart
            key={panel.sex}
            title={panel.label}
            description={
              `Line chart. ${panel.label}: the share of pupils in the "${bracketLabel}" bracket ` +
              `of grunnskolepoeng, ${YEARS[0]} to ${LATEST_YEAR}, with one line per level of ` +
              `parents' education.`
            }
            categories={YEARS}
            series={panel.series}
            unit="%"
            yMax={sharedYMax}
          />
        ))}
      </div>

      <section className={styles.notes}>
        <h2 className={styles.notesHeading}>Reading this chart</h2>
        <ul>
          <li>
            All panels share one y axis, and the axis starts at zero, so panels can be compared
            directly and no difference is exaggerated by a cropped scale.
          </li>
          <li>
            The table&rsquo;s &ldquo;{categoryLabel(table, "ForeldrUtd", "00")}&rdquo; total and its
            residual &ldquo;{categoryLabel(table, "ForeldrUtd", "99")}&rdquo; category are not
            plotted, because neither is a level of education. Its &ldquo;
            {categoryLabel(table, "Poeng", "01-09")}&rdquo; total is not offered as a bracket,
            because as a percentage it is 100 for every group.
          </li>
          <li>
            &ldquo;Girls and boys&rdquo; draws two panels at once, so it is not a single sex and is
            not carried to the other lenses; the three single-panel choices are.
          </li>
          <li>
            Missing figures are <strong>not drawn as zero</strong>. SSB marks a cell &ldquo;.&rdquo;
            (not applicable), &ldquo;..&rdquo; (not available) or &ldquo;:&rdquo; (confidential);
            this app keeps the three apart end to end, breaks the line and prints the marker below
            the axis instead of plotting a value.
          </li>
          <li>
            The year is the year the pupils left lower secondary school. Figures come from a
            snapshot taken at ingest time, not live from SSB, so a later SSB revision is not
            reflected until the data is re-ingested.
          </li>
        </ul>
      </section>
    </>
  );
}
