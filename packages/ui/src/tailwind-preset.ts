/**
 * Shared Tailwind preset for the Easy Logi "Manifest" design system.
 *
 * Maps the design tokens (defined as CSS variables in `tokens.css`) onto Tailwind
 * colour / font / radius names. Any app that renders the shared components
 * (StatusPill, VerifiedFitChip, Logo) extends this preset AND imports `tokens.css`,
 * so the components look the same in every consumer.
 *
 * Typed loosely (plain object) so this package needs no `tailwindcss` dependency.
 */
export const uiPreset = {
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-soft": "hsl(var(--border-soft))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          2: "hsl(var(--ink-2))",
        },
        signal: {
          DEFAULT: "hsl(var(--signal))",
          tint: "hsl(var(--signal-tint))",
        },
        "on-ink-muted": "hsl(var(--on-ink-muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        transit: {
          DEFAULT: "hsl(var(--transit))",
          foreground: "hsl(var(--transit-foreground))",
        },
        "cleared-tint": "hsl(var(--cleared-tint))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius-card)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 2px)",
      },
    },
  },
};

export default uiPreset;
