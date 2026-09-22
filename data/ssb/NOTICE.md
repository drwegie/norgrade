# Attribution for the data in this directory

The JSON files in this directory are **modified** extracts of statistics
published by **Statistisk sentralbyrå (SSB)** <https://www.ssb.no>, made
available under the
[Creative Commons Attribution 4.0 International licence (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.no).

| File | SSB table | Title (SSB, English) |
|---|---|---|
| `11689.json` | [11689](https://www.ssb.no/statbank/table/11689) | Lower secondary school points, by sex, parents' education and year |
| `13716.json` | [13716](https://www.ssb.no/statbank/table/13716) | Lower secondary school points, by sex, household income and year |
| `13717.json` | [13717](https://www.ssb.no/statbank/table/13717) | Lower secondary school points, by sex, parents' labour market status and year |
| `14882.json` | [14882](https://www.ssb.no/statbank/table/14882) | Completion of upper secondary education, by county, sex and year |

## What was changed

These files are not SSB's own published files. They were retrieved from
SSB's PxWebApi v2 by `scripts/ingest.ts` and then:

- restructured from json-stat2 into a flat, row-major cell array with an
  explicit `dimensionOrder`;
- limited to the dimension values this app uses, rather than the full table;
- kept with SSB's status markers (`.`, `..`, `:`) preserved as values
  instead of being replaced by nulls or zeroes.

Figures are otherwise unaltered: no rounding, rescaling, imputation or
recomputation is applied at ingest time.

SSB does not publish terms permitting use of its logo, so the logo is not
used here.

**SSB is not responsible for this app, nor does it endorse it.**
