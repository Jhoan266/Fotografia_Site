import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0c0c0c",
          soft: "#161616",
          line: "#2a2a2a",
        },
        sand: {
          DEFAULT: "#c5a37d",
          soft: "#d8c3a5",
          deep: "#9a7b55",
        },
        mist: "#a8a29a",
        paper: "#f4f0ea",
        wa: "#25d366",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        sans: ["var(--font-outfit)", "sans-serif"],
        serif: ["var(--font-instrument)", "serif"],
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0,0,0,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "mask-reveal": {
          "0%": { clipPath: "inset(0 0 100% 0)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
        "grain-shift": {
          "0%, 100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(-2%, 1%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s ease forwards",
        "mask-reveal": "mask-reveal 1s cubic-bezier(.2,.8,.2,1) forwards",
        "grain-shift": "grain-shift 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
