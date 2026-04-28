# Design — Visual Language & Design System

> Status: Reference
> Last verified: April 2026
> Scope: Every pixel humans see — apps, docs, marketing, generated content
> Source of truth: `packages/ui/src/tokens.ts` (see `tokens.md`)

---

## What this file is

Gaia's visual design system — the _why_ and _what_ of how things look. The _how_ lives in `tokens.md` (the machine-readable token source) and in component code.

This file answers: what does Gaia look like, why, and what are the rules that keep it coherent as it scales?

Read `code.md` first (principle #5: legibility outranks cleverness — applies to visual design too). Then this file for aesthetic direction. Then `tokens.md` for implementation.

---

## Aesthetic direction — "Ethereal Warmth"

Gaia ships with a default aesthetic called **Ethereal Warmth**. You can keep it, swap the tokens, or replace the aesthetic entirely — the architecture stays either way.

- **Mood:** Morning light through linen curtains. Calm authority.
- **Posture:** Not corporate. Not hustle-culture. Not spiritual-woo. Warm beige and gold where most SaaS templates reach for cool grays and electric blue.
- **Reference points:** Intercom (warm beige, approachable), Stripe (polish, precision), Linear (clean engineering).
- **Anti-patterns:** No purple gradients. No 3-column icon grids. No centered-everything. No decorative blobs. No glassmorphism. No AI slop.

The aesthetic is opinionated on purpose. Most SaaS templates ship with "cold neutral" defaults that signal "I was generated" before the user reads a word. Ethereal Warmth signals that a person made this.

**Swapping the aesthetic:** change color primitives in `tokens.ts`. Semantic tokens remap automatically. Component code doesn't change. The design system survives the re-theme.

---

## The 12 design-system principles

### Foundations

**1. Tokens are the single source of truth.**
`packages/ui/src/tokens.ts` is the only place values are defined. CSS custom properties, Tailwind v4 `@theme`, TypeScript constants, and DTCG JSON all generate from it. No hardcoded colors, sizes, or typography anywhere else in the codebase.

**2. Three-tier token hierarchy — primitive → semantic → component.**
Primitives (`amber.50`, `sand.100`) are raw values, never applied directly. Semantic tokens (`--bg-primary`, `--text-muted`) carry meaning and reference primitives. Component tokens are rare — added only when semantic tokens can't express the specificity.

**3. OKLCH for all color.**
Color is defined in OKLCH, not hex or HSL. Perceptual uniformity means predictable contrast. Wide-gamut P3 ready. sRGB fallbacks via `@supports` for older browsers.

### Scale and rhythm

**4. Modular type scale with fluid display sizes.**
Ratio-based (~1.333, Perfect Fourth). Body sizes fixed in `rem`. Display sizes use `clamp()` for fluid responsive without breakpoints. Minimum body 16px, never below.

**5. Geometric spacing scale from one base unit.**
Base 8px. Scale: `2, 4, 8, 16, 24, 32, 48, 64, 96, 128`. Every margin, padding, gap pulls from this. Ratios stay consistent at every size.

### Discipline

**6. Restraint over decoration — the AI Slop Test must pass.**
Every decorative element earns its place. No glassmorphism, gradient-text metrics, generic 3-column icon grids, centered-everything layouts, neon-on-black dark modes, decorative blobs. The AI Slop Test is the quality gate.

**7. Every interactive component handles all 8 states.**
Default, hover, focus, active, disabled, loading, error, success. Not all visual — but all accounted for. No blank screens while loading. No dead ends on empty.

**8. Motion is functional, never decorative.**
Only `transform` and `opacity` animated. `prefers-reduced-motion` always respected. Duration 100-500ms range. No bounce, no elastic, no scroll-jacking.

### Access and reach

**9. Accessibility is baseline — WCAG 2.1 AA on every surface.**
4.5:1 contrast minimum. Keyboard nav for everything. `:focus-visible` instead of `outline: none`. Semantic HTML. Color is never the sole signal.

**10. Mobile-first with container queries.**
`min-width` media queries only. `@container` for components that adapt to their container, not viewport. `env(safe-area-inset-*)` for notched devices.

### Structure

**11. Z-index is a semantic scale.**
`--z-dropdown: 100`, `--z-sticky: 200`, `--z-modal-backdrop: 300`, `--z-modal: 400`, `--z-toast: 500`, `--z-tooltip: 600`. Never arbitrary values like `9999`.

**12. Design decisions are versioned, not frozen.**
Dated decisions log at the bottom of this file. Each decision records date, choice, rationale. Choices deprecate (with reason), not delete. Agents see the current state AND the evolution.

---

## Typography

### Font families

| Role                        | Font                                                      | Why                                                                                                     |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Display / hero**          | Instrument Serif                                          | Serif in a tech product signals intellectual depth, not stiffness. Used sparingly for biggest headings. |
| **Body / UI**               | Instrument Sans                                           | Same family as Instrument Serif — cohesive. Clean, modern, highly readable.                             |
| **Data / tabular**          | Instrument Sans with `font-variant-numeric: tabular-nums` | Numbers align vertically in tables.                                                                     |
| **Code / prompt templates** | Geist Mono                                                | Clean monospace. Ligatures disabled (`font-variant-ligatures: none`) for AI prompt accuracy.            |

### Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
  rel="stylesheet"
/>
```

`font-display: swap` on every `@font-face`. FOUT over FOIT — swap ugly briefly, never show blank.

### Modular scale

Ratio ~1.333 (Perfect Fourth):

| Token  | Size                                 | Usage                              |
| ------ | ------------------------------------ | ---------------------------------- |
| `xs`   | 12px / 0.75rem                       | Captions, metadata                 |
| `sm`   | 14px / 0.875rem                      | Secondary text                     |
| `base` | 16px / 1rem                          | Body — **minimum, never go below** |
| `lg`   | 19px / 1.1875rem                     | Lead paragraphs                    |
| `xl`   | 24px / 1.5rem                        | Section headings                   |
| `2xl`  | 32px / 2rem                          | Page subheadings                   |
| `3xl`  | 36px / 2.25rem                       | Page headings (mobile)             |
| `4xl`  | `clamp(2.5rem, 2rem + 2vw, 3rem)`    | Page headings (fluid)              |
| `hero` | `clamp(2.75rem, 2rem + 3vw, 3.5rem)` | Hero display text                  |

### Rules

- **Line length**: `max-width: 65ch` on any reading prose (blog, course content, long docs)
- **Line height**: `1.6` for body, `1.2` for headings
- **Vertical rhythm**: spacing between text blocks is multiples of `line-height × font-size`
- **Weight**: `400` for body, `500-600` for UI labels, `700` for emphasis. Avoid `300` and below — weak on most displays
- **Italics**: Instrument Serif ships with italic variants; use for emphasis in display text only
- **Never** use pure `font-style: italic` on sans-serif — use weight instead

---

## Color

### Approach

Restrained. One accent (warm gold) + warm neutrals (cream, sand, linen). Color is rare and meaningful; most UI is cream-and-text.

**60-30-10 distribution:**

- 60% neutrals (cream + sand) — backgrounds, large surfaces
- 30% secondary (linen, surfaces) — cards, sections
- 10% accent (gold) — CTAs, active states, focal points

### Primitives (OKLCH)

Defined in `tokens.ts` as OKLCH with sRGB fallback. Abbreviated here:

| Token            | OKLCH                  | Hex (fallback) |
| ---------------- | ---------------------- | -------------- |
| `amber.50`       | `oklch(0.98 0.02 80)`  | `#FAF8F5`      |
| `amber.100`      | `oklch(0.95 0.03 75)`  | `#F2EDE6`      |
| `amber.200`      | `oklch(0.89 0.05 75)`  | `#E8E0D4`      |
| `amber.500`      | `oklch(0.72 0.08 70)`  | `#C4956A`      |
| `amber.600`      | `oklch(0.63 0.09 55)`  | `#B07D4F`      |
| `ink.900`        | `oklch(0.18 0.01 60)`  | `#1A1714`      |
| `ink.600`        | `oklch(0.48 0.02 60)`  | `#6B6258`      |
| `ink.400`        | `oklch(0.70 0.02 70)`  | `#A69D91`      |
| `sage.500`       | `oklch(0.65 0.09 140)` | `#6B8F5E`      |
| `terracotta.500` | `oklch(0.60 0.14 30)`  | `#C25B4A`      |
| `gold.500`       | `oklch(0.78 0.14 85)`  | `#D4A843`      |
| `slate.400`      | `oklch(0.65 0.03 240)` | `#7B8FA6`      |

### Semantic tokens (what code references)

Semantic tokens give meaning; they alias primitives. Swap the aesthetic by changing semantic mappings.

| Semantic           | References       | Usage                                          |
| ------------------ | ---------------- | ---------------------------------------------- |
| `--bg-primary`     | `amber.50`       | Main page background                           |
| `--bg-secondary`   | `amber.100`      | Cards, sections                                |
| `--bg-tertiary`    | `amber.200`      | Hover states, subtle borders                   |
| `--bg-surface`     | `white`          | Inputs, modals                                 |
| `--text-primary`   | `ink.900`        | Headings, strong text                          |
| `--text-secondary` | `ink.600`        | Body text                                      |
| `--text-muted`     | `ink.400`        | Captions, metadata (test contrast on every bg) |
| `--accent`         | `amber.500`      | CTAs, active states                            |
| `--accent-hover`   | `amber.600`      | Hover on accent                                |
| `--success`        | `sage.500`       | Completion, confirmed                          |
| `--error`          | `terracotta.500` | Errors, destruction                            |
| `--warning`        | `gold.500`       | Warnings                                       |
| `--info`           | `slate.400`      | Informational                                  |

### Rules

- **Never** pure `#000` or `#fff` for text or backgrounds outside inputs/modals — they're too harsh against warm neutrals
- **Never** rely on color alone to convey information — always pair with text, icons, or patterns
- **Contrast**: every `--text-*` must meet 4.5:1 against every background it appears on; test explicitly
- **`--text-muted`** is the most dangerous token — it barely passes AA on primary background and fails on white. Never use on white surfaces.
- **Dark mode**: deferred for v1. The warm cream palette IS the brand. Dark mode flattens personality. Reconsider for future tier (agent console may want a dark variant).

### P3 wide-gamut

OKLCH values pass through to P3 displays (Apple devices, OLED) giving richer color. sRGB fallbacks:

```css
.element {
  /* sRGB fallback for older browsers */
  color: #c4956a;
  /* OKLCH for modern browsers with P3 */
  color: oklch(0.72 0.08 70);
}
```

Most modern frameworks (Tailwind v4) handle this automatically.

---

## Spacing

Base unit: **8px**. Everything pulls from the scale.

| Token       | Value | Usage                                 |
| ----------- | ----- | ------------------------------------- |
| `space.2xs` | 2px   | Hairline borders, tight glyph spacing |
| `space.xs`  | 4px   | Tight gaps, icon-to-text              |
| `space.sm`  | 8px   | Default gap, input padding            |
| `space.md`  | 16px  | Card padding, standard gap            |
| `space.lg`  | 24px  | Section spacing                       |
| `space.xl`  | 32px  | Between sections                      |
| `space.2xl` | 48px  | Large section breaks                  |
| `space.3xl` | 64px  | Hero-to-content transitions           |
| `space.4xl` | 96px  | Top/bottom of page                    |

**Density:** comfortable, not cramped, not drowning. Generous breathing room.

**Rule:** if you need a value between scale steps, the scale is wrong — either add a step or pick the closest. Off-scale values become arbitrary.

---

## Layout

### Grid

12-column. Max width **1200px** outer. Text content caps at **800px**. Reading prose caps at **640px** (~65ch).

### Container max-widths

| Context                         | Max width             |
| ------------------------------- | --------------------- |
| Outer page                      | 1200px                |
| Text-heavy content              | 800px                 |
| Reading prose (blog, course)    | 640px                 |
| Forms                           | 480px                 |
| Modals (small / medium / large) | 400px / 600px / 800px |

### Border radius

| Token         | Value  | Usage                  |
| ------------- | ------ | ---------------------- |
| `radius.sm`   | 8px    | Buttons, inputs, tags  |
| `radius.md`   | 12px   | Cards, alerts          |
| `radius.lg`   | 16px   | Modals, hero sections  |
| `radius.full` | 9999px | Pills, badges, avatars |

**Rule:** one element = one radius. Don't mix radii within a single visual boundary.

---

## Motion

### Approach

Minimal-functional. Only transitions that aid comprehension (state change, layout shift). Never decorative motion.

### Easing

| Scenario             | Function                                     |
| -------------------- | -------------------------------------------- |
| Enter (appearing)    | `cubic-bezier(0.25, 1, 0.5, 1)` — quart-out  |
| Exit (disappearing)  | `ease-in`                                    |
| Move (repositioning) | `ease-in-out`                                |
| **Never**            | bounce, elastic, cubic-bezier with overshoot |

### Duration

| Type         | Range     | Example                       |
| ------------ | --------- | ----------------------------- |
| Micro        | 100-150ms | hover, button press, toggle   |
| State change | 200-300ms | panel open, modal fade        |
| Structural   | 300-500ms | layout shift, page transition |

**Rule:** exit duration = 75% of entrance. Faster out than in — feels responsive.

### Performance rules

- Animate only `transform` and `opacity` (GPU-accelerated, no layout thrash)
- Height/width animations use `grid-template-rows: 0fr → 1fr` pattern (or `scale`), never raw `height` transitions
- Transitions on `background-color` are fine; on `color` are fine; avoid on `width/height/top/left`

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Always respected. ~35% of older populations (our common ICP) have this enabled. Non-essential animation disabled for them.

### What not to animate

- Scroll (no scroll-jacking, no parallax)
- Entrance effects (no fade-in-on-scroll cascades)
- Decorative hover effects (no "magnetic" cursors, tilting cards)
- Loading skeletons beyond a simple pulse

Content is the effect. Calm products don't animate.

---

## Interaction states

Every interactive element must handle these **8 states**. Not all visually distinct — but all accounted for. Component types enforce this at the type level.

| #   | State        | When                                                | Visual pattern                                                                   |
| --- | ------------ | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **Default**  | Resting                                             | Base styling                                                                     |
| 2   | **Hover**    | Cursor over (desktop only, `@media (hover: hover)`) | Subtle bg/border shift                                                           |
| 3   | **Focus**    | Keyboard navigation (`:focus-visible`)              | Gold focus ring via `box-shadow` — **never** `outline: none` without replacement |
| 4   | **Active**   | Pressed / clicked                                   | Slight scale down + darker bg                                                    |
| 5   | **Disabled** | Not available                                       | 50% opacity + `cursor: not-allowed`                                              |
| 6   | **Loading**  | Processing                                          | Spinner inside button, or skeleton placeholder — **never** freeze the UI         |
| 7   | **Error**    | Invalid / failed                                    | Terracotta border + text with icon                                               |
| 8   | **Success**  | Completed                                           | Sage confirmation with checkmark                                                 |

**The type system enforces this:**

```ts
// packages/ui/src/button/types.ts
export type ButtonState =
  | 'default'
  | 'hover'
  | 'focus'
  | 'active'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'success'

export type ButtonProps = {
  state?: ButtonState // optional — defaults to 'default'
  // ...
}
```

Components that don't handle all 8 fail code review.

---

## Components

Core component patterns. Implementations live in `packages/ui/`.

### Buttons

Three variants:

| Variant       | Background              | Text             | Border              | Use when             |
| ------------- | ----------------------- | ---------------- | ------------------- | -------------------- |
| **Primary**   | `--accent` (gold)       | White            | None                | Main CTA on the page |
| **Secondary** | `--bg-secondary` (sand) | `--text-primary` | None                | Secondary actions    |
| **Ghost**     | transparent             | `--text-primary` | 1px `--bg-tertiary` | Tertiary / toolbar   |

**Every button:** min 44×44px touch target even if visually smaller (padding to meet). Focus ring. All 8 states.

### Cards

- `--bg-surface` (white) background
- 1px `--bg-tertiary` border
- `radius.md` (12px)
- Hover: border becomes `--accent`, subtle shadow
- **Never** nest cards inside cards — if you need to, the parent isn't a card

### Inputs

- `--bg-surface` background
- 1px `--bg-tertiary` border
- `radius.sm` (8px)
- Focus: `--accent` border + 2px `box-shadow` ring
- Error: `--error` border + helper text below
- Labels above input, helper text below

### Alerts

Tinted backgrounds matching semantic color:

| Type    | Background               | Border                 | Icon |
| ------- | ------------------------ | ---------------------- | ---- |
| Success | `sage.500` @ 10% opacity | `sage.500` @ 40%       | ✓    |
| Error   | `terracotta.500` @ 10%   | `terracotta.500` @ 40% | ×    |
| Warning | `gold.500` @ 10%         | `gold.500` @ 40%       | !    |
| Info    | `slate.400` @ 10%        | `slate.400` @ 40%      | i    |

### Modals

Use native `<dialog>` element with `inert` attribute on background content. Never roll custom overlay logic.

```html
<dialog class="modal" id="example">
  <form method="dialog">
    <!-- content -->
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>
```

Native `<dialog>` gives: focus trap, Escape-to-close, backdrop click handling, a11y — free. Custom overlays get these wrong.

### Tooltips & dropdowns

Popover API where supported, fallback to positioned absolute with JS.

### Empty states

Empty states are onboarding opportunities, not dead ends. Pattern:

1. Illustration or icon (optional, subtle)
2. One-line statement of what's missing ("No documents yet")
3. One-line explanation ("Upload your first to get started")
4. Primary CTA to the next action

Never: "Nothing here." Period.

### Error messages

Three-part framework:

1. **What happened** — "We couldn't save your changes"
2. **Why** — "The connection timed out after 30 seconds"
3. **How to fix** — "Check your internet and try again"

Never use humor for errors. Never use cryptic codes as the primary message (codes go in expandable details).

### Navigation

- Logo in Instrument Serif
- Nav links in Instrument Sans
- Gold CTA button on the right
- Sticky header with subtle border on scroll

---

## Z-index scale

Semantic layers. Never arbitrary values like `9999`.

| Token                | Value | Layer                                |
| -------------------- | ----- | ------------------------------------ |
| `--z-dropdown`       | 100   | Dropdowns, selects, autocomplete     |
| `--z-sticky`         | 200   | Sticky headers, floating toolbars    |
| `--z-modal-backdrop` | 300   | Modal dim overlay                    |
| `--z-modal`          | 400   | Modal content                        |
| `--z-toast`          | 500   | Toast notifications                  |
| `--z-tooltip`        | 600   | Tooltips (highest — must always win) |

If you need a value outside this scale, the scale is wrong. Add a named layer with rationale in the decisions log.

---

## Responsive

### Approach

**Mobile-first.** `min-width` media queries only. Never desktop-first `max-width`.

### Breakpoints

Let content dictate breakpoints. Default scale:

| Token | Value  | Target                              |
| ----- | ------ | ----------------------------------- |
| `sm`  | 640px  | Small tablet, large phone landscape |
| `md`  | 768px  | Tablet                              |
| `lg`  | 1024px | Laptop / desktop                    |

Three is usually enough. Add `xl` (1280px) only if design genuinely needs it.

### Container queries

Use `@container` for components that need to adapt to their container, not the viewport. A card in a sidebar vs. the same card full-width should look different — that's a container query, not a media query.

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: grid;
  grid-template-columns: 1fr;
}

