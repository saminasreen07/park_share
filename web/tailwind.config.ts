import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary, #FF6B35)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--color-secondary, #004E89)",
          foreground: "#ffffff",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary, #A9ECE1)",
        },
        success: "var(--color-success, #00B050)",
        warning: "var(--color-warning, #FFB81C)",
        error: "var(--color-error, #E81828)",
        info: "var(--color-info, #0078D4)",
        background: "var(--color-background, #ffffff)",
        foreground: "var(--color-foreground, #0f172a)",
        muted: {
          DEFAULT: "var(--color-muted, #f1f5f9)",
          foreground: "var(--color-muted-foreground, #64748b)",
        },
        accent: {
          DEFAULT: "var(--color-accent, #f8fafc)",
          foreground: "var(--color-accent-foreground, #0f172a)",
        },
        card: {
          DEFAULT: "var(--color-card, #ffffff)",
          foreground: "var(--color-card-foreground, #0f172a)",
        },
        border: "var(--color-border, #e2e8f0)",
      },
      fontFamily: {
        sans: ["Poppins", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
        "glass-gradient-dark": "linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.3))",
      },
      boxShadow: {
        "glass-light": "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      backdropBlur: {
        glass: "12px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slideDown 0.3s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
