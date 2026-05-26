import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        brand: {
          DEFAULT: "#162D3A",
          hover: "#0e1f29",
          blue: "#0B47CF",
          deep: "#082E9E",
        },
        canvas: "#EEF3FB",
        sidebar: "#1e293b",
        card: {
          border: "#DCE6F3",
        },
        text: {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / .06), 0 1px 2px -1px rgb(0 0 0 / .04)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / .07), 0 2px 4px -2px rgb(0 0 0 / .05)",
        float: "0 10px 25px -5px rgb(0 0 0 / .08), 0 4px 10px -6px rgb(0 0 0 / .06)",
      },
    },
  },
  plugins: [],
};

export default config;
