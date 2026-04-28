# Tokens — Machine-readable Source of Truth

> Status: Reference
> Last verified: April 2026
> Scope: Every value reused across the visual design — colors, spacing, typography, motion, breakpoints
> Paired with: `design.md` (the _why_ and _aesthetic_)

---

## What this file is

Gaia's design tokens as code. `tokens.md` is the reference doc; `packages/ui/src/tokens.ts` is the source of truth. Every pixel value in Gaia — CSS, Tailwind config, Figma variables, TypeScript constants — comes from this file.

`design.md` answers "what does Gaia look like?" This file answers "what are the values, how are they structured, and how do they propagate?"

---

## Why tokens as code

Three tokens (`amber-500`, `space-md`, `radius-sm`) defined once, used everywhere. Without tokens:

- Same color appears with slight variations across the codebase
- Rebranding means find-and-replace across hundreds of files
- Figma and CSS drift silently
- Agents invent new values on every generated component

With tokens:

- **One source of truth.** Change once, propagates everywhere.
- **Semantic meaning.** `--text-muted` says what the color does; `#A69D91` says only what it is.
- **Type safety.** TypeScript knows the valid tokens; invalid references are compile errors.
- **Cross-tool.** The same tokens feed CSS, Tailwind, Figma, Style Dictionary, documentation.
- **Agents stay disciplined.** Agents reference tokens by name; they don't pick a new hex value every time.

---

## The three-tier architecture

This is load-bearing. Every token lives in exactly one of three tiers.

### Tier 1 — Primitive

Raw values. The palette of "what exists." Named by descriptive properties, not usage.

```ts
amber: {
  50:  'oklch(0.98 0.02 80)',   // warm off-white
  100: 'oklch(0.95 0.03 75)',   // sand
  200: 'oklch(0.89 0.05 75)',   // linen
  500: 'oklch(0.72 0.08 70)',   // accent gold
  600: 'oklch(0.63 0.09 55)',   // deeper gold
}

space: {
  0:  '0px',
  1:  '2px',
  2:  '4px',
  3:  '8px',
  4:  '16px',
  5:  '24px',
  6:  '32px',
  7:  '48px',
  8:  '64px',
  9:  '96px',
  10: '128px',
}
```

**Rules:**

- Descriptive names, not usage names (`amber.500`, not `primary`)
- Never applied directly in components or CSS
- Exist to be referenced by semantic and component tokens
- Numeric suffixes by convention (50/100/500/900 for color, 1/2/3 for scale)

### Tier 2 — Semantic

Meaning-bearing tokens. What code references.

```ts
color: {
  bg: {
    primary:   'var(--amber-50)',   // main background
    secondary: 'var(--amber-100)',  // cards, sections
    tertiary:  'var(--amber-200)',  // hover states
    surface:   '#ffffff',           // inputs, modals
  },
  text: {
    primary:   'var(--ink-900)',
    secondary: 'var(--ink-600)',
    muted:     'var(--ink-400)',
  },
  accent: {
    default: 'var(--amber-500)',
    hover:   'var(--amber-600)',
  },
  // ...
}

spacing: {
  xs:  'var(--space-2)',    // 4px
  sm:  'var(--space-3)',    // 8px
  md:  'var(--space-4)',    // 16px
  lg:  'var(--space-5)',    // 24px
  xl:  'var(--space-6)',    // 32px
  // ...
}
```

**Rules:**

- Named by usage (`text.primary`, not `ink.900`)
- Reference primitives, never raw values
- This is the layer components import
- Swapping primitives re-themes automatically

### Tier 3 — Component (rare)

Component-specific tokens. Added only when semantic tokens can't express a component's needs.

```ts
button: {
  primary: {
    bg:      'var(--color-accent-default)',
    text:    '#ffffff',
    bgHover: 'var(--color-accent-hover)',
    padX:    'var(--spacing-md)',
    padY:    'var(--spacing-sm)',
  },
  // ...
}
```

**Rules:**

- Only when semantic tokens insufficient
- Reference semantic tokens when possible
- Most components don't need this tier — stop at semantic
- If you're adding component tokens, ask whether the semantic tier is missing something general

**The test for which tier:**

- "What color is this?" → primitive
- "What does this color do?" → semantic
- "What does this specific component do with this color?" → component

Use the **most specific** available tier. If a component token exists for your need, use it. Otherwise semantic. Primitives last-resort only in generative code (e.g., computing a gradient).

---

## File structure

