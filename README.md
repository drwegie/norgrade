# norgrade

A Next.js app that visualizes Norway's **socioeconomic gradient in school
achievement** — how much parental education and household income relate to
grade point averages and upper secondary school completion rates.

## Why, when Udir already publishes school statistics?

Udir (the Norwegian Directorate for Education and Training) publishes
Norway's school statistics, including grunnskolepoeng, and it is the
authoritative source for how schools perform. This app does not try to be a
better version of that, and does not claim to show anything Udir could not
show.

What it is instead is one question, followed all the way down:

- **One question, not a catalogue.** "How much do a pupil's results track
  their parents' education?" — nothing else. There is no school picker, no
  subject browser and no municipality drilldown, because every one of them
  would dilute the comparison the page exists to make.
- **The breakdown is the point.** The pupil-level background variables
  (parents' education, household income, parents' labour market status) live
  in SSB's tables, not in Udir's per-school reporting. Each of this app's
  four lenses is a view of one of those tables alone.
- **Missing data stays missing.** SSB distinguishes "." (not applicable),
  ".." (not available) and ":" (confidential). The ETL layer keeps the three
  apart and the chart refuses to draw any of them as a value: the line
  breaks and SSB's own marker is printed below the axis. A dashboard that
  silently plots those as zero would show a gradient that is steeper than
  the data supports.

`UNVERIFIED:` whether Udir's current statistics portal offers the same
breakdown by parents' education was **not** checked against udir.no for this
increment. The claim above is only about where the source data sits (SSB's
tables), which is verified, not about what Udir's UI does or does not offer.

**This increment adds an entry page at `/`, moves the parents' education
lens to `/education`, and lets a chosen sex and parental education level
follow the reader from one lens to the next.** The snapshot decoder, the
four lenses and their CC BY attribution, the ETL layer (SSB API client,
response parser, caching) and the ingest script that writes the committed
snapshots were in place before it.

## Data source

