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

---

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