```
packages/ui/
├── src/
│   ├── tokens.ts              # SOURCE OF TRUTH (primitives + semantics)
│   ├── tokens.css             # Generated from tokens.ts (CSS custom props)
│   ├── tokens.tailwind.ts     # Generated from tokens.ts (Tailwind @theme)
│   ├── tokens.dtcg.json       # Generated (W3C DTCG format)
│   └── index.ts               # Exports typed tokens for TS consumers
├── scripts/
│   └── generate-tokens.ts     # tokens.ts → tokens.css + tailwind + json
└── package.json
```

### Build pipeline

```
tokens.ts (source)
   ├── generate-tokens.ts
   │     ├── tokens.css          ← consumed by all CSS
   │     ├── tokens.tailwind.ts  ← consumed by Tailwind v4 @theme
   │     └── tokens.dtcg.json    ← exported for Figma, Style Dictionary
   └── index.ts                  ← TypeScript consumers
```

`tokens.css` is git-ignored and regenerated on every build. `tokens.dtcg.json` is checked in for Figma sync.

### Generation trigger

```sh
bun run tokens:generate
# or, automatically via Moon on file change
moon run ui:tokens
```

Runs on:

- Pre-commit (via Moon)
- CI (verifies generated files match source)
- Post-pull (if `tokens.ts` changed)

---

## Token categories

### Color

Primitives use OKLCH. Semantic tokens reference primitives.

```ts
// packages/ui/src/tokens.ts

export const primitives = {
  color: {
    amber: {
      50: 'oklch(0.98 0.02 80)',
      100: 'oklch(0.95 0.03 75)',
      200: 'oklch(0.89 0.05 75)',
      500: 'oklch(0.72 0.08 70)',
      600: 'oklch(0.63 0.09 55)',
    },
    ink: {
      400: 'oklch(0.70 0.02 70)',
      600: 'oklch(0.48 0.02 60)',
      900: 'oklch(0.18 0.01 60)',
    },
    sage: { 500: 'oklch(0.65 0.09 140)' },
    terracotta: { 500: 'oklch(0.60 0.14 30)' },
    gold: { 500: 'oklch(0.78 0.14 85)' },
    slate: { 400: 'oklch(0.65 0.03 240)' },
  },
} as const

export const semantic = {
  color: {
    bg: {
      primary: primitives.color.amber[50],
      secondary: primitives.color.amber[100],
      tertiary: primitives.color.amber[200],
      surface: '#ffffff',
    },
    text: {
      primary: primitives.color.ink[900],
      secondary: primitives.color.ink[600],
      muted: primitives.color.ink[400],
    },
    accent: {
      default: primitives.color.amber[500],
      hover: primitives.color.amber[600],
    },
    status: {
      success: primitives.color.sage[500],
      error: primitives.color.terracotta[500],
      warning: primitives.color.gold[500],
      info: primitives.color.slate[400],
    },
  },
} as const
```

**sRGB fallback generation:** during build, each OKLCH color gets an sRGB fallback computed via culori:

```css
.element {
  color: #c4956a; /* generated sRGB fallback */
  color: oklch(0.72 0.08 70); /* OKLCH for modern browsers */
}
```

### Typography

```ts
export const typography = {
  family: {
    serif: '"Instrument Serif", Georgia, serif',
    sans: '"Instrument Sans", system-ui, sans-serif',
    mono: '"Geist Mono", "Fira Code", Menlo, monospace',
  },
  size: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px — never below
    lg: '1.1875rem', // 19px
    xl: '1.5rem', // 24px
    '2xl': '2rem', // 32px
    '3xl': '2.25rem', // 36px
    '4xl': 'clamp(2.5rem, 2rem + 2vw, 3rem)',
    hero: 'clamp(2.75rem, 2rem + 3vw, 3.5rem)',
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  leading: {
    tight: '1.2', // headings
    normal: '1.5',
    relaxed: '1.6', // body
    loose: '1.75', // long-form prose
  },
  tracking: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.025em',
  },
} as const
```

### Spacing

```ts
export const spacing = {
  0: '0px',
  1: '2px', // 2xs
  2: '4px', // xs
  3: '8px', // sm
  4: '16px', // md
  5: '24px', // lg
  6: '32px', // xl
  7: '48px', // 2xl
  8: '64px', // 3xl
  9: '96px', // 4xl
  10: '128px', // 5xl
} as const
```

Semantic aliases:

