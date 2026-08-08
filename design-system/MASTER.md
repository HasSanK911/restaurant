# Salateen Restaurant — Design System Master

> Source of truth for visual decisions. When building a page, follow this file
> unless a page-specific override exists in `design-system/pages/<page>.md`.
>
> Structure follows the `ui-ux-pro-max` skill's MASTER format. The **values are
> the project's own**, not the skill's generated defaults — the generator
> proposed a navy/gold "luxury hospitality" palette, which was rejected in
> favour of the existing warm terracotta brand. Do not regenerate this file
> with `--persist` unless you intend to discard that decision.

**Category:** Restaurant / hospitality (Swabi, Pakistan — charcoal BBQ, karahi, pulao)
**Dials:** Variance 3/10 (centred, minimal) · Motion 5/10 (standard) · Density 3/10 (spacious)
**Stack:** Angular 21 standalone + signals, Tailwind v4 (`@theme`), SSR/prerender

---

## Global Rules

### Colour palette

All colours are defined in `src/styles.css` under `@theme`. Use the token, never a raw hex.

| Role | Token | Hex |
|------|-------|-----|
| Primary (brand) | `--color-clay-600` | `#bf4a2c` |
| Primary hover | `--color-clay-500` | `#d46341` |
| Secondary | `--color-basil-600` | `#2c6b4b` |
| Accent | `--color-turmeric-500` | `#d98c1f` |
| Page ground | `--color-paper` | `#fbf9f6` |
| Body text | `--color-ink-700` | `#4c453e` |
| Headings | `--color-ink-900` | `#241f1b` |
| Border | `--color-ink-200` | `#e7e1d8` |
| Scrim over photography | `--color-scrim` | `#1f1611` |

**Contrast floors — verified, not assumed:**

- `ink-700` on `paper` ≈ 8.9:1 ✅ body text
- `ink-500` on `paper` ≈ 4.6:1 ✅ the **lightest** permitted text tone
- `ink-400` on `paper` ≈ **2.5:1 ❌** — decorative only, and must carry
  `aria-hidden="true"`. Never use it for text a user needs to read.

Text over photography uses the `on-photo` utility, which re-points the whole
ink ramp to white-alpha rather than requiring per-element overrides.

### Typography

- **Display:** Fraunces (variable, `SOFT 20 / WONK 1`) — headings only
- **Body:** Outfit

**Type scale.** One ramp, defined as `--text-*` tokens. Before this existed the
codebase carried 21 distinct ad-hoc sizes (`text-[0.62rem]` and friends), 35 of
them below the 12px legibility floor, the smallest at 8.8px — plus 33 uses of
`text-caption` / `text-micro` that matched no rule at all and silently inherited
their parent's size. Use these and nothing else:

| Token | Size | Use for |
|-------|------|---------|
| `text-micro` | 11px | **UPPERCASE, tracked labels only** — eyebrows, tab labels, table heads |
| `text-caption` | 12px | Smallest sentence-case text — metadata, hints, badges |
| `text-label` | 13px | Dense labels, footer links |
| `text-body-sm` | 14px | Secondary copy, card blurbs |
| `text-base` | 16px | Body. Also the **minimum for any `<input>`** — iOS zooms below this |
| `text-body-lg` | 17px | Lead paragraphs |
| `text-display-sm/-/-lg` | fluid `clamp()` | Section and hero headings |

`micro` is the only step under 12px; its legibility comes from caps height and
0.14em tracking. Never set it on sentence-case copy. Explicit `tracking-*`
utilities still override the token default.

**Line length:** `measure` (68ch) for body copy, `measure-narrow` (54ch) for
pull-quotes. **Figures:** `nums` (tabular + lining) on every price, total,
count and timer; `.table-lux` cells get it automatically.

### Spacing

Tailwind's 4px scale only — no arbitrary `p-[13px]`. Section rhythm is the
`.section` component (`py-20 md:py-28`). Page gutters are `container-lux`.

### Elevation and stacking

Shadows: `--shadow-soft` (cards) → `--shadow-lux` (raised) → `--shadow-clay`
(brand CTAs). Never invent a shadow value.

Stacking uses named tokens — `z-[var(--z-sticky)]` etc., never bare `z-40`:

