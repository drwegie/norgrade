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
 * The selected slice is `useState` here; the route segment is the URL. See
 * docs/adr/ADR-002-exploration-surface.md.
 */

import { useState, type ReactNode } from "react";
import { ControlGroup } from "./control-group";
import { GradientChart, type ChartSeries } from "./gradient-chart";
import { tableOptions } from "./table-options";
import { categoryLabel, selectSeries } from "@/lib/ssb/select";
import type { ParsedTable } from "@/lib/ssb/types";
import styles from "./lens-page.module.css";

/** Both tables publish these, with identical category codes. */
const SEX_CODES = ["0", "11", "10"] as const;
/**
 * "00" (all levels) first, then the four real levels. The residual "99
 * Unknown" is omitted: it is not a level of education.
 */
const EDUCATION_CODES = ["00", "01", "02b", "03b", "03c"] as const;

const EDUCATION_SHORT_LABELS: Record<string, string> = {
  "00": "All levels",
  "01": "Basic school",
  "02b": "Upper secondary",
  "03b": "Tertiary, ≤ 4 years",
  "03c": "Tertiary, > 4 years",
};

export interface BackgroundLensProps {
  table: ParsedTable;
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
  title,
  lede,
  breakdown,
  contentsCode,
  measure,
  notes,
}: BackgroundLensProps) {
  const [sex, setSex] = useState<string>(SEX_CODES[0]);
  const [education, setEducation] = useState<string>(EDUCATION_CODES[0]);

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

      <div className={styles.controls}>
        <h2 className={styles.controlsHeading}>Choose a cross-section</h2>
        <ControlGroup
          name="sex"
          legend="Pupils"
          options={tableOptions(table, "Kjonn", SEX_CODES)}
          value={sex}
          onChange={setSex}
        />
        <ControlGroup
          name="education"
          legend="Parents' highest completed education"
          options={tableOptions(table, "ForeldrUtd", EDUCATION_CODES, EDUCATION_SHORT_LABELS)}
          value={education}
          onChange={setEducation}
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