[Statistics Norway (SSB) PxWebApi v2](https://data.ssb.no/api/pxwebapi/v2/),
queried as `json-stat2`. No authentication or API key is required. Tables
used:

- **11689** — grade points by sex, grade-point bracket, parents' education
- **13716** / **13717** — grade points by household income bracket
- **14882** — upper secondary school completion rate within 5 years, by region

Example request:

```
GET https://data.ssb.no/api/pxwebapi/v2/tables/11689/data
    ?lang=en
    &valueCodes[Tid]=2024
    &valueCodes[Kjonn]=*
    &valueCodes[ContentsCode]=Elever
    &outputFormat=json-stat2
```

Non-eliminable dimensions (`Tid`, `ContentsCode`) must always be specified;
eliminable dimensions left out of the query (e.g. `Kjonn`, `Poeng`,
`ForeldrUtd`, `Region`) come back pre-aggregated to their total, not omitted.

SSB enforces a rate limit of **30 requests/minute per IP address** and an
**800,000-data-cell** limit per extract. This app could run behind a shared
outbound IP (e.g. Vercel), so our own usage would be counted together with
other tenants'.

The way this app stays inside that limit is **not** caching. A
process-local cache cannot bound a per-IP rate under serverless, where each
instance keeps its own memory. Instead, **SSB is only called from ingest
(build/script time) and never from the request path**, so the number of SSB
requests made while serving a page is a constant zero. The data is published
annually and the whole dataset is four requests, which makes this cheap.
`src/lib/ssb/cache.ts` only deduplicates repeated queries within a single
ingest run; it is not a rate-limit control. See
[ADR-001](docs/adr/ADR-001-ssb-ingest-boundary.md).

### Attribution (CC BY 4.0)

SSB's data is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.no), which
requires attribution. Any page in this app that displays SSB data must
show all three of:

1. **Source**: "Statistisk sentralbyrå (SSB)", linked to <https://www.ssb.no>
2. **License**: linked to <https://creativecommons.org/licenses/by/4.0/deed.no>
3. **A note that the data has been modified** (this app recombines, filters,
   and re-charts SSB's raw tables rather than reproducing them as-is)

The SSB logo is not used anywhere in this app, since SSB does not publish
terms permitting its use.

The snapshots in `data/ssb/` are themselves a modified redistribution of
SSB's data, so they carry their own attribution alongside them in
[`data/ssb/NOTICE.md`](data/ssb/NOTICE.md), which names all four tables and
states exactly what ingest changed.

In the UI, this is `src/app/_components/source-footer.tsx`. It takes the
tables the page actually reads as a prop and lists only those — the
`/education` lens uses table 11689 only, so its footer names 11689 only,
not all four snapshots in the repo. The entry page at `/` quotes one figure
from 11689 and therefore names 11689, and nothing else.

## ETL layer design notes

- **Special values are never collapsed to `null`/`0`.** SSB's json-stat2
  status codes (`.` = category not applicable, `..` = data not available,
  `:` = confidential) are parsed into a discriminated union (`SsbCell` in
  `src/lib/ssb/types.ts`) so a confidential cell (privacy suppression) can
  never be rendered as if it were a real zero.
- **Region (fylke) codes are classified by boundary era**, not just
  geography. Norway's county boundaries changed in 2018/2019 and again in
  2024; SSB keeps every historical code and marks superseded ones with a
  `(-YYYY)` suffix in the label. `src/lib/ssb/region.ts` classifies each
  code as `current`, `historical`, `non-geographic` (Svalbard, Utlandet —
  neither has a fylke boundary), or `aggregate` (the "I alt" total), so
  callers building a map are structurally forced to pick one boundary era
  instead of mixing old and new fylker on the same choropleth.

## UI

`/` is the entry page: what the app asks, a link to each of the four lenses,
where the figures come from and how fresh they are, and one headline figure
from table 11689 (named, with its exact cross-section, on the page). Each
lens is its own route and its own table — `/education` (11689), `/income`
(13716), `/work` (13717), `/completion` (14882). See
[ADR-002](docs/adr/ADR-002-exploration-surface.md).

The `/education` lens (`src/app/education/`) charts **the share of pupils in
a chosen grunnskolepoeng bracket, by their parents' highest completed
education**, for girls and boys separately by default, over every year in
table 11689.

- **It reads the snapshot at build time.** The lens imports
  `data/ssb/11689.json` as a JSON module and decodes it with
  `decodeSnapshot` (`src/lib/ssb/snapshot.ts`), the inverse of the
  serializer in `scripts/ingest-core.ts`. Nothing on the request path calls
  `fetchTable`, and `next build` reports every route as `○ (Static)`.
- **A chosen cross-section follows the reader between lenses.** Sex and
  parents' education are held in a React context in the root layout, not in
  the URL, and each lens says on the page when a value was carried in from
  another one. The two dimensions were checked against the snapshots before
  being shared: `ForeldrUtd` is identical in 11689/13716/13717 and absent
  from 14882, while `Kjonn` is `0/11/10` in those three but `0/2/1` in
  14882, so the sex is translated rather than passed through
  (`src/app/_components/shared-dimensions.ts`).
- **The chart is inline SVG with no charting dependency.**
  `src/app/_components/gradient-chart.tsx` is a few polylines, no charting
  library and no new entry in `package.json`. It renders inside a client
  boundary (the lens owns the selected slice) but is present in the
  prerendered HTML.
- **`next/image` is not used** anywhere, so `next`'s optional
  `@img/sharp-libvips-*` binaries (LGPL-3.0-or-later) never become part of
  what is deployed.
- **Special values break the line.** The chart takes `SsbCell`s rather than
  numbers, so it cannot render a `..` as a `0`; each one is drawn as SSB's
  own marker in a lane below the x axis and listed underneath the chart.
  Table 11689 currently has one such cell in the plotted slice: boys whose
  parents have basic school only, top bracket, 2026, `..` (not available).
- **Both panels share one y axis**, so girls and boys can be compared by
  eye.

The only arithmetic the app performs on SSB's figures is the ratio quoted in
the lens's opening paragraph and on the entry page (highest over lowest
parental education level, latest year, both sexes; both read it from the
same function in `src/app/education/table-11689.ts`), and both pages say so
in the same breath. Everything else on screen is a published figure.

## Ingest

`npm run ingest` is the only thing in this repo that makes an HTTP request
to SSB. It fetches the four tables **sequentially** (with an explicit
per-request timeout, since Node's `fetch` has none) and writes one snapshot
per table to `data/ssb/<tableId>.json`, which is committed. Cloud
persistence has not been approved, so this is ADR-001's "commit a JSON
snapshot instead" branch; the app reads only from these files.

The script is TypeScript compiled to `.ingest-build/` by `tsc` (already a
devDependency) and then run with plain `node` — no TypeScript runner
dependency is added.

Two things the script guarantees:

- **It asserts the `current` region set per table.** `region.ts` infers
  "current" from the *absence* of a `(-YYYY)` suffix, a negative inference,
  so ingest compares the resulting code set against an explicitly enumerated
  expectation (table 14882: `03`, `11`, `15`, `18`, `50`) and exits non-zero
  listing exactly which codes appeared or disappeared. A table that gains or
  loses its Region dimension fails the same way.
- **Its output is deterministic.** Nothing clock-derived is written and key
  order is fixed, so re-running ingest on unchanged data produces a
  byte-identical file and a real SSB revision produces a reviewable diff.

On an assertion failure the script still writes every snapshot before
exiting non-zero, so that the offending diff can be inspected. **The exit
code, not the presence of the files, is the signal.** If ingest is ever
automated, the job must gate the commit on that exit code — writing the
files is not a statement that they are correct.

Cells are stored flat, in the same row-major order as json-stat2's `value`
array (decodable with `dimensionOrder` + `dimensions`), and each one is
either a number or the SSB status marker `"."` / `".."` / `":"` — the
special values are preserved on disk, not flattened to `null`.

## Local development

Requires Node.js 22+.

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
npm test         # run the ETL test suite (no network access required)
npm run ingest   # refresh data/ssb/*.json from SSB (the only networked step)
npm run build    # production build
npm run lint     # eslint
```
