import { describe, expect, it } from "vitest";
import { classifyRegion, partitionRegions } from "../region";

// The full Region dimension for table 14882, transcribed verbatim from the
// task spec (23 categories, codes + labels as returned by SSB).
const ALL_REGIONS: Array<{ code: string; label: string }> = [
  { code: "01-99", label: "I alt" },
  { code: "01", label: "Østfold (-2019)" },
  { code: "02", label: "Akershus (-2019)" },
  { code: "03", label: "Oslo" },
  { code: "04", label: "Hedmark (-2019)" },
  { code: "05", label: "Oppland (-2019)" },
  { code: "06", label: "Buskerud (-2019)" },
  { code: "07", label: "Vestfold (-2019)" },
  { code: "08", label: "Telemark (-2019)" },
  { code: "09", label: "Aust-Agder (-2019)" },
  { code: "10", label: "Vest-Agder (-2019)" },
  { code: "11", label: "Rogaland" },
  { code: "12", label: "Hordaland (-2019)" },
  { code: "14", label: "Sogn og Fjordane (-2019)" },
  { code: "15", label: "Møre og Romsdal" },
  { code: "50", label: "Trøndelag" },
  { code: "16", label: "Sør-Trøndelag (-2017)" },
  { code: "17", label: "Nord-Trøndelag (-2017)" },
  { code: "18", label: "Nordland" },
  { code: "19", label: "Troms (-2019)" },
  { code: "20", label: "Finnmark (-2019)" },
  { code: "21", label: "Svalbard" },
  { code: "25", label: "Utlandet" },
];

describe("classifyRegion", () => {
  it("classifies current-boundary fylker", () => {
    expect(classifyRegion("03", "Oslo")).toEqual({ kind: "current", code: "03", label: "Oslo" });
    expect(classifyRegion("11", "Rogaland")).toEqual({
      kind: "current",
      code: "11",
      label: "Rogaland",
    });
    expect(classifyRegion("50", "Trøndelag")).toEqual({
      kind: "current",
      code: "50",
      label: "Trøndelag",
    });
  });

  it("classifies historical fylker and extracts the supersession year", () => {
    expect(classifyRegion("01", "Østfold (-2019)")).toEqual({
      kind: "historical",
      code: "01",
      label: "Østfold (-2019)",
      supersededYear: 2019,
    });
    expect(classifyRegion("16", "Sør-Trøndelag (-2017)")).toEqual({
      kind: "historical",
      code: "16",
      label: "Sør-Trøndelag (-2017)",
      supersededYear: 2017,
    });
  });

  it("classifies Svalbard and Utlandet as non-geographic", () => {
    expect(classifyRegion("21", "Svalbard")).toEqual({
      kind: "non-geographic",
      code: "21",
      label: "Svalbard",
    });
    expect(classifyRegion("25", "Utlandet")).toEqual({
      kind: "non-geographic",
      code: "25",
      label: "Utlandet",
    });
  });

  it("classifies the national total as an aggregate", () => {
    expect(classifyRegion("01-99", "I alt")).toEqual({
      kind: "aggregate",
      code: "01-99",
      label: "I alt",
    });
  });
});

describe("partitionRegions", () => {
  it("splits all 23 real Region categories into the right buckets, never mixing eras", () => {
    const { current, historical, nonGeographic, aggregate } = partitionRegions(ALL_REGIONS);

    expect(current.map((r) => r.code).sort()).toEqual(["03", "11", "15", "18", "50"]);
    // 13 codes with "(-2019)" + 2 codes with "(-2017)" in the source list = 15.
    // (Note: the task spec's prose says "14 件が (-2019)", but counting the
    // codes it actually lists gives 13; classification here is data-driven
    // off each label's own suffix rather than off that summary count, so
    // this discrepancy doesn't affect correctness -- flagged in the report.)
    expect(historical).toHaveLength(15);
    expect(historical.every((r) => r.label.includes("(-2019)") || r.label.includes("(-2017)"))).toBe(
      true,
    );
    expect(nonGeographic.map((r) => r.code).sort()).toEqual(["21", "25"]);
    expect(aggregate.map((r) => r.code)).toEqual(["01-99"]);

    // Every category is accounted for exactly once.
    const total =
      current.length + historical.length + nonGeographic.length + aggregate.length;
    expect(total).toBe(ALL_REGIONS.length);

    // No code appears in more than one bucket (guards against a boundary-era mixup).
    const currentCodes = new Set(current.map((r) => r.code));
    const historicalCodes = new Set(historical.map((r) => r.code));
    expect([...currentCodes].some((c) => historicalCodes.has(c))).toBe(false);
  });
});
