// packages/ui/tokens.ts — design tokens, single source of truth (vision §Stack, tokens.md)
//
// Three-tier architecture:
//   1. PRIMITIVES — raw values (colors, scale steps), descriptive names
//   2. SEMANTIC   — meaning-bearing tokens that components reference
//   3. COMPONENT  — only when truly component-specific (rare; not present yet)
//
// Components and CSS reference SEMANTIC tokens (e.g. color.text.primary).
// Primitives exist only as a palette feeding the semantic layer.
//
// To regenerate the CSS counterpart (packages/ui/styles.css):
//   bun scripts/generate-tokens-css.ts

// ─── Tier 1: Primitives ─────────────────────────────────────────

export const primitives = {
  amber: {
    50: 'oklch(0.98 0.02 80)',
    100: 'oklch(0.95 0.03 75)',
    200: 'oklch(0.89 0.05 75)',
    500: 'oklch(0.72 0.08 70)',
    600: 'oklch(0.63 0.09 55)',
  },
  ink: {
    400: 'oklch(0.55 0.01 270)',
    600: 'oklch(0.35 0.02 270)',
    900: 'oklch(0.15 0.03 270)',
  },
  red: {
    500: 'oklch(0.58 0.20 25)',
  },
  green: {
    500: 'oklch(0.65 0.18 145)',
  },
  space: {
    0: '0',
    1: '0.125rem', // 2px
    2: '0.25rem', // 4px
    3: '0.5rem', // 8px
    4: '1rem', // 16px
    5: '1.5rem', // 24px
    6: '2rem', // 32px
    7: '3rem', // 48px
    8: '4rem', // 64px
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px',
  },
  font: {
    sans: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SF Mono", monospace',
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  size: {
    xs: '0.75rem', // 12
    sm: '0.875rem', // 14
    base: '1rem', // 16
    lg: '1.125rem', // 18
    xl: '1.5rem', // 24
    '2xl': '2.25rem', // 36
    '3xl': '3rem', // 48
  },
  motion: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// ─── Tier 2: Semantic ────────────────────────────────────────────

export const semantic = {
  color: {
    bg: {
      primary: primitives.amber[50],
      secondary: primitives.amber[100],
      tertiary: primitives.amber[200],
      surface: '#ffffff',
    },
    text: {
      primary: primitives.ink[900],
      secondary: primitives.ink[600],
      muted: primitives.ink[400],
    },
    accent: {
      default: primitives.amber[500],
      hover: primitives.amber[600],
    },
    feedback: {
      error: primitives.red[500],
      success: primitives.green[500],
    },
    border: {
      subtle: primitives.amber[200],
      strong: primitives.ink[400],
    },
  },
  spacing: primitives.space,
  radius: primitives.radius,
  font: {
    body: primitives.font.sans,
    code: primitives.font.mono,
  },
  weight: primitives.weight,
  size: primitives.size,
  motion: primitives.motion,
} as const

export type Tokens = typeof semantic
