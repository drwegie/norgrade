/**
 * Builds `ControlGroup` options out of a table's own categories.
 *
 * The label shown on a chip is SSB's label for that category, not wording
 * invented here. A few of SSB's labels are a full sentence ("Completed with
 * general or vocational qualification according to normative length of
 * study"), so a caller may pass a shorter chip label -- in which case SSB's
 * full label is kept as the control's `title`, i.e. it is still on the page
 * rather than replaced.
 */

import type { ControlOption } from "./control-group";
import { categoryLabel } from "@/lib/ssb/select";
import type { ParsedTable } from "@/lib/ssb/types";

export function tableOptions(
  table: ParsedTable,
  dimension: string,
  codes: readonly string[],
  shortLabels: Readonly<Record<string, string>> = {},
): ControlOption[] {
  return codes.map((code) => {
    const label = categoryLabel(table, dimension, code);
    const short = shortLabels[code];
    return short === undefined
      ? { value: code, label }
      : { value: code, label: short, title: label };
  });
}