```ts
export const semantic = {
  spacing: {
    xs: spacing[2],
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[5],
    xl: spacing[6],
    '2xl': spacing[7],
    '3xl': spacing[8],
    '4xl': spacing[9],
  },
}
```

### Radius

```ts
export const radius = {
  none: '0',
  sm: '8px', // buttons, inputs, tags
  md: '12px', // cards, alerts
  lg: '16px', // modals, hero sections
  full: '9999px', // pills, badges, avatars
} as const
```

### Shadow

Subtle, warm-toned shadows matching the aesthetic. Use `oklch` for shadow colors too (darker values of ink, not pure black).

```ts
export const shadow = {
  none: 'none',
  sm: '0 1px 2px 0 oklch(0.18 0.01 60 / 0.05)',
  md: '0 4px 6px -1px oklch(0.18 0.01 60 / 0.08), 0 2px 4px -2px oklch(0.18 0.01 60 / 0.04)',
  lg: '0 10px 15px -3px oklch(0.18 0.01 60 / 0.08), 0 4px 6px -4px oklch(0.18 0.01 60 / 0.04)',
  xl: '0 20px 25px -5px oklch(0.18 0.01 60 / 0.08), 0 8px 10px -6px oklch(0.18 0.01 60 / 0.04)',
  inner: 'inset 0 2px 4px 0 oklch(0.18 0.01 60 / 0.06)',
} as const
```

### Z-index

Semantic scale. No arbitrary values.

```ts
export const zIndex = {
  base: '0',
  dropdown: '100',
  sticky: '200',
  modalBackdrop: '300',
  modal: '400',
  toast: '500',
  tooltip: '600',
} as const
```

### Motion

```ts
export const motion = {
  duration: {
    instant: '0ms', // disabled / no motion
    micro: '150ms', // hover, toggle
    short: '250ms', // state change, modal fade
    medium: '400ms', // structural change
    long: '500ms', // rare — page transitions
  },
  easing: {
    enter: 'cubic-bezier(0.25, 1, 0.5, 1)', // quart-out
    exit: 'cubic-bezier(0.7, 0, 0.84, 0)', // ease-in
    move: 'cubic-bezier(0.65, 0, 0.35, 1)', // ease-in-out
    // ❌ Do not add: bounce, elastic, overshoot
  },
} as const
```

### Breakpoints

```ts
export const breakpoint = {
  sm: '640px', // small tablet
  md: '768px', // tablet
  lg: '1024px', // laptop
  // xl: '1280px',  // only if design needs it
} as const
```

### Opacity

```ts
export const opacity = {
  disabled: '0.5',
  subtle: '0.6',
  muted: '0.75',
  full: '1',
} as const
```

---

## Naming conventions

Tokens follow strict naming rules. Agents generating tokens check against these.

### General

- **kebab-case** in CSS (`--bg-primary`)
- **camelCase** in TypeScript (`bgPrimary`)
- **namespace.category.variant.state** in full form (`color.text.primary.hover`)

### Color primitives

- Named by hue: `amber`, `ink`, `sage`, `terracotta`, `gold`, `slate`
- Shade by numeric scale (50/100/200/300/400/500/600/700/800/900)
- Never usage-named at the primitive tier (no `primary.500`)

### Semantic tokens

- Named by **purpose**: `text`, `bg`, `accent`, `status`, `border`
- Variant describes intent: `text.primary` (main text), `text.secondary` (less emphasis), `text.muted` (metadata)
- States are suffixed: `accent.hover`, `text.disabled`

### Forbidden in token names

- Vendor names — no `amber-500-tailwind`
- Numbers as primary identifier — no `color-1`, `color-2`
- Hex values — no `text-a69d91`
- Language from implementation details — no `text-primary-ltr` for direction

---

## Integration points

### CSS custom properties (primary consumption)

Generated `tokens.css`:

```css
:root {
  /* Primitives */
  --amber-50: oklch(0.98 0.02 80);
  --amber-500: oklch(0.72 0.08 70);
  --ink-900: oklch(0.18 0.01 60);
  /* ... */

  /* Semantic */
  --bg-primary: var(--amber-50);
  --text-primary: var(--ink-900);
  --accent: var(--amber-500);
  /* ... */

  /* Spacing */
  --space-md: 16px;
  /* ... */
}

@supports not (color: oklch(0 0 0)) {
  :root {
    --amber-50: #faf8f5;
    --amber-500: #c4956a;
    --ink-900: #1a1714;
    /* sRGB fallbacks */
  }
}
```

