/**
 * Home page: the socioeconomic gradient in lower secondary school results.
 *
 * Reads the committed snapshot of SSB table 11689 as a JSON module, so the
 * data is bundled at build time and this page prerenders to static HTML.
 * It never calls `fetchTable` and makes no request of its own, per
 * docs/adr/ADR-001-ssb-ingest-boundary.md: the number of SSB requests made
 * while serving this page is zero.
 */

import { GradientChart, niceMax, type ChartSeries } from "./_components/gradient-chart";
import { SourceFooter } from "./_components/source-footer";
import { decodeSnapshot } from "@/lib/ssb/snapshot";
import { selectSeries } from "@/lib/ssb/select";
import styles from "./page.module.css";

import snapshot11689 from "../../data/ssb/11689.json";

const table = decodeSnapshot(snapshot11689);

/**
 * Table 11689 publishes the *distribution* of pupils across points
 * brackets, not a mean, so the measure shown here is one published bracket
 * rather than an average computed in the app. "55 point or more" is the top
 * bracket, where the spread between parental education levels is widest.
 */
const POINTS_BRACKET = "08";
/** Per cent of pupils, as published; the sibling `Elever` is a head count. */
const CONTENTS_CODE = "EleverProsent";

/**
 * The four real levels of parental education, from lowest to highest. The
 * table's other two categories are left out because neither is a level:
 * "00" is the all-levels total and "99" is the residual "Unknown".
 */
const EDUCATION_LEVELS: Array<{ code: string; color: string }> = [
  { code: "01", color: "#d7263d" },
  { code: "02b", color: "#e08c1a" },
  { code: "03b", color: "#2e9e8f" },
  { code: "03c", color: "#5c7aea" },
];

/** Girls and boys are charted separately; the sexes total ("0") is used in the text. */
const SEXES = ["11", "10"];

const YEARS = table.dimensions.Tid.categories.map((category) => category.label);

function labelOf(dimension: string, code: string): string {
  const category = table.dimensions[dimension].categories.find((c) => c.code === code);
  if (!category) {
    throw new Error(`Table ${table.tableId}: dimension "${dimension}" has no category "${code}"`);
  }
  return category.label;
}

function seriesForSex(sex: string): ChartSeries[] {
  return EDUCATION_LEVELS.map(({ code, color }) => ({
    key: code,
    label: labelOf("ForeldrUtd", code),
    color,
    points: selectSeries(table, "Tid", {
      Kjonn: sex,
      Poeng: POINTS_BRACKET,
      ForeldrUtd: code,
      ContentsCode: CONTENTS_CODE,
    }),
  }));
}

const panels = SEXES.map((sex) => ({ sex, label: labelOf("Kjonn", sex), series: seriesForSex(sex) }));

// One y scale for both panels: two charts of the same measure that are
// meant to be compared by eye must not be scaled independently.
const sharedYMax = niceMax(panels.flatMap((panel) => panel.series));

const latestYear = YEARS[YEARS.length - 1];
const bracketLabel = labelOf("Poeng", POINTS_BRACKET);

/**
 * The headline ratio, for both sexes together, in the latest year. This is
 * the app's own arithmetic on two published shares -- the only computation
 * anywhere in the app -- and it is stated as such on the page.
 */
function latestGradient(): { lowest: number; highest: number; ratio: number } | null {
  const bothSexes = selectSeries(table, "ForeldrUtd", {
    Kjonn: "0",
    Poeng: POINTS_BRACKET,
    ContentsCode: CONTENTS_CODE,
    Tid: latestYear,
  });
  const codes = table.dimensions.ForeldrUtd.categories.map((category) => category.code);
  const cellFor = (code: string) => bothSexes[codes.indexOf(code)];

  const lowest = cellFor(EDUCATION_LEVELS[0].code);
  const highest = cellFor(EDUCATION_LEVELS[EDUCATION_LEVELS.length - 1].code);
  if (lowest.kind !== "value" || highest.kind !== "value" || lowest.value === 0) {
    return null;
  }
  return { lowest: lowest.value, highest: highest.value, ratio: highest.value / lowest.value };
}

const gradient = latestGradient();

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>How far do a pupil&rsquo;s parents get them?</h1>
          <p className={styles.lede}>
            Share of Norwegian pupils finishing lower secondary school with{" "}
            <strong>{bracketLabel.toLowerCase()}</strong> of grunnskolepoeng, by their{" "}
            <strong>parents&rsquo; highest completed education</strong>, {YEARS[0]}&ndash;
            {latestYear}.
          </p>
          {gradient ? (
            <p className={styles.lede}>
              In {latestYear}, {gradient.highest.toFixed(1)}% of pupils whose parents hold{" "}
              {labelOf("ForeldrUtd", "03c").toLowerCase()} reached that bracket, against{" "}
              {gradient.lowest.toFixed(1)}% of pupils whose parents have{" "}
              {labelOf("ForeldrUtd", "01").toLowerCase()} &mdash; a ratio of{" "}
              {gradient.ratio.toFixed(1)}&times;. Both figures are published by SSB; the ratio is
              this page&rsquo;s own division of the two.
            </p>
          ) : null}
        </header>

        <div className={styles.charts}>
          {panels.map((panel) => (
            <GradientChart
              key={panel.sex}
              title={panel.label}
              description={
                `Line chart. ${panel.label}: the share reaching ${bracketLabel.toLowerCase()} ` +
                `of grunnskolepoeng, ${YEARS[0]} to ${latestYear}, with one line per level of ` +
                `parents' education. Higher parental education corresponds to a higher share in ` +
                `every year shown.`
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
              Both panels share one y axis, so the girls&rsquo; and boys&rsquo; panels can be
              compared directly.
            </li>
            <li>
              The table&rsquo;s &ldquo;{labelOf("ForeldrUtd", "00")}&rdquo; total and its residual
              &ldquo;{labelOf("ForeldrUtd", "99")}&rdquo; category are not plotted, because neither
              is a level of education.
            </li>
            <li>
              Missing figures are <strong>not drawn as zero</strong>. SSB marks a cell
              &ldquo;.&rdquo; (not applicable), &ldquo;..&rdquo; (not available) or &ldquo;:&rdquo;
              (confidential); this app keeps the three apart end to end, breaks the line and prints
              the marker below the axis instead of plotting a value.
            </li>
            <li>
              The year is the year the pupils left lower secondary school. Figures come from a
              snapshot taken at ingest time, not live from SSB, so a later SSB revision is not
              reflected until the data is re-ingested.
            </li>
          </ul>
        </section>

        <SourceFooter
          tables={[
            {
              id: table.tableId,
              title: "Lower secondary school points, by sex, parents' education and year",
            },
          ]}
        />
      </main>
    </div>
  );
}
