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
    // Array form so the shared subpath (@easy-logi/shared/magicLink) and the console "@/" alias
    // resolve correctly; order matters — more specific patterns first.
    alias: [
      {
        find: /^@easy-logi\/shared\/(.*)$/,
        replacement: new URL("./packages/shared/src/$1", import.meta.url).pathname,
      },
      {
        find: "@easy-logi/shared",
        replacement: new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
      },
      {
        find: /^@easy-logi\/import-planner\/(.*)$/,
        replacement: new URL("./packages/import-planner/src/$1", import.meta.url).pathname,
      },
      {
        find: "@easy-logi/import-planner",
        replacement: new URL("./packages/import-planner/src/index.ts", import.meta.url).pathname,
      },
      {
        find: "@easy-logi/costing",
        replacement: new URL("./packages/costing/src/index.ts", import.meta.url).pathname,
      },
      {
        find: "@easy-logi/agent-runtime",
        replacement: new URL("./packages/agent-runtime/src/index.ts", import.meta.url).pathname,
      },
      {
        find: "@easy-logi/agents",
        replacement: new URL("./services/agents/index.ts", import.meta.url).pathname,
      },
      {
        find: /^@\/(.*)$/,
        replacement: new URL("./apps/console/src/$1", import.meta.url).pathname,
      },
    ],
  },
});
