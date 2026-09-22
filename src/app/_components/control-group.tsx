"use client";

/**
 * One row of mutually exclusive choices for a cross-section of a table.
 *
 * Native radio inputs, visually styled as chips: keyboard and screen-reader
 * behaviour (arrow keys within the group, the legend read as the group's
 * name) comes from the platform rather than from JavaScript we would have
 * to write and test.
 *
 * The selection is owned by the calling lens as `useState` and is
 * deliberately **not** reflected in the URL. Reading `useSearchParams` in a
 * prerendered route makes everything up to the nearest `<Suspense>` render
 * on the client instead, which would take the charts out of the static
 * HTML -- the property the whole ingest-at-build-time design exists to
 * produce (docs/adr/ADR-002-exploration-surface.md). The route segment is
 * what is shareable here; the slice within a route is not.
 */

import styles from "./control-group.module.css";

export interface ControlOption {
  value: string;
  label: string;
  /** Optional longer wording, shown as the control's tooltip. */
  title?: string;
}

export interface ControlGroupProps {
  /** Radio group name; must be unique within the page. */
  name: string;
  legend: string;
  options: readonly ControlOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ControlGroup({ name, legend, options, value, onChange }: ControlGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option} title={option.title}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className={styles.chip}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
