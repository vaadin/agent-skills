# Aura Theme Property Reference

## Table of Contents
- [Color Scheme](#color-scheme)
- [Accent Color](#accent-color)
- [Color Palette](#color-palette)
- [Background Color](#background-color)
- [Contrast](#contrast)
- [Surface Level](#surface-level)
- [Surface Opacity](#surface-opacity)
- [Overlay Opacity](#overlay-opacity)
- [Border Radius](#border-radius)
- [Density / Base Size](#density--base-size)
- [Font Size](#font-size)
- [Font Family](#font-family)
- [App Layout Inset](#app-layout-inset)
- [Property Index](#property-index)

**Component-specific styling:** See [components.md](components.md)

<!-- BEGIN GENERATED source -->
Property defaults below are generated from `@vaadin/aura@25.3.0-rc1`;
read-only classification from `vaadin/docs` `v25.3` (`452ccc5`).
Regenerate with `node tools/aura-reference/generate.mjs`.
<!-- END GENERATED source -->

---

## Color Scheme

Set via the native `color-scheme` CSS property on `html`.

| Value | Meaning |
|---|---|
| `light` | Light mode only |
| `dark` | Dark mode only |
| `light dark` | Follow OS preference (Auto) |

For mixed mode (dark nav, light content):
```css
html {
  color-scheme: dark;
  --aura-content-color-scheme: light;
}
```

Additional properties:
- `--aura-content-color-scheme` — Color scheme for App Layout content area. Values: `light`, `dark`, `light dark`.
- `--aura-notification-color-scheme` — Color scheme for notifications. Values: `light`, `dark`, `light dark`.

Only set these when they differ from the global `color-scheme`.

---

## Accent Color

Two properties — one for light scheme, one for dark scheme.

<!-- BEGIN GENERATED accent-colors -->
| Property | Aura default | sRGB (as rendered) |
|---|---|---|
| `--aura-accent-color-light` | `var(--aura-blue)` | `#3266E4` |
| `--aura-accent-color-dark` | `var(--aura-blue)` | `#3266E4` |
<!-- END GENERATED accent-colors -->

### Light Accent Colors (for light backgrounds — need sufficient contrast)

| Name | Hex |
|---|---|
| Neutral | `#222222` |
| Red | `#e7000b` |
| Orange | `#ca3500` |
| Amber | `#e17100` |
| Yellow | `#efb100` |
| Lime | `#497d00` |
| Green | `#008236` |
| Emerald | `#009966` |
| Teal | `#009689` |
| Cyan | `#0092b8` |
| Sky | `#0084d1` |
| Blue | `#155dfc` |
| Indigo | `#4f39f6` |
| Violet | `#7f22fe` |
| Purple | `#9810fa` |
| Fuchsia | `#a800b7` |
| Pink | `#c6005c` |
| Rose | `#ec003f` |

### Dark Accent Colors (for dark backgrounds — lighter/more vibrant)

| Name | Hex |
|---|---|
| Neutral | `#eeeeee` |
| Red | `#F87171` |
| Orange | `#FB923C` |
| Amber | `#FBBF24` |
| Yellow | `#FACC15` |
| Lime | `#A3E635` |
| Green | `#4ADE80` |
| Emerald | `#34D399` |
| Teal | `#2DD4BF` |
| Cyan | `#22D3EE` |
| Sky | `#38BDF8` |
| Blue | `#60A5FA` |
| Indigo | `#818CF8` |
| Violet | `#A78BFA` |
| Purple | `#C084FC` |
| Fuchsia | `#E879F9` |
| Pink | `#F472B6` |
| Rose | `#FB7185` |

The tables above are this skill's curated presets, not Aura defaults. Light and dark accent colors are **always paired by hue** (e.g., Emerald light `#009966` with Emerald dark `#34D399`). The dark variant is a lighter/more vibrant version of the same hue to provide contrast on dark backgrounds.

Custom hex values are allowed when the user explicitly requests a specific brand color.

---

## Color Palette

Aura provides a customizable color palette consisting of neutral (grayscale) and saturated colors. These colors are used throughout the UI for semantic purposes and can be overridden to match brand colors.

### Neutral Color (Grayscale)

The neutral color forms the basis of text and border colors. Aura derives it from the background color, so it has no fixed hex default.

<!-- BEGIN GENERATED neutral-colors -->
| Property | Aura default | Write? | Notes |
|---|---|---|---|
| `--aura-neutral` | computed from `--aura-neutral-light`, `--aura-neutral-dark` | read-only | Automatically assigned the value of the -light or -dark suffixed property, depending on the active color scheme. |
| `--aura-neutral-light` | computed from `--aura-background-color-light`, `--aura-contrast-level` | customizable | A dark gray by default. |
| `--aura-neutral-dark` | computed from `--aura-background-color-dark`, `--aura-contrast-level` | customizable | White by default. |
<!-- END GENERATED neutral-colors -->

### Saturated Colors

These palette colors are used for semantic purposes (success, error, warning, info) and visual accents throughout the UI.

<!-- BEGIN GENERATED palette-colors -->
| Property | Aura default | sRGB (as rendered) |
|---|---|---|
| `--aura-red` | `oklch(0.59 0.2 25)` | `#DB373A` |
| `--aura-orange` | `oklch(0.61 0.35 87)` | `#D95A00` \* |
| `--aura-yellow` | `oklch(0.89 0.3 98)` | `#FFD400` \* |
| `--aura-green` | `oklch(0.6 0.2 155)` | `#00A045` \* |
| `--aura-blue` | `oklch(0.55 0.2 264)` | `#3266E4` |
| `--aura-purple` | `oklch(0.58 0.22 290)` | `#7E55F0` |

\* Outside the sRGB gamut. The hex is what browsers paint on an sRGB display; on a wide-gamut display these render more saturated.
<!-- END GENERATED palette-colors -->

Compare against the `oklch()` values when deciding whether an override is needed — that is what actually ships. The hex column is a reader aid only.

### Text Colors

Each saturated palette color has a corresponding text color property with enhanced contrast for use on backgrounds.

**Properties:**
- `--aura-red-text`
- `--aura-orange-text`
- `--aura-yellow-text`
- `--aura-green-text`
- `--aura-blue-text`
- `--aura-purple-text`

These text colors are computed to have sufficient contrast against the background and are read-only (derived from the saturated colors).

**When to customize:**
- Adjust saturated colors to match the overall style (muted, bright, brand-specific). Keep color hues consistent (red stays red-ish, green stays green-ish) but adjust tone and saturation.
- Customize neutral colors when adjusting the overall grayscale tone.
- Text colors are automatically derived — do not override them directly.

---

## Background Color

<!-- BEGIN GENERATED background-colors -->
| Property | Aura default | sRGB (as rendered) |
|---|---|---|
| `--aura-background-color-light` | `oklch(0.95 0.005 248)` | `#ECEFF2` |
| `--aura-background-color-dark` | `oklch(0.2 0.01 260)` | `#13161B` |
<!-- END GENERATED background-colors -->

The named options below are this skill's curated presets, not Aura defaults.

### Light Background Colors

| Name | Hex |
|---|---|
| White | `#ffffff` |
| Slate | `#f1f5f9` |
| Gray | `#e5e7eb` |
| Zinc | `#f4f4f5` |
| Neutral | `#f5f5f5` |
| Stone | `#f5f5f4` |
| Taupe | `#f3f1f1` |
| Mauve | `#f3f1f3` |
| Mist | `#f1f3f3` |
| Olive | `#f4f4f0` |
| Accent | `oklch(from var(--aura-accent-color-light) 0.9 calc(c * 0.3) h)` |

### Dark Background Colors

| Name | Hex |
|---|---|
| Black | `#000000` |
| Slate | `#131822` |
| Gray | `#15181f` |
| Zinc | `#18181b` |
| Neutral | `#171717` |
| Stone | `#1c1917` |
| Taupe | `#1d1816` |
| Mauve | `#1d161e` |
| Mist | `#161b1d` |
| Olive | `#1d1d16` |
| Accent | `oklch(from var(--aura-accent-color-dark) 0.18 calc(c * 0.3) h)` |

Light and dark backgrounds are **always paired by name** (e.g., Zinc light with Zinc dark).

**Accent Background:**
The "Accent" background option creates a colorful background tinted with the accent color using oklch color functions. This produces a vibrant, saturated look where the entire UI is infused with the accent hue.

- Light: `oklch(from var(--aura-accent-color-light) 0.9 calc(c * 0.3) h)` — lightness 0.9, chroma × 0.3
- Dark: `oklch(from var(--aura-accent-color-dark) 0.18 calc(c * 0.3) h)` — lightness 0.18, chroma × 0.3

Use this when the user requests a **colorful, vibrant, or saturated** visual theme.

---

## Contrast

Property: `--aura-contrast-level`

<!-- BEGIN GENERATED default:--aura-contrast-level -->
Aura default: `1`
<!-- END GENERATED default:--aura-contrast-level -->

| Label | Value |
|---|---|
| Low | `0.25` |
| Mid | `1` |
| High | `2` |

Affects computed text and border color contrast. Use these exact values.

---

## Surface Level

Property: `--aura-surface-level`

<!-- BEGIN GENERATED default:--aura-surface-level -->
Aura default: `1`
<!-- END GENERATED default:--aura-surface-level -->

| Label | Value |
|---|---|
| Low | `-0.5` |
| Mid | `1` |
| High | `2` |

Controls surface "elevation" of built-in components. Surface colors create visual hierarchy — lighter colors imply more elevation (closer to the user). In light mode, levels 3–4 result in white. In dark mode, level 8+ may cause contrast issues.

Use these exact values.

---

## Surface Opacity

Property: `--aura-surface-opacity`

<!-- BEGIN GENERATED default:--aura-surface-opacity -->
Aura default: `0.5`
<!-- END GENERATED default:--aura-surface-opacity -->

| Value | Description |
|---|---|
| `0.5` | Semi-transparent surfaces that can layer |
| `1` | Opaque surfaces |

Transparency allows nesting the same surface color to create more sense of elevation. Only set when choosing opaque surfaces.

---

## Overlay Opacity

Property: `--aura-overlay-surface-opacity`

<!-- BEGIN GENERATED default:--aura-overlay-surface-opacity -->
Aura default: `0.85`
<!-- END GENERATED default:--aura-overlay-surface-opacity -->

| Label | Value |
|---|---|
| Translucent | `0.85` |
| Opaque | `1` |

Only set when choosing Opaque.

---

## Border Radius

Property: `--aura-base-radius`

<!-- BEGIN GENERATED default:--aura-base-radius -->
Aura default: `3`
<!-- END GENERATED default:--aura-base-radius -->

| Shape | Value |
|---|---|
| Minimal | `-1` |
| Subtle | `0` |
| Standard | `3` |
| Rounded | `4` |
| Very rounded (large surfaces only) | `7` |

Unitless number. Use these exact values.

**`--aura-base-radius` does not set a radius directly** — it feeds three derived steps:

<!-- BEGIN GENERATED radius-steps -->
```css
--vaadin-radius-s: min(0.25lh, round(var(--aura-base-radius) * 1px + 2px, 1px));
--vaadin-radius-m: round(var(--aura-base-radius) * 2px + 3px, 1px);
--vaadin-radius-l: round(var(--aura-base-radius) * 1.5px + 10px, 1px);
```
<!-- END GENERATED radius-steps -->

Resulting values at Aura's default line height of 20px:

| `--aura-base-radius` | `radius-s` | `radius-m` | `radius-l` |
|---|---|---|---|
| `-1` | 1px | 1px | 9px |
| `0` | 2px | 3px | 10px |
| `3` | 5px | 9px | 15px |
| `4` | 5px | 11px | 16px |
| `7` | 5px | 17px | 21px |

Two consequences worth knowing:

- **No value of `--aura-base-radius` produces square corners.** Even `-1` leaves 9px on large surfaces. To remove rounding entirely, override the derived properties directly:
  ```css
  html {
    --vaadin-radius-s: 0;
    --vaadin-radius-m: 0;
    --vaadin-radius-l: 0;
  }
  ```
  Some components also carry their own radius tokens (e.g. `--vaadin-tabs-border-radius`, `--vaadin-side-nav-item-border-radius`) that need setting alongside — see [night-operator.css](night-operator.css).

- **`radius-s` is clamped at `0.25lh`**, so it stops growing past base `3` (5px at the default line height). Raising the base radius affects cards, dialogs, and other large surfaces, but *not* buttons and input fields — `7` is not "pill-shaped" for small components. Use it when the user asks for pronounced rounding on large surfaces, not to make controls fully round.

---

## Density / Base Size

Property: `--aura-base-size`

<!-- BEGIN GENERATED default:--aura-base-size -->
Aura default: `16`
<!-- END GENERATED default:--aura-base-size -->

| Label | Value |
|---|---|
| S (compact) | `12` |
| M | `16` |
| L (spacious) | `20` |

Unitless number. Controls gap and padding. Use these exact values.

---

## Font Size

Property: `--aura-base-font-size`

<!-- BEGIN GENERATED default:--aura-base-font-size -->
Aura default: `14`
<!-- END GENERATED default:--aura-base-font-size -->

| Label | Value |
|---|---|
| XS | `13` |
| S | `14` |
| M | `15` |
| L | `16` |

Unitless number representing base font size in px. Use these exact values.

---

## Font Family

Property: `--aura-font-family`

<!-- BEGIN GENERATED default:--aura-font-family -->
Aura default: `var(--aura-font-family-instrument-sans)`
<!-- END GENERATED default:--aura-font-family -->

Format: `'Font Name', var(--aura-font-family-system)`

Always include `var(--aura-font-family-system)` as fallback. When using a font from the list below, include the corresponding `@import` rule at the top of the CSS file.

**Curated Fonts:**

| Font Name | Import URL |
|---|---|
| Inter | `https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap` |
| Roboto | `https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap` |
| Public Sans | `https://fonts.googleapis.com/css2?family=Public+Sans:wght@100..900&display=swap` |
| Geist | `https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap` |
| Manrope | `https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap` |
| Atkinson Hyperlegible Next | `https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&display=swap` |
| Geist Mono | `https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap` |
| JetBrains Mono | `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap` |
| Atkinson Hyperlegible Mono | `https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;500;600;700&display=swap` |

**Prefer fonts from this curated list.**

Example:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');

html {
  --aura-font-family: 'Inter', var(--aura-font-family-system);
}
```

When no font is specified, omit the property entirely.

---

## App Layout Inset

Property: `--aura-app-layout-inset`

<!-- BEGIN GENERATED default:--aura-app-layout-inset -->
Aura default: `1.5vmin`
<!-- END GENERATED default:--aura-app-layout-inset -->

| Label | Value |
|---|---|
| Off | `0px` |
| On | `1.5vmin` |

**Must include a unit**, even for zero (`0px` not `0`).

---

## Property Index

Every `--aura-*` property Aura declares, and whether it is meant to be written.

### Customizable

Safe to set. Several have computed defaults — that is how Aura derives light/dark
and contrast-aware values — but setting them is the documented way to customize the theme.

<!-- BEGIN GENERATED customizable-properties -->
| Property | Default |
|---|---|
| `--aura-accent-color-dark` | `var(--aura-blue)` |
| `--aura-accent-color-light` | `var(--aura-blue)` |
| `--aura-accent-contrast-color-dark` | computed from `--aura-accent-color-dark` |
| `--aura-accent-contrast-color-light` | computed from `--aura-accent-color-light` |
| `--aura-accent-text-color-dark` | computed from `--aura-accent-color-dark`, `--aura-contrast-level` |
| `--aura-accent-text-color-light` | computed from `--aura-accent-color-light`, `--aura-contrast-level` |
| `--aura-app-layout-border-width` | `1px` |
| `--aura-app-layout-inset` | `1.5vmin` |
| `--aura-app-layout-radius` | `var(--vaadin-radius-l)` |
| `--aura-background-color-dark` | `oklch(0.2 0.01 260)` |
| `--aura-background-color-light` | `oklch(0.95 0.005 248)` |
| `--aura-base-font-size` | `14` |
| `--aura-base-line-height` | `1.4` |
| `--aura-base-radius` | `3` |
| `--aura-base-size` | `16` |
| `--aura-blue` | `oklch(0.55 0.2 264)` |
| `--aura-content-color-scheme` | `inherit` |
| `--aura-contrast-level` | `1` |
| `--aura-font-family` | `var(--aura-font-family-instrument-sans)` |
| `--aura-font-smoothing` | not set (opt-in) |
| `--aura-font-weight-medium` | `500` |
| `--aura-font-weight-regular` | `400` |
| `--aura-font-weight-semibold` | `600` |
| `--aura-green` | `oklch(0.6 0.2 155)` |
| `--aura-neutral-dark` | computed from `--aura-background-color-dark`, `--aura-contrast-level` |
| `--aura-neutral-light` | computed from `--aura-background-color-light`, `--aura-contrast-level` |
| `--aura-notification-color-scheme` | `inherit` |
| `--aura-orange` | `oklch(0.61 0.35 87)` |
| `--aura-overlay-backdrop-filter` | `blur(20px) brightness(1.1) saturate(1.2)` |
| `--aura-overlay-inner-outline-color` | computed from `--aura-contrast-level` |
| `--aura-overlay-outline-color` | computed from `--aura-background-color-light`, `--aura-contrast-level`, `--aura-background-color-dark` |
| `--aura-overlay-shadow` | `var(--aura-shadow-m)` |
| `--aura-overlay-surface-opacity` | `0.85` |
| `--aura-purple` | `oklch(0.58 0.22 290)` |
| `--aura-red` | `oklch(0.59 0.2 25)` |
| `--aura-shadow-color` | computed from `--aura-background-color-light`, `--aura-background-color-dark` |
| `--aura-shadow-m` | `0 8px 16px -3px var(--aura-shadow-color)` |
| `--aura-shadow-s` | `0 2px 5px -1px var(--aura-shadow-color)` |
| `--aura-shadow-xs` | `0 1px 4px -2px var(--aura-shadow-color)` |
| `--aura-surface-level` | `1` |
| `--aura-surface-opacity` | `0.5` |
| `--aura-yellow` | `oklch(0.89 0.3 98)` |
<!-- END GENERATED customizable-properties -->

### Read-only — never set these

Aura computes these for you, and overriding one breaks the color-scheme or
contrast behavior it exists to provide. To change what they resolve to, set the
properties in the right-hand column instead.

<!-- BEGIN GENERATED read-only-properties -->
| Property | Set these instead |
|---|---|
| `--aura-accent-border-color` | `--aura-surface-level`, `--aura-contrast-level`, `--aura-accent-color-light`, `--aura-accent-color-dark`, `--aura-background-color-light`, `--aura-background-color-dark` |
| `--aura-accent-color` | `--aura-accent-color-light`, `--aura-accent-color-dark` |
| `--aura-accent-color-dark-initial` | `--aura-accent-color-dark` |
| `--aura-accent-color-light-initial` | `--aura-accent-color-light` |
| `--aura-accent-contrast-color` | `--aura-accent-contrast-color-light`, `--aura-accent-contrast-color-dark` |
| `--aura-accent-surface` | `--aura-accent-color-light`, `--aura-surface-level`, `--aura-surface-opacity`, `--aura-accent-color-dark`, `--aura-background-color-light`, `--aura-background-color-dark` |
| `--aura-accent-text-color` | `--aura-accent-text-color-light`, `--aura-accent-text-color-dark` |
| `--aura-app-background` | `--aura-background-color-light`, `--aura-background-color-dark` |
| `--aura-background-color` | `--aura-background-color-light`, `--aura-background-color-dark` |
| `--aura-blue-text` | `--aura-blue`, `--aura-contrast-level` |
| `--aura-font-family-instrument-sans` | — |
| `--aura-font-family-system` | — |
| `--aura-font-size-l` | `--aura-base-font-size` |
| `--aura-font-size-m` | `--aura-base-font-size` |
| `--aura-font-size-s` | `--aura-base-font-size` |
| `--aura-font-size-xl` | `--aura-base-font-size` |
| `--aura-font-size-xs` | `--aura-base-font-size` |
| `--aura-green-text` | `--aura-green`, `--aura-contrast-level` |
| `--aura-item-overlay-padding-block` | `--aura-base-size` |
| `--aura-item-overlay-padding-inline` | `--aura-base-size` |
| `--aura-line-height-l` | `--aura-base-line-height`, `--aura-base-font-size` |
| `--aura-line-height-m` | `--aura-base-line-height`, `--aura-base-font-size` |
| `--aura-line-height-s` | `--aura-base-line-height`, `--aura-base-font-size` |
| `--aura-line-height-xl` | `--aura-base-line-height`, `--aura-base-font-size` |
| `--aura-line-height-xs` | `--aura-base-line-height`, `--aura-base-font-size` |
| `--aura-neutral` | `--aura-neutral-light`, `--aura-neutral-dark` |
| `--aura-orange-text` | `--aura-orange`, `--aura-contrast-level` |
| `--aura-overlay-outline-shadow` | `--aura-overlay-inner-outline-color`, `--aura-overlay-outline-color` |
| `--aura-purple-text` | `--aura-purple`, `--aura-contrast-level` |
| `--aura-red-text` | `--aura-red`, `--aura-contrast-level` |
| `--aura-surface-color` | `--aura-surface-opacity`, `--aura-background-color-light`, `--aura-surface-level`, `--aura-background-color-dark` |
| `--aura-surface-color-solid` | `--aura-background-color-light`, `--aura-surface-level`, `--aura-background-color-dark` |
| `--aura-yellow-text` | `--aura-yellow`, `--aura-contrast-level` |
<!-- END GENERATED read-only-properties -->