| Token | Value | Layer |
|-------|-------|-------|
| `--z-sticky` | 30 | In-page sticky bars |
| `--z-nav` | 40 | Mobile tab bar, floating actions |
| `--z-header` | 50 | Site header |
| `--z-drawer` | 70 | Mobile nav sheet |
| `--z-modal` | 80 | Dialogs, cart drawer |
| `--z-toast` | 90 | Toast stack |
| `--z-lightbox` | 95 | Gallery lightbox — deliberately above toasts |

---

## Component Specs

### Buttons

`.btn` + variant + size. Variants: `btn-primary` (one per screen), `btn-secondary`,
`btn-ghost`, `btn-danger`. Sizes: `btn-sm` (36px), `btn-md` (44px), `btn-lg` (52px),
`btn-icon`.

`.btn` already carries `cursor-pointer`, `touch-action: manipulation`, a
`scale(0.97)` press state, and disabled styling. On coarse pointers `btn-sm` and
`btn-icon` grow an invisible 44×44 hit area via `::after` — so they stay visually
compact without failing the touch-target minimum. Don't re-add these per button.

### Inputs

`.field` + `.field-label` + `.field-error`. Rules:

- Always a **visible** label — placeholder is not a label
- 16px text on mobile (`.field` handles this; it steps to 14px at `sm`)
- ≥44px height, enforced by `.field`
- Focus ring is restored explicitly in `.field:focus-visible`, because
  `focus:outline-none` on the element beats the zero-specificity `:where()`
  base rule. If you write a new control, do the same.
- Errors go **below** the field, with `role="alert"`

### Cards

`.card-lux` — white, `ink-200` border, `--shadow-soft`, 500ms `--ease-lux`
transitions on transform/border/shadow.

### Charts

`app-chart` wraps Chart.js. It handles, so you don't have to:

- an explicit empty state (a bare axis frame reads as "loading", not "no data")
- a visually-hidden `<table>` mirror of the series — a canvas exposes nothing
  to a screen reader beyond its `aria-label`
- legend shown automatically when >1 series or a doughnut
- `prefers-reduced-motion` checked **in JS** — canvas animation is invisible to
  the global CSS reduced-motion rule

Avoid red/green as the only distinction between series; the palette's clay and
basil sit adjacent and read alike to colourblind users. Pair with direct labels.

---

## Motion

Tokens: `--ease-lux` (entrances, 500–750ms) and `--ease-swift` (UI state, 150–300ms).

- Micro-interactions 150–300ms; nothing over 400ms except scroll reveals
- Animate `transform` and `opacity` only — never width/height/top/left
- Stagger grids 30–50ms per item
- Scroll reveals go through the `appReveal` directive (IntersectionObserver),
  never a scroll listener
- `prefers-reduced-motion` is handled globally in `styles.css` for CSS
  animation. **Canvas and JS-driven motion must check it themselves.**

---

## Anti-Patterns

- ❌ Arbitrary font sizes (`text-[0.65rem]`) — use the scale
- ❌ Any text under 12px that isn't uppercase `text-micro`
- ❌ `text-ink-400` on text a user reads
- ❌ Bare `z-40` / `z-[70]` — use the `--z-*` tokens
- ❌ `focus:outline-none` without an explicit replacement ring
- ❌ Inputs under 16px on mobile (causes iOS zoom)
- ❌ Emoji as icons — use `app-icon` (inline SVG, 24×24 on a 2px stroke grid)
- ❌ Raw hex in components
- ❌ Placeholder-as-label
- ❌ More than one primary CTA per screen

---

## Pre-Delivery Checklist

- [ ] No arbitrary `text-[…]` sizes introduced
- [ ] Body text ≥4.5:1; large text ≥3:1
- [ ] Focus visible on every interactive element, keyboard order matches visual
- [ ] Icon-only buttons have `aria-label`
- [ ] Touch targets ≥44×44 (or the coarse-pointer `::after` trick)
- [ ] Hover states have a tap equivalent
- [ ] Prices/totals carry `nums`
- [ ] Long copy is inside `measure`
- [ ] `prefers-reduced-motion` respected — including JS/canvas motion
- [ ] Renders at 375 / 768 / 1024 / 1440 with no horizontal scroll
- [ ] Async content reserves space (no layout shift)
- [ ] Empty, loading and error states all exist
