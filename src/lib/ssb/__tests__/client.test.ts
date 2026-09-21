import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTableUrl, fetchTable } from "../client";
import { clearCache } from "../cache";
import normalFixture from "../__fixtures__/table-11689-normal.json";

describe("buildTableUrl", () => {
  it("encodes dimension value codes as bracketed query params plus outputFormat", () => {
    const url = buildTableUrl({
      tableId: "11689",
      valueCodes: { Tid: "2024", Kjonn: "*", ContentsCode: "Elever" },
    });

    expect(url).toContain("https://data.ssb.no/api/pxwebapi/v2/tables/11689/data?");
    expect(url).toContain("lang=en");
    expect(url).toContain("valueCodes%5BTid%5D=2024");
    expect(url).toContain("valueCodes%5BKjonn%5D=*");
    expect(url).toContain("valueCodes%5BContentsCode%5D=Elever");
    expect(url).toContain("outputFormat=json-stat2");
  });
});

describe("fetchTable", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the response returned by fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => normalFixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    const table = await fetchTable({
      tableId: "11689",
      valueCodes: { Tid: "2024", Kjonn: "*", ContentsCode: "Elever" },
    });

    expect(table.cells).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never touches the network on a cache hit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => normalFixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    const options = {
      tableId: "11689",
      valueCodes: { Tid: "2024", Kjonn: "*", ContentsCode: "Elever" },
    };

    const first = await fetchTable(options);
    const second = await fetchTable(options);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("throws (without caching) on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const options = { tableId: "11689", valueCodes: { Tid: "2024" } };

    await expect(fetchTable(options)).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A failed request must not be cached: retrying should hit the network again.
    await expect(fetchTable(options)).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
