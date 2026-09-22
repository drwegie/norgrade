/**
 * Says out loud which parts of the current view the reader chose somewhere
 * else.
 *
 * A lens that quietly opens on "Girls, parents with basic school only"
 * because that was picked two pages ago is a page whose numbers have no
 * visible reason. Each item names what was carried and which lens it came
 * from; items whose source is this lens are dropped, because there is
 * nothing to explain about a choice made here.
 *
 * Rendered inside client lenses, so on a cold load of a route it renders
 * nothing (no choice has been made yet) and the prerendered HTML is
 * unaffected.
 */

import { Fragment, type ReactNode } from "react";
import styles from "./carried-selection.module.css";

export interface CarriedItem {
  /** Lens label the value was chosen on, or `null` if it is still default. */
  from: string | null;
  /** What was carried, as a phrase: "pupils: <strong>Girls</strong>". */
  description: ReactNode;
}

export interface CarriedSelectionProps {
  /** Label of the lens doing the rendering. */
  currentLens: string;
  items: readonly CarriedItem[];
}

export function CarriedSelection({ currentLens, items }: CarriedSelectionProps) {
  const groups = new Map<string, ReactNode[]>();
  for (const item of items) {
    if (item.from === null || item.from === currentLens) continue;
    const existing = groups.get(item.from);
    if (existing) existing.push(item.description);
    else groups.set(item.from, [item.description]);
  }
  if (groups.size === 0) return null;

  return (
    <p className={styles.carried}>
      <span className={styles.tag}>Carried over</span>{" "}
      {[...groups].map(([from, descriptions]) => (
        <Fragment key={from}>
          From the <strong>{from}</strong> lens:{" "}
          {descriptions.map((description, index) => (
            <Fragment key={index}>
              {index > 0 ? "; " : null}
              {description}
            </Fragment>
          ))}
          .{" "}
        </Fragment>
      ))}
      The controls below change it.
    </p>
  );
}
