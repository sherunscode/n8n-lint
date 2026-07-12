import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts"],
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["packages/core/src/index.ts", "packages/cli/src/args.ts", "packages/cli/src/discovery.ts"],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      }
    }
  }
});
