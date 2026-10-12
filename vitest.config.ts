import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live next to the code they test, plus package-level __tests__.
    include: [
      "packages/**/*.test.ts",
      "services/**/*.test.ts",
      "apps/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/**/src/**/*.ts", "services/**/src/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@easy-logi/shared": new URL("./packages/shared/src/index.ts", import.meta.url)
        .pathname,
      "@easy-logi/costing": new URL("./packages/costing/src/index.ts", import.meta.url)
        .pathname,
      "@easy-logi/agent-runtime": new URL(
        "./packages/agent-runtime/src/index.ts",
        import.meta.url,
      ).pathname,
      "@easy-logi/agents": new URL("./services/agents/index.ts", import.meta.url).pathname,
    },
  },
});
