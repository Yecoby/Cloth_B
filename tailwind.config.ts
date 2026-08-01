import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "#F6F8F7",
        "paper-dim": "#EDF1EF",
        ink: "#122436",
        "ink-soft": "#3A4C5C",
        sun: "#FFC145",
        "sun-deep": "#E8A322",
        water: "#2BA6A6",
        "water-deep": "#1F7A7A",
        alert: "#E8543E",
        line: "#D8DFDC",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        ticket: "18px",
      },
      boxShadow: {
        ticket: "0 1px 2px rgba(18,36,54,0.06), 0 8px 24px rgba(18,36,54,0.08)",
      },
      backgroundImage: {
        "perforation-h":
          "radial-gradient(circle, transparent 5px, #F6F8F7 5.5px) repeat-x",
      },
    },
  },
  plugins: [],
};

export default config;