Components reference semantic tokens:

```css
.button-primary {
  background: var(--accent);
  color: white;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
}
```

### Tailwind v4 `@theme`

```css
/* packages/ui/src/globals.css */
@import 'tailwindcss';
@import './tokens.css';

@theme {
  --color-bg-primary: var(--bg-primary);
  --color-bg-secondary: var(--bg-secondary);
  --color-text-primary: var(--text-primary);
  --color-accent: var(--accent);

  --spacing-xs: var(--space-2);
  --spacing-sm: var(--space-3);
  --spacing-md: var(--space-4);

  --radius-sm: var(--radius-sm);
  /* etc */
}
```

Tailwind classes become token-aware:

```html
<div class="bg-bg-primary text-text-primary p-md rounded-sm">
  <!-- uses design tokens via Tailwind -->
</div>
```

### TypeScript consumers

```ts
import { tokens } from '@gaia/ui/tokens'

// Type-safe access
const bg = tokens.color.bg.primary
const gap = tokens.spacing.md

// Compile error on invalid token
const bad = tokens.color.bg.doesNotExist // ❌ TypeScript error
```

Exposed types:

```ts
export type ColorToken = keyof typeof tokens.color
export type SpacingToken = keyof typeof tokens.spacing
export type RadiusToken = keyof typeof tokens.radius
```

### W3C DTCG export

For Figma and external tool sync. Generated `tokens.dtcg.json`:

```json
{
  "color": {
    "amber": {
      "50": { "$value": "#FAF8F5", "$type": "color" },
      "500": { "$value": "#C4956A", "$type": "color" }
    }
  },
  "spacing": {
    "md": { "$value": "16px", "$type": "dimension" }
  }
}
```

Imported into Figma via the Tokens Studio plugin. Round-trips: Figma designer updates a token → commits JSON → CI regenerates `tokens.ts` (future enhancement; v1 is one-way code-to-Figma).

### `.gaia/rules.ts` integration

Certain token rules are enforced globally via `.gaia/rules.ts`:

```ts
// .gaia/rules.ts (excerpt)
export const designRules = {
  noHardcodedColor: {
    description: 'No hex/rgb colors in application code — use tokens',
    enforce: 'lint',
    pattern: /#([0-9a-f]{3,8})|rgb\(|rgba\(|hsl\(|hsla\(/i,
    exceptions: ['packages/ui/src/tokens.ts', 'packages/ui/src/tokens.css'],
  },
  noMagicZIndex: {
    description: 'Z-index must come from the semantic scale',
    enforce: 'lint',
    pattern: /z-index:\s*\d+/,
    exceptions: ['packages/ui/src/tokens.ts'],
  },
  noOffscaleSpacing: {
    description: 'Spacing values must come from the token scale',
    enforce: 'lint',
    pattern: /padding|margin|gap.*:\s*\d+(px|rem)/,
  },
}
```

Enforced at lint time. Violations block the PR.

---

## Example: adding a new token

End-to-end workflow for adding `color.border.emphasis`.

### Step 1 — add primitive if needed

If an existing primitive works, skip this step. Otherwise:

```ts
// packages/ui/src/tokens.ts
export const primitives = {
  color: {
    amber: {
      // ...existing
      400: 'oklch(0.80 0.06 70)', // new primitive
    },
  },
}
```

### Step 2 — add semantic token

```ts
export const semantic = {
  color: {
    border: {
      subtle: primitives.color.amber[200],
      default: primitives.color.amber[200],
      emphasis: primitives.color.amber[400], // new semantic token
    },
  },
}
```

### Step 3 — regenerate

```sh
bun run tokens:generate
```

Generates:

- CSS custom property `--border-emphasis`
- Tailwind v4 class `border-border-emphasis`
- TypeScript entry `tokens.color.border.emphasis`
- DTCG JSON entry

### Step 4 — consume

```tsx
// In a component
;<div class="border border-border-emphasis">{/* uses new token */}</div>

// Or in TypeScript
import { tokens } from '@gaia/ui/tokens'
const borderColor = tokens.color.border.emphasis
```

### Step 5 — log in design.md

Add to decisions log in `design.md`:

| 2026-04-20 | Added `color.border.emphasis` token | For warning callouts and emphasized form fields. Distinct from default border but not terracotta (not an error). |

### Step 6 — commit

Single PR touches:

