import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
    // Run tests sequentially for DB tests
    fileParallelism: false,
    maxWorkers: 1,
  },
});
