/**
 * Tests for the axis scale shared by the line chart and the bar chart.
 *
 * The property that matters most here is the one the app's honesty rests
 * on: a special value must never be able to influence the scale, and the
 * axis must always start at 0.
 */
import { describe, expect, it } from "vitest";
import { niceMax, specialValueMarker, TICK_COUNT } from "../chart-scale";
import type { SsbCell } from "@/lib/ssb/types";

function values(...numbers: number[]): SsbCell[] {
  return numbers.map((value) => ({ kind: "value", value }) as const);
}

describe("niceMax", () => {
  it("rounds up to a bound that divides into whole gridlines", () => {
    expect(niceMax(values(17.2))).toBe(20);
    expect(niceMax(values(0.3, 4.1, 11.9))).toBe(12);
    expect(niceMax(values(78.5))).toBe(80);
  });

  it("produces ticks that are round numbers, not the raw maximum divided up", () => {
    const max = niceMax(values(23.4));
    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (i * max) / TICK_COUNT);

    expect(ticks).toEqual([0, 6, 12, 18, 24]);
  });

  it("ignores special values instead of treating them as zero or as data", () => {
    const withSpecials: SsbCell[] = [
      { kind: "not-applicable" },
      ...values(17.2),
      { kind: "not-available" },
      { kind: "confidential" },
    ];

    expect(niceMax(withSpecials)).toBe(niceMax(values(17.2)));
  });

  it("falls back to a positive bound when there is nothing to plot", () => {
    expect(niceMax([])).toBe(1);
    expect(niceMax([{ kind: "confidential" }])).toBe(1);
    expect(niceMax(values(0))).toBe(1);
  });

  it("never returns a bound below the largest value (the axis cannot clip a bar)", () => {
    for (const value of [0.01, 0.99, 1, 4.9, 5, 33.3, 99.9, 100, 1234]) {
      expect(niceMax(values(value))).toBeGreaterThanOrEqual(value);
    }
  });
});

describe("specialValueMarker", () => {
  it("returns SSB's own marker for each of the three special values", () => {
    expect(specialValueMarker({ kind: "not-applicable" })?.symbol).toBe(".");
    expect(specialValueMarker({ kind: "not-available" })?.symbol).toBe("..");
    expect(specialValueMarker({ kind: "confidential" })?.symbol).toBe(":");
  });

  it("returns null for a real value, including 0", () => {
    expect(specialValueMarker({ kind: "value", value: 0 })).toBeNull();
  });
});
