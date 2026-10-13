import type { Config } from "tailwindcss";
import { uiPreset } from "../../packages/ui/src/tailwind-preset";

const config: Config = {
  presets: [uiPreset as unknown as Partial<Config>],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [],
};

export default config;
