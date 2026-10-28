import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome palette.
        background: "#F5F5F5",
        surface: "#FFFFFF",
        primary: { DEFAULT: "#111111", hover: "#333333" },
        ink: "#111111",
        muted: "#111111",
        line: "#E5E5E5",
        // Gray for the lower "tool" half of split cards and for chips.
        panel: { DEFAULT: "#EBEBEB", hover: "#E0E0E0" },
        // Accent: highlights primary actions and active states.
        accent: { DEFAULT: "#2474F5", hover: "#1A62D8", soft: "#EAF1FE" },
        // Semantic red for ending a call.
        danger: { DEFAULT: "#E5484D", hover: "#D13438" },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,28,54,0.04), 0 8px 24px rgba(16,28,54,0.06)",
        panel: "0 1px 3px rgba(16,28,54,0.05), 0 12px 40px rgba(16,28,54,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
