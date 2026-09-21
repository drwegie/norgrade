import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, getCached, setCached } from "../cache";

describe("cache", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for a key that was never set", () => {
    expect(getCached("missing-key")).toBeUndefined();
  });

  it("returns the cached value before it expires", () => {
    setCached("key", { hello: "world" }, 1000);
    expect(getCached("key")).toEqual({ hello: "world" });
  });

  it("evicts an entry once its TTL has elapsed", () => {
    vi.useFakeTimers();
    setCached("key", "value", 1000);
    expect(getCached("key")).toBe("value");

    vi.advanceTimersByTime(1001);

    expect(getCached("key")).toBeUndefined();
  });
});
