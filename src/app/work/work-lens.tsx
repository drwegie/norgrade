"use client";

/**
 * Lens 3: average grunnskolepoeng by how many adults in the household are
 * economically active (SSB 13717).
 *
 * The snapshot is imported here, inside the client boundary, so that table
 * 13717's cells land in this route's client chunk rather than in the RSC
 * flight payload of every page (docs/adr/ADR-002-exploration-surface.md).
 */

import { BackgroundLens } from "../_components/background-lens";
import { LENS_LABELS } from "../_components/lenses";
import { decodeSnapshot } from "@/lib/ssb/snapshot";

import snapshot13717 from "../../../data/ssb/13717.json";

const table = decodeSnapshot(snapshot13717);

/**
 * The three real household states, fewest workers to most. The table's
 * "0 Economically active persons in total" and residual "9 Unknown" are
 * left out: neither is a count of working adults.
 */
const ACTIVITY_CODES = ["1", "2", "3"] as const;
const ACTIVITY_COLORS = ["#d7263d", "#e08c1a", "#5c7aea"] as const;
const ACTIVITY_SHORT_LABELS: Record<string, string> = {
  "1": "No one in work",
  "2": "One adult in work",
  "3": "Two or more in work",
};

/** Average points, as published; the sibling `AntallElever` is a head count. */
const CONTENTS_CODE = "Grunnskolepoeng";

export function WorkLens() {
  return (
    <BackgroundLens
      table={table}
      lens={LENS_LABELS.work}
      title="And how many adults at home go to work?"
      lede={
        <>
          Average grunnskolepoeng by the{" "}
          <strong>number of economically active adults in the household</strong>, 2020&ndash;2026.
          This is the same gradient read through employment rather than education or income &mdash;
          three tables, one question.
        </>
      }
      breakdown={{
        dimension: "Yrkesaktive",
        codes: ACTIVITY_CODES,
        colors: ACTIVITY_COLORS,
        shortLabels: ACTIVITY_SHORT_LABELS,
      }}
      contentsCode={CONTENTS_CODE}
      measure="Average lower secondary school points"
      notes={
        <>
          <li>
            The lines are shortened restatements of SSB&rsquo;s three categories, which read
            &ldquo;
            {table.dimensions.Yrkesaktive.categories
              .filter((category) => (ACTIVITY_CODES as readonly string[]).includes(category.code))
              .map((category) => category.label)
              .join("”, “")}
            &rdquo;.
          </li>
          <li>
            &ldquo;Economically active&rdquo; is SSB&rsquo;s own classification of the adults in the
            household, not a measure of hours worked.
          </li>
        </>
      }
    />
  );
}
