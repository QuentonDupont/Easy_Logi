/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  rules: {
    // TypeScript's own checker handles undefined identifiers and types.
    "no-undef": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["error", { allow: ["warn", "error", "info"] }],
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "out/",
    "coverage/",
    "next-env.d.ts",
    "*.config.js",
    "*.config.cjs",
    "*.config.mjs",
  ],
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "scripts/**/*.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
