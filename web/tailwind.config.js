/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // dark: styles follow the theme the person picked, not the browser.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "rgb(var(--brand) / <alpha-value>)", soft: "rgb(var(--brand-soft) / <alpha-value>)", ink: "rgb(var(--brand-ink) / <alpha-value>)" },
        paper: "rgb(var(--paper) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: { DEFAULT: "rgb(var(--ink) / <alpha-value>)", soft: "rgb(var(--ink-soft) / <alpha-value>)", faint: "rgb(var(--ink-faint) / <alpha-value>)" },
        line: "rgb(var(--line) / <alpha-value>)",
        herb: { DEFAULT: "rgb(var(--herb) / <alpha-value>)", soft: "rgb(var(--herb-soft) / <alpha-value>)" },
        warn: { DEFAULT: "rgb(var(--warn) / <alpha-value>)", soft: "rgb(var(--warn-soft) / <alpha-value>)" },
      },
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { card: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.05)" },
    },
  },
  plugins: [],
};
