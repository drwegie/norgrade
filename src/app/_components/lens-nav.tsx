/**
 * Navigation between the four lenses.
 *
 * Each lens is its own route segment, so "which question am I looking at"
 * is a URL someone can send to someone else and a page that is prerendered
 * to static HTML. The slice *within* a lens is `useState` and is not in the
 * URL -- see docs/adr/ADR-002-exploration-surface.md.
 *
 * This is a server component: the current route is passed in as a prop
 * rather than read from `usePathname`, so this nav ships no JavaScript and
 * is present in the HTML of every page, the entry page at `/` included --
 * where no item is current, because `/` is not a lens.
 */

import Link from "next/link";
import { LENSES } from "./lenses";
import styles from "./lens-nav.module.css";

export function LensNav({ current }: { current: string }) {
  return (
    <nav className={styles.nav} aria-label="Lenses on the gradient">
      <p className={styles.intro}>
        One gradient, four SSB tables. Each lens is its own page and its own share link:
      </p>
      <ul className={styles.list}>
        {LENSES.map((lens) => {
          const isCurrent = lens.href === current;
          return (
            <li key={lens.href}>
              <Link
                href={lens.href}
                className={isCurrent ? `${styles.link} ${styles.current}` : styles.link}
                aria-current={isCurrent ? "page" : undefined}
                title={lens.question}
              >
                {lens.label}
                <span className={styles.table}>SSB {lens.table}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
