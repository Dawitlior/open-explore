import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        'orca-radial': 'radial-gradient(ellipse at top, hsl(184 100% 50% / 0.06), transparent 60%)',
        'orca-cyan-gradient': 'linear-gradient(135deg, hsl(184 100% 50%), hsl(168 76% 42%))',
        'orca-ruby-gradient': 'linear-gradient(135deg, hsl(0 100% 56%), hsl(340 90% 50%))',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        trading: {
          cyan: "hsl(var(--trading-cyan))",
          teal: "hsl(var(--trading-teal))",
          blue: "hsl(var(--trading-blue))",
          purple: "hsl(var(--trading-purple))",
          orange: "hsl(var(--trading-orange))",
          red: "hsl(var(--trading-red))",
          green: "hsl(var(--trading-green))",
        },
        /* ── ORCA MARKETING palette (cool editorial light). Names are unique
           to the marketing layer; the five that shadow Tailwind default scales
           (indigo/violet/teal/rose/amber) only add a DEFAULT + soft/deep and
           deep-merge with the numbered scales, so the product's *-500 etc. are
           untouched. Used exclusively by src/marketing + src/first-run. ── */
        canvas: { DEFAULT: "#f6f6f8", deep: "#eef0f3" },
        surface: "#ffffff",
        plat: "#ffffff",
        line: { DEFAULT: "#e7e8ec", soft: "#f0f1f4" },
        ink: { DEFAULT: "#0f1116", "2": "#3a3d45", mute: "#6b7180", faint: "#9aa0ac" },
        char: { DEFAULT: "#111318", "2": "#1a1d24" },
        gold: "#e0a53a",
        indigo: { DEFAULT: "#7c3aed", deep: "#6d28d9", soft: "#f1e9fe" },
        violet: { DEFAULT: "#8b5cf6", soft: "#f2ecfe" },
        teal: { DEFAULT: "#1a1d24", soft: "#edeef1" },
        rose: { DEFAULT: "#e5484d", soft: "#fde8e8" },
        amber: { DEFAULT: "#e0a53a", soft: "#fbf0d9" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in":        { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in":       { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "shimmer":        { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "glow-pulse":     { "0%, 100%": { boxShadow: "0 0 0 0 hsl(184 100% 50% / 0)" }, "50%": { boxShadow: "0 0 24px 2px hsl(184 100% 50% / 0.35)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":       "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer":        "shimmer 2.4s linear infinite",
        "glow-pulse":     "glow-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
