import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFBF7",
          100: "#FAF7F2",
          200: "#F5F0E6",
          300: "#EDE5D4",
          400: "#E0D4BB",
        },
        gold: {
          300: "#E5CE8F",
          400: "#D4B65E",
          500: "#C9A227",
          600: "#A8861C",
          700: "#8A6D14",
        },
        bni: {
          red: "#C8102E",
          dark: "#9E0B22",
          soft: "#FBE9EC",
        },
        ink: {
          DEFAULT: "#1D1B16",
          soft: "#52514E",
          muted: "#898781",
        },
      },
      borderRadius: {
        card: "24px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro TC",
          "SF Pro Display",
          "PingFang TC",
          "Noto Sans TC",
          "Microsoft JhengHei",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(31, 26, 12, 0.08)",
        "glass-lg": "0 16px 48px rgba(31, 26, 12, 0.12)",
        gold: "0 8px 24px rgba(201, 162, 39, 0.25)",
        red: "0 8px 24px rgba(200, 16, 46, 0.22)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