@container (min-width: 400px) {
  .card {
    grid-template-columns: auto 1fr;
  }
}
```

### Input detection

```css
/* Only apply hover on devices that support it */
@media (hover: hover) {
  .button:hover {
    background: var(--accent-hover);
  }
}

/* Adjust touch targets for coarse pointers */
@media (pointer: coarse) {
  .button {
    min-height: 48px;
  }
}
```

### Safe areas

For notched and rounded-corner devices:

```css
.page {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### Testing

- Real iPhone (any modern model)
- Real Android (any modern model)
- Simulators miss touch behavior, font rendering, and scroll momentum

---

## Accessibility

**WCAG 2.1 AA is baseline, not target.**

### Contrast

All text must meet WCAG AA:

- **Normal text**: 4.5:1 against background
- **Large text (18pt+ or 14pt+ bold)**: 3:1

Test every `--text-*` token against every background it appears on. `--text-muted` is the most dangerous — audit frequently.

### Touch targets

Minimum **44×44px** interactive area, even if visual element is smaller. Use padding to meet. Pointer-coarse devices get 48px minimum.

### Focus

- Never `outline: none` without a replacement
- Use `:focus-visible` for keyboard-only focus ring
- Focus ring: 2px gold `box-shadow`, offset 2px from element
- All interactive elements focusable in DOM order

### Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* disable all non-essential animation */
}
```

### Color

Never color alone. Status signals pair color with icon or text. Error inputs have terracotta border AND error icon AND error message.

### Semantic HTML

- `<button>` for actions, `<a>` for navigation
- `<dialog>` for modals (not `<div role="dialog">`)
- Heading hierarchy: h1 → h2 → h3, never skip levels
- One `<h1>` per page
- `<main>`, `<nav>`, `<aside>`, `<footer>` landmarks

### Link text

Must be meaningful standalone. Screen readers jump between links — "click here" without context is useless.

- ❌ "Click here"
- ❌ "Read more"
- ✅ "View pricing plans"
- ✅ "Read the migration guide"

### Testing

- **Automated**: pa11y in CI, axe browser extension during dev
- **Manual**: VoiceOver (Mac) or NVDA (Windows), keyboard-only navigation
- Every component tested in both

### Alt text

Every `<img>` has `alt`. Decorative images use `alt=""`. SVG icons have `<title>` or `aria-label`.

---

## The AI Slop Test

Before shipping any page, ask: **"Would someone immediately recognize this was AI-generated?"** If yes, redesign.

### The classic AI slop patterns to avoid

1. **Glassmorphism** — frosted glass, blur-behind, translucent panels stacked like slides
2. **Gradient text on metrics** — "$2.5M ARR" in a purple-pink gradient
3. **Identical 3-column icon+heading+text card grids** — the "feature soup" pattern
4. **Everything centered with no visual hierarchy** — hero, features, testimonials, CTA all stacked centered
5. **Dark mode with glowing neon accents** — cyberpunk-adjacent color schemes
6. **Monospace font as lazy "technical" signal** — Inconsolata or Space Mono for body text
7. **Generic stock-photo hero** — the "diverse team pointing at laptop" photo
8. **"Built with AI" badge-flex** — banners announcing AI usage as if it's a feature
9. **Gradient backgrounds everywhere** — purple-to-pink, blue-to-cyan, orange-to-red blobs
10. **Perfect symmetry** — everything spaced identically with no emphasis hierarchy
11. **Decorative blobs, squiggles, particles** — the "designed in Figma community" look
12. **Emoji in button labels** — "🚀 Launch your idea"

### The restraint questions

When adding any visual element, ask:

- **What breaks if I remove this?** If nothing, remove it.
- **Does this serve comprehension or decoration?** If decoration, cut it.
- **Would this appear in the Intercom/Stripe/Linear aesthetic?** If no, reconsider.
- **Does this feel like a person with taste made it?** If it feels generic, it is.

### Positive patterns (the opposite of slop)

- Warm, specific colors (our gold, not #FFD700)
- Deliberate white space
- One accent color, used rarely
- Serif for weight, sans for body, mono for code — each with purpose
- Asymmetric layouts with visual hierarchy
- Real photography when used (not stock illustrations)
- Type-led design over illustration-led

---

## Writing voice (pointer to voice.md)

Visual warmth must pair with verbal honesty. Gold typography + corporate hedging reads inauthentic. Gold typography + direct, specific, opinionated writing reads human.

See `voice.md` for writing rules. The Indy Test and AI Slop Test are two halves of the same quality gate.

---

## Browser support

- Modern browsers (last 2 versions of Chrome, Safari, Firefox, Edge)
- OKLCH with sRGB fallback for older browsers
- Container queries require 2023+ browser versions — progressive enhancement where older browsers get a simpler layout
- `<dialog>` widely supported since 2022; no polyfill needed

Gaia doesn't support IE11 or Safari <15. Document-stated.

---

## File structure

Design-related code locations:

```
packages/ui/
├── src/
│   ├── tokens.ts             # Source of truth — all tokens defined here
│   ├── tokens.css            # Generated from tokens.ts (do not edit directly)
│   ├── index.css             # Global styles, resets, base typography
│   ├── components/
│   │   ├── button/
│   │   ├── card/
│   │   ├── input/
│   │   └── ...
│   └── fonts.css             # @font-face declarations
├── scripts/
│   └── generate-css.ts       # tokens.ts → tokens.css + Tailwind theme
└── package.json
```

See `tokens.md` for the token file structure in detail.

---

## Quick reference

| Need                | Answer                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Change brand color  | Edit `amber.*` primitives in `tokens.ts`                               |
| Add a new color     | Add primitive in `tokens.ts`, then a semantic token that references it |
| Change spacing      | Edit `space.*` in `tokens.ts`                                          |
| Add a motion preset | Add to `motion.*` in `tokens.ts`, update CSS custom props              |
| New component       | `packages/ui/src/components/<name>/` + enforce 8 states                |
| Check a11y          | Run `bun run pa11y` or axe extension                                   |
| Test contrast       | OKLCH picker at oklch.com or Chrome DevTools                           |

---

## Decisions log

Every meaningful design decision dated, rationalized, and preserved.

| Date       | Decision                                    | Rationale                                                                                                                                                                  |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-02 | Initial aesthetic: Ethereal Warmth          | Differentiates from cold-neutral SaaS defaults. Inspired by Intercom warmth + Stripe precision. Instrument Serif signals intellectual depth without stiffness.             |
| 2026-04-02 | No dark mode in v1                          | Warm cream palette IS brand identity. Dark mode would flatten personality. Revisit for future tier (agent console may need dark variant).                                  |
| 2026-04-02 | Instrument Serif for display                | Serif in a tech product signals depth. Differentiates from all-sans competitors (Linear, Vercel, etc.).                                                                    |
| 2026-04-02 | OKLCH over HSL                              | Perceptual uniformity → predictable contrast across hues. Wide-gamut P3 ready. sRGB fallback via `@supports`. Worth the browser compatibility overhead.                    |
| 2026-04-19 | Three-tier token architecture               | Primitive → semantic → component. Adopted to match W3C DTCG v1 standard + cross-tool compatibility. Component tokens only when semantic insufficient.                      |
| 2026-04-19 | Tailwind v4 `@theme` for CSS framework      | CSS-native tokens; no JS config. Agent-friendly (they know Tailwind). Alternative: UnoCSS; rejected for template-default because Tailwind's agent recognition is stronger. |
| 2026-04-19 | 8 interaction states enforced at type level | Adding states to required list makes "did we handle loading?" a compile-time question, not review-time.                                                                    |

**Adding to the log:**

- Every design-system change appended with date + rationale
- Deprecations record the old choice + what replaced it + why
- Major changes (aesthetic swap, color system change) require an ADR

---

## Cross-references

- Tokens source of truth: `docs/reference/tokens.md`, `packages/ui/src/tokens.ts`
- Principles foundation: `docs/reference/code.md`
- Writing voice pair: `docs/reference/voice.md`
- UX patterns: `docs/reference/ux.md`
- Frontend patterns: `docs/reference/frontend.md`
- Accessibility tools: pa11y (CI), axe (dev), VoiceOver/NVDA (manual)

_Design decisions are versioned. Changes that touch the aesthetic direction or primitive tokens require an ADR._
