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

  it("does not collide in the cache when only valueCodes differ (same tableId)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => normalFixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    const optionsBothSexes = {
      tableId: "11689",
      valueCodes: { Tid: "2024", Kjonn: "0", ContentsCode: "Elever" },
    };
    const optionsMalesOnly = {
      tableId: "11689",
      valueCodes: { Tid: "2024", Kjonn: "1", ContentsCode: "Elever" },
    };

    await fetchTable(optionsBothSexes);
    await fetchTable(optionsMalesOnly);
    // Repeating the first query should now be a cache hit, not a third fetch.
    await fetchTable(optionsBothSexes);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchMock.mock.calls[0];
    const [secondUrl] = fetchMock.mock.calls[1];
    expect(firstUrl).not.toBe(secondUrl);
  });

  it("propagates the parser's error (and does not cache) when the response has an unrecognized status code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        id: ["Tid"],
        size: [1],
        dimension: { Tid: { category: { index: ["2024"] } } },
        value: [null],
        status: { "0": "?" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const options = { tableId: "x", valueCodes: { Tid: "2024" } };

    await expect(fetchTable(options)).rejects.toThrow(/Unrecognized SSB status code/);
    // Not cached: a retry must hit the network again, not return stale/partial data.
    await expect(fetchTable(options)).rejects.toThrow(/Unrecognized SSB status code/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
