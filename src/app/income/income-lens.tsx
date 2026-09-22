"use client";

/**
 * Lens 2: average grunnskolepoeng by household income quintile (SSB 13716).
 *
 * The snapshot is imported here, inside the client boundary, so that table
 * 13716's cells land in this route's client chunk rather than in the RSC
 * flight payload of every page (docs/adr/ADR-002-exploration-surface.md).
 */

import { BackgroundLens } from "../_components/background-lens";
import { LENS_LABELS } from "../_components/lenses";
import { decodeSnapshot } from "@/lib/ssb/snapshot";

import snapshot13716 from "../../../data/ssb/13716.json";

const table = decodeSnapshot(snapshot13716);

/**
 * The five quintiles, poorest to richest. The table's "00 Total" and its
 * residual "09 Unknown" are left out: neither is a quintile.
 */
const QUINTILE_CODES = ["01", "02", "03", "04", "05"] as const;
const QUINTILE_COLORS = ["#d7263d", "#e08c1a", "#7aa22e", "#2e9e8f", "#5c7aea"] as const;

/** Average points, as published; the sibling `AntallElever` is a head count. */
const CONTENTS_CODE = "Grunnskolepoeng";

export function IncomeLens() {
  return (
    <BackgroundLens
      table={table}
      lens={LENS_LABELS.income}
      title="Does money move the line, once education is held still?"
      lede={
        <>
          Average grunnskolepoeng by the <strong>household&rsquo;s income quintile</strong>, 2020
          &ndash;2026. Parents&rsquo; education is a control here rather than the subject: hold it
          fixed at one level and the income quintiles still separate, which is the part a single
          chart of &ldquo;income vs results&rdquo; cannot show.
        </>
      }
      breakdown={{
        dimension: "Husinntekt2",
        codes: QUINTILE_CODES,
        colors: QUINTILE_COLORS,
      }}
      contentsCode={CONTENTS_CODE}
      measure="Average lower secondary school points"
      notes={
        <>
          <li>
            Quintiles are of the household&rsquo;s income, so each one is a fifth of households, not
            a fixed amount of kroner. SSB publishes the boundaries; this app does not restate them.
          </li>
          <li>
            The measure is SSB&rsquo;s published average (&ldquo;
            {table.dimensions.ContentsCode.categories[0].label}&rdquo;), not an average this app
            computes from counts.
          </li>
        </>
      }
    />
  );
}
