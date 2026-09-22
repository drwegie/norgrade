/**
 * A multi-series line chart, drawn as inline SVG.
 *
 * No charting library is used: the whole chart is a handful of polylines,
 * which is not worth a dependency (and every dependency shipped to the
 * browser is one more licence and supply-chain question for a portfolio app
 * that has none today).
 *
 * The component takes `SsbCell`s, not numbers, on purpose. SSB's three
 * special values ("." not applicable, ".." not available, ":" confidential --
 * see src/lib/ssb/types.ts) are preserved all the way through the ETL layer,
 * so the last step, rendering, is the one place where they could still be
 * silently turned into a zero. Instead a special value breaks the line and
 * is drawn as its own marker below the axis, where it cannot be read as a
 * position on the y scale.
 *
 * This component has no state and no event handlers, but it is **not** a
 * server component: every lens that uses it is a Client Component (the
 * selected slice lives in `useState`), so this renders inside the client
 * boundary and its code is part of that route's client bundle. What it does
 * keep is that the chart is present in the prerendered HTML -- no slice of
 * it is deferred to the browser -- which is why no lens reads
 * `useSearchParams`.
 */

import { niceMax, specialValueMarker, TICK_COUNT } from "./chart-scale";
import type { SsbCell } from "@/lib/ssb/types";
import styles from "./gradient-chart.module.css";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  /** One cell per x category, in the same order as `categories`. */
  points: SsbCell[];
}

export interface GradientChartProps {
  title: string;
  /** Read out to screen readers as the chart's description. */
  description: string;
  /** x-axis category labels, e.g. years. */
  categories: string[];
  series: ChartSeries[];
  /** Unit suffix for the y axis and the legend values, e.g. "%". */
  unit: string;
  /**
   * Upper bound of the y axis. Pass the same value to several charts (see
   * `niceMax`) when their heights are meant to be compared by eye; omitted,
   * each chart scales to its own data and comparing them is misleading.
   */
  yMax?: number;
}

const WIDTH = 720;
const HEIGHT = 300;
const PADDING = { top: 16, right: 16, bottom: 56, left: 44 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
/** Baseline of the lane, below the x axis, where special values are marked. */
const MISSING_LANE_Y = PADDING.top + PLOT_HEIGHT + 20;
const MISSING_MARKER_SPACING = 11;

function formatValue(value: number, unit: string): string {
  return `${value.toFixed(1)}${unit}`;
}

export function GradientChart({
  title,
  description,
  categories,
  series,
  unit,
  yMax,
}: GradientChartProps) {
  const max = yMax ?? niceMax(series.flatMap((s) => s.points));
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (i * max) / TICK_COUNT);

  const x = (index: number) =>
    categories.length === 1
      ? PADDING.left + PLOT_WIDTH / 2
      : PADDING.left + (index * PLOT_WIDTH) / (categories.length - 1);
  const y = (value: number) => PADDING.top + PLOT_HEIGHT - (value / max) * PLOT_HEIGHT;

  // Special values break the line: each series becomes one polyline per run
  // of consecutive real values, so a gap is a gap rather than a straight
  // line drawn through data that does not exist.
  const segmentsOf = (points: SsbCell[]): string[] => {
    const segments: string[] = [];
    let current: string[] = [];
    points.forEach((cell, index) => {
      if (cell.kind === "value") {
        current.push(`${x(index)},${y(cell.value)}`);
      } else if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
    });
    if (current.length > 0) segments.push(current.join(" "));
    // A run of one point has no line to draw; its dot is rendered below.
    return segments.filter((segment) => segment.includes(" "));
  };

  // Markers are grouped by x position so several series missing the same
  // year sit side by side instead of on top of each other.
  const missingByCategory = categories.map((_, index) =>
    series
      .map((s) => ({ series: s, marker: specialValueMarker(s.points[index]) }))
      .filter((entry): entry is { series: ChartSeries; marker: { symbol: string; meaning: string } } =>
        entry.marker !== null,
      ),
  );
  const missingCount = missingByCategory.reduce((total, entries) => total + entries.length, 0);

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{title}</figcaption>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={title}
        preserveAspectRatio="xMidYMid meet"
      >
        <desc>{description}</desc>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={styles.grid}
              x1={PADDING.left}
              x2={PADDING.left + PLOT_WIDTH}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className={styles.tickLabel} x={PADDING.left - 8} y={y(tick) + 4} textAnchor="end">
              {Number(tick.toFixed(2))}
              {unit}
            </text>
          </g>
        ))}

        <line
          className={styles.axis}
          x1={PADDING.left}
          x2={PADDING.left + PLOT_WIDTH}
          y1={y(0)}
          y2={y(0)}
        />

        {categories.map((category, index) => (
          <text
            key={category}
            className={styles.tickLabel}
            x={x(index)}
            y={PADDING.top + PLOT_HEIGHT + 34}
            textAnchor="middle"
          >
            {category}
          </text>
        ))}

        {series.map((s) => (
          <g key={s.key}>
            {segmentsOf(s.points).map((segment) => (
              <polyline
                key={segment}
                className={styles.line}
                points={segment}
                fill="none"
                stroke={s.color}
              />
            ))}
            {s.points.map((cell, index) =>
              cell.kind === "value" ? (
                <circle
                  key={categories[index]}
                  cx={x(index)}
                  cy={y(cell.value)}
                  r={2.5}
                  fill={s.color}
                />
              ) : null,
            )}
          </g>
        ))}

        {missingByCategory.map((entries, index) =>
          entries.map(({ series: s, marker }, position) => (
            <text
              key={`${categories[index]}-${s.key}`}
              className={styles.missingMarker}
              x={
                x(index) +
                (position - (entries.length - 1) / 2) * MISSING_MARKER_SPACING
              }
              y={MISSING_LANE_Y}
              textAnchor="middle"
              fill={s.color}
            >
              {marker.symbol}
            </text>
          )),
        )}
      </svg>

      <ul className={styles.legend}>
        {series.map((s) => {
          const lastIndex = s.points.length - 1;
          const last = s.points[lastIndex];
          const marker = specialValueMarker(last);
          return (
            <li key={s.key} className={styles.legendItem}>
              <span className={styles.swatch} style={{ backgroundColor: s.color }} aria-hidden="true" />
              <span className={styles.legendLabel}>{s.label}</span>
              <span className={styles.legendValue}>
                {marker === null && last.kind === "value"
                  ? formatValue(last.value, unit)
                  : `${marker?.symbol} (${marker?.meaning})`}{" "}
                <span className={styles.legendYear}>in {categories[lastIndex]}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {missingCount > 0 ? (
        <p className={styles.missingNote}>
          {missingCount === 1 ? "One point is" : `${missingCount} points are`} missing and{" "}
          {missingCount === 1 ? "is" : "are"} shown as SSB&rsquo;s own marker under the axis, in the
          series colour, instead of being plotted as a value:{" "}
          {missingByCategory
            .flatMap((entries, index) =>
              entries.map(
                ({ series: s, marker }) =>
                  `${s.label}, ${categories[index]}: “${marker.symbol}” (${marker.meaning})`,
              ),
            )
            .join("; ")}
          .
        </p>
      ) : null}
    </figure>
  );
}
