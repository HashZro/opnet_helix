# HELIX Frontend Design Directives

## Core Philosophy

Industrial minimalism. Every element earns its place. Strong structural scaffolding through borders and containers. No decoration for decoration's sake — geometry IS the decoration.

---

## Color System

**Strict black and white only. Zero exceptions.**

```css
--color-bg:       #ffffff;   /* page background */
--color-fg:       #000000;   /* all text, borders, icons */
--color-surface:  #ffffff;   /* card/container fill */
--color-border:   #000000;   /* all borders */
--color-muted:    #888888;   /* secondary text, disabled states */
```

No grays except `--color-muted` for subdued labels. No off-whites. No shadows. No gradients. No transparency layers. Black on white, always.

---

## Typography

### Fonts

```css
/* Body / UI / Labels / Code */
font-family: 'Sometype Mono', monospace;

/* Headings / Hero titles */
font-family: 'Mulish', sans-serif;
```

Import both from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;700;800&family=Sometype+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

### Type Scale

| Role              | Font         | Size    | Weight | Transform   |
|-------------------|--------------|---------|--------|-------------|
| Hero title        | Mulish       | 2.4rem  | 700    | —           |
| Section heading   | Mulish       | 1.5rem  | 700    | —           |
| Nav brand (HELIX) | Mulish       | 1.1rem  | 800    | uppercase   |
| Body copy         | Sometype Mono| 0.8rem  | 400    | —           |
| UI labels/buttons | Sometype Mono| 0.75rem | 500    | —           |
| Table headers     | Sometype Mono| 0.65rem | 700    | uppercase   |
| Table cells       | Sometype Mono| 0.7rem  | 400    | —           |
| Caption / footer  | Sometype Mono| 0.65rem | 400    | —           |

### Mixed-weight headings

Section headings use a bold keyword inside a lighter phrase:
```
"About HELIX"     → "About " (Mulish 400) + "HELIX" (Mulish 700)
"Helix Genomes"   → "Helix " (Mulish 400) + "Genomes" (Mulish 700)
"Volatility Farming vs Traditional DeFi" → mix bold on key nouns
```

### Line height & measure

- Body: `line-height: 1.6`, max width `~72ch` per paragraph
- Headings: `line-height: 1.1`
- Table cells: `line-height: 1.4`

---

## Layout

### Grid

Single centered column with a fixed max-width container:

```css
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
}
```

The page has a visible left-edge vertical rule (a 1px `border-left` on the body or a left-margin column) that runs the full height of the page, reinforcing the industrial scaffolding feel.

### Spacing rhythm

Base unit: `8px`. All spacing is multiples of this unit.

| Token    | Value  |
|----------|--------|
| xs       | 8px    |
| sm       | 16px   |
| md       | 32px   |
| lg       | 64px   |
| xl       | 96px   |

Section vertical padding: `lg` (64px) top and bottom.

---

## Navigation

```
[HELIX]                          /Docs   /Github   /HELIX   [Launch App]
```

- Fixed top, full-width, white background, `border-bottom: 1px solid #000`
- Brand "HELIX": Mulish 800, uppercase, left-aligned
- Nav links: Sometype Mono, small, no decoration, color `#000`, slash prefix (e.g. `/Docs`)
- "Launch App" button: outlined style — `border: 1px solid #000`, no fill, Sometype Mono, small padding `6px 14px`
- No hover backgrounds. On hover: underline only.
- Height: `~48px`

---

## Border & Container System

This is the defining visual language of the design. All major UI elements are enclosed in **hard 1px black borders**. No border-radius. No shadows.

### Corner bracket motif

Many containers use an **L-shaped corner accent** instead of a full rectangle — a top-left or bottom-right bracket formed by two short perpendicular lines. This appears on:
- Hero section (bottom-left bracket)
- Section containers (top-right bracket)
- Card elements (bottom-left bracket)
- Feature preview box (top-left bracket)

Implementation:
```css
/* Bottom-left bracket */
.bracket-bl::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: -1px;
  width: 16px;
  height: 16px;
  border-left: 1px solid #000;
  border-bottom: 1px solid #000;
}

/* Top-right bracket */
.bracket-tr::after {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 16px;
  height: 16px;
  border-right: 1px solid #000;
  border-top: 1px solid #000;
}
```

### Buttons

```css
.btn {
  border: 1px solid #000;
  background: transparent;
  color: #000;
  font-family: 'Sometype Mono', monospace;
  font-size: 0.75rem;
  padding: 6px 16px;
  cursor: pointer;
  border-radius: 0;
}

.btn:hover {
  background: #000;
  color: #fff;
}
```

No rounded corners anywhere.

### Section icon badges

