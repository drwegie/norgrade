# ADR-002: Exploration as routed lenses, with slice state in the client

- Status: Accepted
- Date: 2026-09-22

## Context

A fair question was put to the first version of this app, days before it
was to be published: if it renders a snapshot as a fixed page, an article
on an existing platform would carry the same information for a tenth of
the work. That was true of what existed. A reader could not ask anything;
they could only read one answer.

Three measured constraints shape what can be done about it.

**The four tables are not one cube.** `ForeldrUtd` (parents' education)
exists in 11689, 13716 and 13717 but not in 14882. `Husinntekt2`
(household income) exists only in 13716, `Yrkesaktive` (parents in work)
only in 13717, and `Region` only in 14882. `Poeng` is cut into ten
brackets in 11689 and six in 14882. `Tid` means a single cohort year in
11689 (2015-2026) and 13716/13717 (2020-2026), but a seven-year window in
14882 (2014-2020 ... 2019-2025). A UI offering "girls x top income
quintile x Oslo" would be inventing an intersection that does not exist in
the source.

**Payload is not the binding constraint.** The four snapshots are 161,451
bytes minified and 49,429 gzipped; 14882 alone is 36,562 brotli-compressed.
The client JavaScript this app already shipped, before it had a single
client component, was 566,110 bytes. The raw 300KB figure for 14882 is
pretty-printed JSON and is misleading as a basis for design.

**Query strings cost the static HTML.** Next 16's own documentation, as
shipped in `node_modules`, states that calling `useSearchParams` in a
prerendered route makes the client tree up to the nearest `Suspense`
boundary render on the client, and that a static page calling it without
such a boundary fails the build. A component holding its state in
`useState` has no such consequence: it is prerendered in its initial
state.

One further fact was measured while designing this, and it inverted an
assumption held since ingest was written. Table 14882 is reported
**entirely in the pre-2020 fylke division**. The fifteen regions whose
labels carry a `(-2019)` or `(-2017)` suffix are not stale leftovers; they
hold data across all six intervals. The five regions that `region.ts`
classifies as `current` are not "today's counties" but the four whose
borders never moved plus Trøndelag, which is empty in four of the six
intervals. Filtering a display to `current` would have produced a
five-county page full of holes.

## Decision

**A route segment carries which question is being asked. Client state
carries which slice of it is shown. The query string carries neither.**

- One table is one route is one question: `/` (11689, parents'
  education), `/income` (13716), `/work` (13717), `/completion` (14882).
  `generateStaticParams` is not used; indirection over four known values
  buys nothing.
- Each route's client component imports its own snapshot as a JSON module.
  Decoded data is **not** passed down from a server component as props,
  which would inline it into the RSC payload and the HTML.
- Slice controls use `useState` only, so every route stays prerendered
  with a chart in its static markup.
- The snapshots are not reshaped. SSB is still called four times, at
  ingest, and zero times at runtime (ADR-001).
- The region set for 14882 is the division the table actually reports in,
  not `partitionRegions().current`. The one handover inside the table
  (16/17 -> 50) is handled explicitly in `completion-regions.ts`.

### Rejected: ship every table to one page

Technically fine at 49KB brotli for all four. Rejected because code
splitting then cannot help: the page everyone lands on would carry the
county table that most readers never open. It is also the dashboard the
README explicitly refuses to build ("One question, not a catalogue").

### Rejected: prerender every combination

Counting routes as "x axis is time, lines are the background variable":
60 for 11689, 42 for 13716, 30 for 13717 and 5,796 for 14882, totalling
5,928. At the current per-page output of roughly 87.6KB that is about
519MB of build artefact to serve 49KB of data. Restricting regions and
content codes still leaves 822 pages and ~72MB. Worse, every change of
filter becomes a navigation, which makes exploring slower than reading the
article this is trying to beat.

### Rejected: trim 14882 at ingest

There is no defensible cut. The display set is 21 of 23 regions, so
trimming saves 9%. Cutting to `current` produces the broken page described
above. And narrowing what ingest *fetches* would disable
`assertCurrentRegions`, which is the only check standing between us and
`region.ts`'s known weakness of inferring "current" from the absence of a
suffix. Size was never the problem.

## Consequences

**Good**

- The app can now be asked a question, which is the thing an article
  cannot do.
- Route-level code splitting keeps the landing page from paying for the
  county data: measured after this change, the 14882 chunk is referenced
  by `/completion` and by no other route, and the root HTML fell from
  57,114 to 36,066 bytes.
- A lens is a URL, so "look at the county view" is a link.
- One table per route makes the impossible intersections impossible to
  express, rather than merely discouraged.

**Bad**

- `gradient-chart.tsx` is now rendered inside a client component, so its
  header comment claiming it ships no JavaScript had to be corrected.
- A specific slice cannot be shared as a link. If a particular one turns
  out to be worth sharing, it can be promoted to a segment later.
- Four routes sit closer to the catalogue the README disavows. Education,
  income and work are background variables on one question, so they stay
  inside the thesis; `/completion` is a second outcome measure and does
  stretch it.

**Accepted limitation**

- Dimensions cannot be crossed between tables. Beyond sex, the
  combinations do not exist in the source data.

## Related

- `docs/adr/ADR-001-ssb-ingest-boundary.md` — runtime SSB requests stay at
  zero; this decision does not touch that boundary, only what is done with
  data already committed.
- `src/lib/ssb/region.ts` and `src/lib/ssb/completion-regions.ts` — why
  `current` is not a display set for 14882.
