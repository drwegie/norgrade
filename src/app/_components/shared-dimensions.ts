/**
 * The two dimensions a reader can keep while moving between lenses, and the
 * codes each table uses for them.
 *
 * Measured against the committed snapshots on 2026-09-22 (the check is kept
 * as a test in `__tests__/shared-dimensions.test.ts`, so a re-ingest that
 * changes a code fails the suite rather than silently mis-selecting a cell):
 *
 * | Dimension    | 11689        | 13716        | 13717        | 14882          |
 * |--------------|--------------|--------------|--------------|----------------|
 * | `Kjonn`      | `0/11/10`    | `0/11/10`    | `0/11/10`    | **`0/2/1`**    |
 * | `ForeldrUtd` | `00/01/02b/03b/03c/99` | same | same | **absent**     |
 *
 * So the two dimensions are shared, but neither is shared naively:
 *
 * - `Kjonn` exists in all four tables, yet 14882 numbers the sexes
 *   differently and labels them "Females"/"Males" where the other three say
 *   "Girls"/"Boys". The mapping below is the translation; assuming the
 *   codes matched would have selected the wrong cells on /completion.
 * - `ForeldrUtd` does not exist in 14882 at all, so a parental-education
 *   choice is never applied there. It is held for the lenses that do have
 *   it rather than dropped (ADR-002: the dimensions of two tables are not
 *   crossed -- a carried choice is re-applied to one table at a time).
 */

/** `Kjonn` codes of tables 11689, 13716 and 13717; the app's canonical form. */
export const SHARED_SEX_CODES = ["0", "11", "10"] as const;
export type SharedSexCode = (typeof SHARED_SEX_CODES)[number];

/** SSB's own "Both sexes" total, which is what every lens opens on. */
export const DEFAULT_SEX: SharedSexCode = "0";

/** Canonical sex code -> table 14882's own code for the same category. */
export const SEX_CODE_IN_14882: Record<SharedSexCode, string> = {
  "0": "0",
  "11": "2",
  "10": "1",
};

/** Table 14882's code -> canonical. The inverse of `SEX_CODE_IN_14882`. */
export const SHARED_SEX_CODE_FROM_14882: Record<string, SharedSexCode> = {
  "0": "0",
  "2": "11",
  "1": "10",
};

/**
 * `ForeldrUtd` codes offered as a slice: "00" (all levels) first, then the
 * four real levels. The residual "99 Unknown" is omitted, because it is not
 * a level of education.
 */
export const SHARED_EDUCATION_CODES = ["00", "01", "02b", "03b", "03c"] as const;
export type SharedEducationCode = (typeof SHARED_EDUCATION_CODES)[number];

export const DEFAULT_EDUCATION: SharedEducationCode = "00";

/** Shorter chip wording; SSB's full label is kept as the control's tooltip. */
export const EDUCATION_SHORT_LABELS: Record<string, string> = {
  "00": "All levels",
  "01": "Basic school",
  "02b": "Upper secondary",
  "03b": "Tertiary, ≤ 4 years",
  "03c": "Tertiary, > 4 years",
};
