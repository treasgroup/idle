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
        over: { DEFAULT: c("over"), strong: c("over-strong") },
      },
      fontFamily: {
        // One typeface for everything: Golos Text (made for public services, easy to read at any age).
        serif: ['"Golos Text"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
        sans: ['"Golos Text"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      fontSize: {
        display: ["2rem", { lineHeight: "2.5rem", fontWeight: "600", letterSpacing: "-0.02em" }],
        "display-lg": ["2.5rem", { lineHeight: "3rem", fontWeight: "600", letterSpacing: "-0.025em" }],
        h1: ["1.75rem", { lineHeight: "2.25rem", fontWeight: "600", letterSpacing: "-0.015em" }],
        h2: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600", letterSpacing: "-0.01em" }],
        title: ["1.0625rem", { lineHeight: "1.5rem", fontWeight: "500" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.375rem" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
        // Nothing smaller than 14 px for reading (older eyes); 13 px only for tab names and little counters.
        caption: ["0.875rem", { lineHeight: "1.25rem" }],
        micro: ["0.8125rem", { lineHeight: "1.125rem" }],
        step: ["1.375rem", { lineHeight: "2rem" }],
        "step-lg": ["1.75rem", { lineHeight: "2.5rem" }],
        timer: ["2.5rem", { lineHeight: "1", fontWeight: "500" }],
      },
      // Calm weights: «semibold» is a medium 500 (only page titles go to 600), «bold» is 600.
      fontWeight: { semibold: "500", bold: "600" },
      spacing: { 13: "3.25rem", 18: "4.5rem", 22: "5.5rem" },
      borderRadius: { card: "16px", composer: "20px", sheet: "24px", input: "12px", img: "12px" },
      boxShadow: {
        e1: "0 1px 2px rgb(33 29 26 / .05)",
        e2: "0 8px 28px rgb(33 29 26 / .12), 0 2px 6px rgb(33 29 26 / .06)",
      },
      maxWidth: { chat: "760px", "chat-wide": "920px" },
      transitionTimingFunction: { out: "cubic-bezier(.2,.8,.2,1)" },
    },
  },
  plugins: [],
};
