/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // dark: styles follow the theme the person picked, not the browser.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: c("paper"),
        card: c("card"),
        sunken: c("sunken"),
        line: { DEFAULT: c("line"), strong: c("line-strong") },
        ink: { DEFAULT: c("ink"), soft: c("ink-soft"), faint: c("ink-faint") },
        brand: { DEFAULT: c("brand"), fill: c("brand-fill"), soft: c("brand-soft"), ink: c("brand-ink") },
        herb: { DEFAULT: c("herb"), soft: c("herb-soft") },
        warn: { DEFAULT: c("warn"), soft: c("warn-soft") },
      },
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ['"Golos Text"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      fontSize: {
        display: ["2rem", { lineHeight: "2.5rem", fontWeight: "600" }],
        "display-lg": ["2.5rem", { lineHeight: "3rem", fontWeight: "600" }],
        h1: ["1.75rem", { lineHeight: "2.125rem", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.625rem", fontWeight: "600" }],
        title: ["1.0625rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.375rem" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
        caption: ["0.8125rem", { lineHeight: "1.125rem" }],
        micro: ["0.75rem", { lineHeight: "1rem" }],
        step: ["1.5rem", { lineHeight: "2rem" }],
        "step-lg": ["1.875rem", { lineHeight: "2.5rem" }],
        timer: ["2.5rem", { lineHeight: "1", fontWeight: "600" }],
      },
      spacing: { 13: "3.25rem", 18: "4.5rem", 22: "5.5rem" },
      borderRadius: { card: "20px", composer: "24px", sheet: "28px", input: "12px", img: "14px" },
      boxShadow: {
        e1: "0 1px 2px rgb(33 29 26 / .04), 0 2px 8px rgb(33 29 26 / .04)",
        e2: "0 8px 28px rgb(33 29 26 / .12), 0 2px 6px rgb(33 29 26 / .06)",
      },
      maxWidth: { chat: "760px" },
      transitionTimingFunction: { out: "cubic-bezier(.2,.8,.2,1)" },
    },
  },
  plugins: [],
};
