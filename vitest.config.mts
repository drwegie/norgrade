import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Network access is disallowed for this test suite by convention: every
    // SSB fixture in src/lib/ssb/__fixtures__ is a static JSON file, and
    // tests exercise the HTTP layer by stubbing `fetch`.
    restoreMocks: true,
  },
});