- `packages/ui/src/tokens.ts` (source)
- `packages/ui/src/tokens.css` (regenerated)
- `packages/ui/src/tokens.dtcg.json` (regenerated)
- `docs/reference/design.md` (decisions log)

---

## Testing tokens

Tokens are code; code is tested.

### Type tests

```ts
// packages/ui/test/tokens.test.ts
import { tokens } from '../src/tokens'
import { expectTypeOf } from 'expect-type'

it('semantic tokens reference primitives', () => {
  expectTypeOf(tokens.color.bg.primary).toEqualTypeOf<string>()
  expect(tokens.color.bg.primary).toBe(tokens.color.amber[50])
})
```

### Contrast tests

```ts
import { calculateContrast } from 'culori'

it('text.primary meets AA on every bg', () => {
  const bgs = Object.values(tokens.color.bg)
  for (const bg of bgs) {
    const ratio = calculateContrast(tokens.color.text.primary, bg)
    expect(ratio).toBeGreaterThanOrEqual(4.5) // WCAG AA
  }
})

it('text.muted meets AA on intended backgrounds only', () => {
  // text.muted is allowed on bg-primary only (not on white surface)
  const ratio = calculateContrast(tokens.color.text.muted, tokens.color.bg.primary)
  expect(ratio).toBeGreaterThanOrEqual(4.5)
})
```

### Reference integrity

```ts
it('no orphaned semantic tokens', () => {
  // Every semantic token must reference an existing primitive
  for (const semantic of walkSemantic(tokens)) {
    expect(primitiveExists(semantic.reference)).toBe(true)
  }
})
```

### Generated file consistency

```ts
it('generated CSS matches source', () => {
  const source = parseTokens('packages/ui/src/tokens.ts')
  const generated = parseCSS('packages/ui/src/tokens.css')
  expect(generated).toEqual(expectedCSS(source))
})
```

CI fails if generated files drift from source.

---

## Theming and variants

### Dark mode (deferred to future tier)

If added, dark mode is a _semantic remapping_, not a component change:

```ts
// tokens.dark.ts (future)
export const semanticDark = {
  color: {
    bg: {
      primary: primitives.color.ink[900], // was amber.50
      secondary: primitives.color.ink[800],
    },
    text: {
      primary: primitives.color.amber[50], // was ink.900
    },
  },
}
```

Applied via `:root[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`. Components don't change — semantic tokens resolve differently.

### Multi-brand (not planned)

Same pattern if ever needed: swap primitives, keep semantic mappings. Components never know which brand they're in.

---

## Common mistakes

| Mistake                                           | Why wrong                      | Fix                                      |
| ------------------------------------------------- | ------------------------------ | ---------------------------------------- |
| Hardcoding a color in CSS                         | Breaks on re-theme, untestable | Use semantic token                       |
| Using primitive directly in component             | Skips semantic meaning         | Reference semantic token                 |
| Adding a component token when semantic would work | Tier inflation                 | Stop at semantic tier                    |
| Off-scale spacing (`padding: 13px`)               | Breaks vertical rhythm         | Pick nearest scale step                  |
| Magic z-index (`z-index: 9999`)                   | Layer chaos at scale           | Use semantic z-index                     |
| Vendor-prefixed token names                       | Couples to tool, not design    | Abstract name                            |
| New primitive for one-off use                     | Palette bloat                  | Reuse existing, or question the use case |

---

## Quick reference

| Need                     | Answer                                              |
| ------------------------ | --------------------------------------------------- |
| Source of all values     | `packages/ui/src/tokens.ts`                         |
| Generated CSS            | `packages/ui/src/tokens.css` (do not edit)          |
| Tailwind integration     | `packages/ui/src/globals.css` with `@theme`         |
| Figma sync               | `packages/ui/src/tokens.dtcg.json`                  |
| Add a token              | Edit tokens.ts → run `bun run tokens:generate`      |
| Test contrast            | Contrast tests in `tokens.test.ts`                  |
| Reference from component | Import from `@gaia/ui/tokens` or use CSS `var(--*)` |

---

## Cross-references

- Aesthetic + rationale: `docs/reference/design.md`
- Frontend patterns using tokens: `docs/reference/frontend.md`
- Enforcement rules: `.gaia/rules.ts`
- DTCG spec: https://www.designtokens.org/
- OKLCH: https://oklch.com/, https://oklch.net/

_Tokens are code. Changes require PR review. Semantic additions follow the existing pattern; primitive additions require rationale in the design.md decisions log._
