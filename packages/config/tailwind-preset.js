/** Shared Tailwind design tokens. Figma MCP design context should update this file
 *  directly once real brand tokens (color, type scale, spacing) are pulled in. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Placeholder calm/neutral palette — replace with Figma-derived tokens.
        calm: {
          50: "#f4f7f6",
          100: "#e3ece9",
          400: "#7fa89c",
          600: "#4d7a6d",
          900: "#1f332c",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
};
