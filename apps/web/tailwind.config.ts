import type { Config } from "tailwindcss";
import basePreset from "../../packages/config/tailwind-preset.js";

const config: Config = {
  presets: [basePreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
export default config;
