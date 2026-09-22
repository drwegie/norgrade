/**
 * The four lenses, as data.
 *
 * Kept apart from `lens-nav.tsx` so that the landing page, the nav and the
 * client lenses (which name the lens a carried-over choice came from) all
 * read the same list. `lens-nav.tsx` renders it; importing that component
 * from a Client Component would pull `next/link` and its stylesheet into
 * the client bundle for a label.
 *
 * `/` is not in this list: it is the entry page, not a lens. See
 * docs/adr/ADR-002-exploration-surface.md.
 */

export interface Lens {
  href: string;
  /** Short label for the nav. */
  label: string;
  /** The question the lens answers, shown as the link's tooltip. */
  question: string;
  /** What the reader gets out of it, one line, for the entry page. */
  summary: string;
  /** SSB table the lens reads. */
  table: string;
}

export const LENSES: readonly Lens[] = [
  {
    href: "/education",
    label: "Parents' education",
    question: "How much do a pupil's results track their parents' education?",
    summary:
      "The share of pupils reaching a chosen bracket of grunnskolepoeng, by their parents' highest completed education, 2015–2026.",
    table: "11689",
  },
  {
    href: "/income",
    label: "Household income",
    question: "How much do a pupil's results track their household's income?",
    summary:
      "Average grunnskolepoeng by the household's income quintile, with parents' education held at one level.",
    table: "13716",
  },
  {
    href: "/work",
    label: "Parents in work",
    question: "How much do a pupil's results track how many adults at home are in work?",
    summary:
      "Average grunnskolepoeng by how many adults in the household are economically active.",
    table: "13717",
  },
  {
    href: "/completion",
    label: "Finishing upper secondary",
    question: "Does the same gap decide who finishes upper secondary school, and where?",
    summary:
      "The share of each county's cohort reaching a given outcome in upper secondary school within five years.",
    table: "14882",
  },
];

/** Lens labels, used as the "chosen on" marker of a shared selection. */
export const LENS_LABELS = {
  education: "Parents' education",
  income: "Household income",
  work: "Parents in work",
  completion: "Finishing upper secondary",
} as const;
