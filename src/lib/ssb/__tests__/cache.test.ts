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

  it("is still valid at the exact TTL boundary and expired 1ms after it", () => {
    // getCached evicts on `Date.now() > expiresAt` (strictly greater), so a
    // read landing exactly on expiresAt must still return the cached value.
    vi.useFakeTimers();
    setCached("key", "value", 1000);

    vi.advanceTimersByTime(1000);
    expect(getCached("key")).toBe("value");

    vi.advanceTimersByTime(1);
    expect(getCached("key")).toBeUndefined();
  });

  it("applies the 1-hour default TTL when none is given explicitly", () => {
    vi.useFakeTimers();
    setCached("key", "value");

    vi.advanceTimersByTime(60 * 60 * 1000 - 1);
    expect(getCached("key")).toBe("value");

    vi.advanceTimersByTime(2);
    expect(getCached("key")).toBeUndefined();
  });

  it("keeps entries under different keys fully independent (no key collision)", () => {
    setCached("key-a", "value-a", 1000);
    setCached("key-b", "value-b", 1000);

    expect(getCached("key-a")).toBe("value-a");
    expect(getCached("key-b")).toBe("value-b");

    setCached("key-a", "value-a-updated", 1000);
    expect(getCached("key-a")).toBe("value-a-updated");
    expect(getCached("key-b")).toBe("value-b");
  });
});
