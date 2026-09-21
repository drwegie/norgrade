# skolegradient

A Next.js app that visualizes Norway's **socioeconomic gradient in school
achievement** — how much parental education and household income relate to
grade point averages and upper secondary school completion rates.

## Why

Udir (the Norwegian Directorate for Education and Training) already
publishes a school statistics dashboard (Skoleporten), but its cut is
per-school/per-subject performance. This app's angle is different: it
follows a single question — grades and completion rates broken down by
parents' education level and household income — across SSB's tables, which
Skoleporten does not surface as its primary view.

**This increment implements only the ETL layer (SSB API client, response
parser, and caching) and its tests. There is no UI yet.**

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
**800,000-data-cell** limit per extract. Because this could run behind a
shared outbound IP (e.g. Vercel), all table fetches go through a
process-local cache (`src/lib/ssb/cache.ts`) to avoid re-fetching the same
query within its TTL.

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

## Local development

Requires Node.js 22+.

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
npm test         # run the ETL test suite (no network access required)
npm run build    # production build
npm run lint     # eslint
```
