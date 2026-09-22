/**
 * A horizontal bar chart, one bar per region, drawn as inline SVG.
 *
 * Deliberately **not** a choropleth map. A map of Norwegian counties needs a
 * boundary GeoJSON, which is a second dataset under a second licence and a
 * few hundred kilobytes, and table 14882 is reported in the pre-2020 fylke
 * division (see src/lib/ssb/completion-regions.ts) -- so the map would have
 * to be the historical one, and would be read as the current one. Bars
 * answer the same question ("which counties are furthest apart?") with the
 * data the table actually has. Rows are drawn in the order given; the
 * calling lens sorts them, so that ordering choice stays visible there.
 *
 * Like the line chart, this takes `SsbCell`s: a ".." or ":" is drawn as
 * SSB's own marker where the bar would have ended, never as a zero-length
 * bar, which would read as "zero per cent".
 */

import { niceMax, specialValueMarker, TICK_COUNT } from "./chart-scale";
import type { RegionBar } from "@/lib/ssb/completion-regions";
import styles from "./region-bars.module.css";

export interface RegionBarsProps {
  title: string;
  /** Read out to screen readers as the chart's description. */
  description: string;
  rows: RegionBar[];
  /** Unit suffix for the axis and the value labels, e.g. "%". */
  unit: string;
  /** Highlighted rows, drawn in the accent colour (e.g. a boundary handover). */
  highlightCodes?: readonly string[];
}

const WIDTH = 720;
const LABEL_WIDTH = 190;
const ROW_HEIGHT = 22;
const BAR_HEIGHT = 12;
const PADDING = { top: 24, right: 52, bottom: 8 };
const PLOT_WIDTH = WIDTH - LABEL_WIDTH - PADDING.right;

const BAR_COLOR = "#5c7aea";
const HIGHLIGHT_COLOR = "#e08c1a";

export function RegionBars({ title, description, rows, unit, highlightCodes = [] }: RegionBarsProps) {
  const max = niceMax(rows.map((row) => row.cell));
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (i * max) / TICK_COUNT);
  const height = PADDING.top + rows.length * ROW_HEIGHT + PADDING.bottom;
  const x = (value: number) => LABEL_WIDTH + (value / max) * PLOT_WIDTH;
  const rowY = (index: number) => PADDING.top + index * ROW_HEIGHT;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{title}</figcaption>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={title}
        preserveAspectRatio="xMidYMid meet"
      >
        <desc>{description}</desc>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={styles.grid}
              x1={x(tick)}
              x2={x(tick)}
              y1={PADDING.top - 6}
              y2={PADDING.top + rows.length * ROW_HEIGHT}
            />
            <text className={styles.tickLabel} x={x(tick)} y={PADDING.top - 12} textAnchor="middle">
              {Number(tick.toFixed(2))}
              {unit}
            </text>
          </g>
        ))}

        {rows.map((row, index) => {
          const marker = specialValueMarker(row.cell);
          const color = highlightCodes.includes(row.code) ? HIGHLIGHT_COLOR : BAR_COLOR;
          const y = rowY(index);
          return (
            <g key={row.code}>
              <text
                className={styles.rowLabel}
                x={LABEL_WIDTH - 10}
                y={y + BAR_HEIGHT}
                textAnchor="end"
              >
                {row.label}
              </text>
              {row.cell.kind === "value" ? (
                <>
                  <rect
                    x={LABEL_WIDTH}
                    y={y + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                    width={Math.max(x(row.cell.value) - LABEL_WIDTH, 0)}
                    height={BAR_HEIGHT}
                    fill={color}
                    rx={2}
                  />
                  <text
                    className={styles.valueLabel}
                    x={x(row.cell.value) + 6}
                    y={y + BAR_HEIGHT}
                  >
                    {row.cell.value.toFixed(1)}
                    {unit}
                  </text>
                </>
              ) : (
                <text className={styles.missingMarker} x={LABEL_WIDTH + 2} y={y + BAR_HEIGHT}>
                  {marker?.symbol} <tspan className={styles.missingMeaning}>({marker?.meaning})</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
