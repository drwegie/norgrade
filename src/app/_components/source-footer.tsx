/**
 * CC BY 4.0 attribution for any page that displays SSB data.
 *
 * The licence requires naming the source, linking the licence and stating
 * that the material was modified, so all three are props-free constants
 * here rather than page copy that could drift. `tables` lists only the
 * tables the calling page actually reads -- claiming tables a page does not
 * use would misattribute the figures on screen.
 *
 * SSB's logo is deliberately absent: SSB publishes no terms permitting its
 * use. See README "Attribution (CC BY 4.0)" and data/ssb/NOTICE.md.
 */

import styles from "./source-footer.module.css";

export interface SourceTable {
  /** SSB table number, e.g. "11689". */
  id: string;
  /** SSB's own title for that table. */
  title: string;
}

export function SourceFooter({ tables }: { tables: SourceTable[] }) {
  return (
    <footer className={styles.footer}>
      <h2 className={styles.heading}>Source and licence</h2>
      <p>
        Data:{" "}
        <a href="https://www.ssb.no" rel="noopener noreferrer">
          Statistisk sentralbyrå (SSB)
        </a>
        , table{tables.length > 1 ? "s" : ""}{" "}
        {tables.map((table, index) => (
          <span key={table.id}>
            {index > 0 ? ", " : ""}
            <a
              href={`https://www.ssb.no/statbank/table/${table.id}`}
              rel="noopener noreferrer"
            >
              {table.id}
            </a>{" "}
            ({table.title})
          </span>
        ))}
        . Licensed under{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/deed.no" rel="noopener noreferrer">
          CC BY 4.0
        </a>
        .
      </p>
      <p>
        <strong>The data has been modified.</strong> The figures were retrieved from SSB&rsquo;s
        PxWebApi, restructured, and filtered down to the sexes, points bracket, parental education
        levels and years shown above; the charts are this app&rsquo;s own. Figures themselves are
        reproduced as published: no rounding, rescaling or imputation is applied. SSB is not
        responsible for this app and does not endorse it.
      </p>
    </footer>
  );
}
