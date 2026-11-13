import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/web/**/*.test.ts", "supabase/**/*.test.ts"],
    exclude: ["**/node_modules/**", "e2e/**"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
