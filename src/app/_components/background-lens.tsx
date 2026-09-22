"use client";

/**
 * Shared lens for SSB tables 13716 and 13717.
 *
 * The two tables are the same shape -- average grunnskolepoeng by sex, by
 * parents' education, by year, broken down by one further household
 * variable (income quintile in 13716, number of economically active adults
 * in 13717) -- so they share a component rather than two near-identical
 * copies. What they do *not* share is data: each route imports its own
 * snapshot and passes the decoded table in, which is what keeps one
 * table's cells out of the other route's client chunk.
 *
 * The route segment is the URL; the slice is client state. The two
 * dimensions these tables share with the others -- sex and parents'
 * education, whose codes are identical in 11689, 13716 and 13717 (measured;
 * see ./shared-dimensions.ts) -- come from the shared selection rather than
 * from local `useState`, so a cross-section chosen on another lens is still
 * there on arrival. The breakdown dimension stays private to the route,
 * because no other table has it. See
 * docs/adr/ADR-002-exploration-surface.md.
 */

import { type ReactNode } from "react";
import { CarriedSelection } from "./carried-selection";
import { ControlGroup } from "./control-group";
import { GradientChart, type ChartSeries } from "./gradient-chart";
import { useSharedSelection } from "./selection-context";
import {
  EDUCATION_SHORT_LABELS,
  SHARED_EDUCATION_CODES,
  SHARED_SEX_CODES,
  type SharedEducationCode,
  type SharedSexCode,
} from "./shared-dimensions";
import { tableOptions } from "./table-options";
import { categoryLabel, selectSeries } from "@/lib/ssb/select";
import type { ParsedTable } from "@/lib/ssb/types";
import styles from "./lens-page.module.css";

export interface BackgroundLensProps {
  table: ParsedTable;
  /** Lens label, used to say where a carried-over choice came from. */
  lens: string;
  title: string;
  lede: ReactNode;
  /** The dimension drawn as one line per category. */
  breakdown: {
    dimension: string;
    /** Categories to plot, in the order they should be read. */
    codes: readonly string[];
    /** One colour per code, same order. */
    colors: readonly string[];
    /** Shorter chip/legend wording; SSB's own label is kept as the tooltip. */
    shortLabels?: Record<string, string>;
  };
  /** ContentsCode held fixed for the whole lens. */
  contentsCode: string;
  /** What the y axis measures, in words, for the chart description. */
  measure: string;
  notes: ReactNode;
}

export function BackgroundLens({
  table,
  lens,
  title,
  lede,
  breakdown,
  contentsCode,
  measure,
  notes,
}: BackgroundLensProps) {
  const { sex, sexChosenOn, chooseSex, education, educationChosenOn, chooseEducation } =
    useSharedSelection();

  const years = table.dimensions.Tid.categories.map((category) => category.label);
  const series: ChartSeries[] = breakdown.codes.map((code, index) => ({
    key: code,
    label: breakdown.shortLabels?.[code] ?? categoryLabel(table, breakdown.dimension, code),
    color: breakdown.colors[index],
    points: selectSeries(table, "Tid", {
      Kjonn: sex,
      ForeldrUtd: education,
      [breakdown.dimension]: code,
      ContentsCode: contentsCode,
    }),
  }));

  const sexLabel = categoryLabel(table, "Kjonn", sex);
  const educationLabel = categoryLabel(table, "ForeldrUtd", education);

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
      </header>

      <CarriedSelection
        currentLens={lens}
        items={[
          {
            from: sexChosenOn,
            description: (
              <>
                pupils, <strong>{sexLabel}</strong>
              </>
            ),
          },
          {
            from: educationChosenOn,
            description: (
              <>
                parents&rsquo; education, <strong>{educationLabel.toLowerCase()}</strong>
              </>
            ),
          },
        ]}
      />

      <div className={styles.controls}>
        <h2 className={styles.controlsHeading}>Choose a cross-section</h2>
        <ControlGroup
          name="sex"
          legend="Pupils"
          options={tableOptions(table, "Kjonn", SHARED_SEX_CODES)}
          value={sex}
          onChange={(code) => chooseSex(code as SharedSexCode, lens)}
        />
        <ControlGroup
          name="education"
          legend="Parents' highest completed education"
          options={tableOptions(
            table,
            "ForeldrUtd",
            SHARED_EDUCATION_CODES,
            EDUCATION_SHORT_LABELS,
          )}
          value={education}
          onChange={(code) => chooseEducation(code as SharedEducationCode, lens)}
        />
      </div>

      <p className={styles.slice}>
        Showing: <strong>{sexLabel}</strong>, parents with{" "}
        <strong>{educationLabel.toLowerCase()}</strong>.
      </p>

      <GradientChart
        title={`${sexLabel} — parents with ${educationLabel.toLowerCase()}`}
        description={
          `Line chart. ${measure} for ${sexLabel.toLowerCase()} whose parents have ` +
          `${educationLabel.toLowerCase()}, ${years[0]} to ${years[years.length - 1]}, with one ` +
          `line per category of ${table.dimensions[breakdown.dimension].label}.`
        }
        categories={years}
        series={series}
        unit=""
      />

      <section className={styles.notes}>
        <h2 className={styles.notesHeading}>Reading this chart</h2>
        <ul>
          {notes}
          <li>
            The y axis starts at zero, so the distance between the lines is shown at its true
            proportion of the score rather than magnified by a cropped scale.
          </li>
          <li>
            Missing figures are <strong>not drawn as zero</strong>: SSB&rsquo;s &ldquo;.&rdquo; (not
            applicable), &ldquo;..&rdquo; (not available) and &ldquo;:&rdquo; (confidential) break
            the line and are printed as SSB&rsquo;s own marker below the axis.
          </li>
          <li>
            Figures come from a snapshot taken at ingest time, not live from SSB, so a later SSB
            revision is not reflected until the data is re-ingested.
          </li>
        </ul>
      </section>
    </>
  );
}