Section headings are prefixed with a small geometric glyph:
- "About HELIX" → `≡` or grid-dot icon (3 horizontal lines with dots)
- "Helix Genomes" → `···` dot cluster icon
- "Volatility Farming" → `|||` triple vertical bar icon

These are simple Unicode characters or minimal SVG icons, rendered in Sometype Mono at ~1rem.

---

## Dividers

Between major sections: a **dense tick-mark rule** spanning full width. This is a row of many thin vertical lines (like a ruler) rendered as:

```css
.tick-divider {
  width: 100%;
  height: 16px;
  background-image: repeating-linear-gradient(
    to right,
    #000 0px,
    #000 1px,
    transparent 1px,
    transparent 6px
  );
  margin: 48px 0;
}
```

The ticks decrease in density toward the right half, creating a trailing-off effect.

---

## Section Layouts

### Hero Section

```
[DNA graphic, left-aligned]    [Title block, right-aligned]
                               Volatility Farming on Bitcoin L1
                               [body copy, ~2 lines]
                               [Launch App] button
```

- Two-column layout, ~40/60 split
- DNA graphic: black SVG illustration on white, no color
- Corner bracket: bottom-left of the section
- Vertical alignment: center

### About Section

```
[≡ icon] About HELIX
─────────────────────────────────────────────
[body paragraph 1]
[body paragraph 2]
                              [top-right bracket corner]
[bottom-left bracket corner]
```

- Full-width text, max ~900px
- Corner brackets at opposing corners (top-right, bottom-left) of invisible bounding box

### Helix Genomes Section

```
[··· icon] Helix Genomes (Vaults)
[intro body]

[left: 2 paragraphs + 2 buttons]    [right: bordered preview box]
                                      ┌──────────────────────┐
                                      │  [faint UI mockup]   │
                                      │                      │
                                      └──────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Wrap         │  │ Unwrap       │  │ LP Provision     │
│──────────────│  │──────────────│  │──────────────────│
│ [label text] │  │ [label text] │  │ [label text]     │
└──────────────┘  └──────────────┘  └──────────────────┘
```

- Preview box: full 1px border, white interior, ~300px tall
- Three feature cards: 1px border each, equal width, 1/3 grid
- Card title: bordered pill label at top (border around just the title text)
- Card body: Sometype Mono, small, ~3 lines

### Comparison Table Section

```
[||| icon] Volatility Farming vs Traditional DeFi

┌────────────────────────────────────────────────────────────┐
│ FEATURE / CAPABILITY   │ EMISSIONS │ AMM LP │ PERP DEX │ HELIX VF │
│────────────────────────┼───────────┼────────┼──────────┼──────────│
│ Non-Inflationary Yield │     ×     │   ✓    │    ✓     │    ✓     │
│ ...                    │           │        │          │          │
└────────────────────────────────────────────────────────────┘
```

- Full 1px border around table
- 1px borders on all cells (solid grid)
- Header row: uppercase, Sometype Mono 700, smaller font
- `×` and `✓` marks: plain text, centered
- No zebra striping — pure white rows

---

## Footer

```
[HELIX logo large]              [Telegram icon box] [X icon box] [GitHub icon box]
Volatility farming on Bitcoin L1

────────────────────────────────────────────────────────
HELIX — Copyright © 2025. All rights reserved.
```

- Logo: Mulish 800, large (~2rem), left block
- Social icons: each in a 1px bordered square box (~48x48px), no fill, icon centered
- Icon labels below each box: "Telegram", "Twitter", "Github" in Sometype Mono tiny
- Copyright line: centered, Sometype Mono, very small

---

## Vertical Left-Rail

A continuous `1px solid #000` vertical line runs along the left side of the content area for approximately 60% of the page height. This anchors the content and reinforces the industrial / blueprint aesthetic.

```css
.left-rail {
  position: absolute;
  left: calc((100vw - 900px) / 2 - 24px); /* left of container */
  top: 80px;
  bottom: 40%;
  width: 1px;
  background: #000;
}
```

---

## Interaction States

- Buttons: fill invert on hover (`background: #000; color: #fff`)
- Links: underline on hover, no color change
- Table rows: no hover state
- No transitions or animations on hover — instant state changes only

---

## Responsive

- Below 768px: stack all two-column layouts vertically
- Nav: collapse links, keep brand + Launch App button
- Tables: horizontal scroll wrapper with `overflow-x: auto`
- Tick dividers: maintain full width (overflow hidden OK)
- Left rail: hidden on mobile

---

## Do Not

- No border-radius anywhere (0 always)
- No box-shadow
- No gradients
- No background colors other than white
- No icons from icon libraries (Lucide, FontAwesome) — use simple SVG or Unicode
- No animations or transitions (exception: instant hover invert on buttons)
- No color accents — if you feel like adding blue/green/gray, don't
- No sans-serif fonts other than Mulish for headings
- No serif fonts at all
